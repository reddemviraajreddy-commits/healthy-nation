import { Router, type IRouter } from "express";
import { desc, eq, asc } from "drizzle-orm";
import { db, triageSessions, chatMessages } from "@workspace/db";
import { RunTriageBody, TriageChatBody } from "@workspace/api-zod";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

const RED_FLAGS = ["chest pain", "difficulty breathing", "shortness of breath", "severe bleeding", "unconscious", "seizure", "stroke", "numbness", "paralysis", "suicidal"];
const URGENT_FLAGS = ["high fever", "vomiting", "abdominal pain", "rash", "dehydration", "confusion", "head injury"];

const SPECIALTY_MAP: Record<string, string> = {
  "chest pain": "Cardiology",
  "shortness of breath": "Pulmonology",
  "headache": "Neurology",
  "abdominal pain": "Gastroenterology",
  "rash": "Dermatology",
  "fever": "General Medicine",
  "cough": "General Medicine",
  "back pain": "Orthopedics",
  "joint pain": "Orthopedics",
  "anxiety": "Psychiatry",
  "depression": "Psychiatry",
};

router.get("/triage/sessions", async (_req, res) => {
  const rows = await db.select({
    id: triageSessions.id,
    createdAt: triageSessions.createdAt,
    triageLevel: triageSessions.triageLevel,
    primarySymptom: triageSessions.primarySymptom,
    summary: triageSessions.summary,
  }).from(triageSessions).orderBy(desc(triageSessions.createdAt)).limit(20);
  res.json(rows);
});

router.post("/triage/assess", async (req, res) => {
  const body = RunTriageBody.parse(req.body);
  const symptomText = body.symptoms.join(" ").toLowerCase();
  const hasRedFlag = RED_FLAGS.some((f) => symptomText.includes(f));
  const hasUrgent = URGENT_FLAGS.some((f) => symptomText.includes(f));

  let triageLevel: "routine" | "urgent" | "emergency";
  let timeFrame: string;
  if (hasRedFlag || body.severity >= 9) {
    triageLevel = "emergency"; timeFrame = "Seek emergency care immediately";
  } else if (hasUrgent || body.severity >= 6 || body.durationDays >= 14) {
    triageLevel = "urgent"; timeFrame = "See a doctor within 24 hours";
  } else {
    triageLevel = "routine"; timeFrame = "Schedule a visit within the next few days";
  }

  const primary = body.symptoms[0] ?? "general";
  let recommendedSpecialty = "General Medicine";
  for (const [k, v] of Object.entries(SPECIALTY_MAP)) {
    if (symptomText.includes(k)) { recommendedSpecialty = v; break; }
  }

  const possibleConditions = buildConditions(symptomText);
  const recommendations = buildRecommendations(triageLevel, recommendedSpecialty);
  const riskScore = Math.min(100, body.severity * 8 + (hasRedFlag ? 40 : 0) + (hasUrgent ? 20 : 0) + Math.min(20, body.durationDays));

  const summary = triageLevel === "emergency"
    ? `Symptoms suggest a potentially serious condition. Immediate care is recommended.`
    : triageLevel === "urgent"
    ? `Your symptoms warrant medical attention soon. Consider booking with ${recommendedSpecialty}.`
    : `Symptoms appear manageable. Monitor and book a routine visit if they persist.`;

  const result = { triageLevel, summary, possibleConditions, recommendations, recommendedSpecialty, timeFrame, riskScore };

  await db.insert(triageSessions).values({
    triageLevel,
    primarySymptom: primary,
    summary,
    result,
  });

  res.json(result);
});

function buildConditions(text: string) {
  const list: { name: string; probability: number; dangerous: boolean; description: string }[] = [];
  const add = (name: string, probability: number, dangerous: boolean, description: string) => list.push({ name, probability, dangerous, description });
  if (text.includes("chest pain")) {
    add("Acute coronary syndrome", 35, true, "Reduced blood flow to the heart muscle requiring urgent assessment.");
    add("Costochondritis", 30, false, "Inflammation of cartilage connecting ribs to breastbone.");
    add("Acid reflux", 25, false, "Stomach acid irritating the esophagus, often mistaken for heart pain.");
  } else if (text.includes("headache")) {
    add("Tension headache", 55, false, "Most common headache type, often related to stress or posture.");
    add("Migraine", 30, false, "Recurrent throbbing headaches, sometimes with sensory symptoms.");
    add("Sinusitis", 15, false, "Inflamed sinuses causing pressure and pain.");
  } else if (text.includes("fever")) {
    add("Viral infection", 60, false, "Common viral illness, typically self-limiting.");
    add("Bacterial infection", 25, false, "May need antibiotic treatment if symptoms persist.");
    add("Influenza", 15, false, "Seasonal flu — rest and fluids recommended.");
  } else if (text.includes("cough")) {
    add("Upper respiratory infection", 55, false, "Common cold or similar viral illness.");
    add("Bronchitis", 25, false, "Inflammation of the bronchial tubes.");
    add("Allergic cough", 20, false, "Cough triggered by environmental allergens.");
  } else if (text.includes("abdominal pain") || text.includes("stomach")) {
    add("Gastritis", 40, false, "Inflammation of the stomach lining.");
    add("Irritable bowel syndrome", 35, false, "Functional bowel disorder.");
    add("Appendicitis", 25, true, "Inflammation of the appendix — surgical emergency if confirmed.");
  } else {
    add("Common viral illness", 50, false, "A self-limiting condition that usually resolves with rest.");
    add("Minor musculoskeletal strain", 30, false, "Tissue strain from activity or posture.");
    add("Stress-related symptoms", 20, false, "Physical manifestations of psychological stress.");
  }
  return list;
}

function buildRecommendations(level: string, specialty: string): string[] {
  if (level === "emergency") {
    return [
      "Call emergency services or go to the nearest emergency room now.",
      "Do not drive yourself — have someone else take you or call an ambulance.",
      "Stay calm, sit upright, and avoid food or drink until evaluated.",
    ];
  }
  if (level === "urgent") {
    return [
      `Book an appointment with ${specialty} within 24 hours.`,
      "Monitor for worsening — seek emergency care if symptoms intensify.",
      "Stay hydrated and rest until you are evaluated.",
    ];
  }
  return [
    `Schedule a routine ${specialty} visit if symptoms persist beyond 3-5 days.`,
    "Hydrate, rest, and track any new symptoms in your vitals log.",
    "Over-the-counter symptom relief is reasonable in the meantime.",
  ];
}

router.post("/triage/chat", async (req, res) => {
  const body = TriageChatBody.parse(req.body);
  const conversationId = body.conversationId ?? randomUUID();

  await db.insert(chatMessages).values({ conversationId, role: "user", content: body.message });

  const history = await db.select().from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(asc(chatMessages.createdAt));

  const reply = generateReply(body.message, history.length);
  const quickReplies = generateQuickReplies(body.message);

  await db.insert(chatMessages).values({ conversationId, role: "assistant", content: reply });

  res.json({ reply, quickReplies, conversationId });
});

function generateReply(message: string, turn: number): string {
  const m = message.toLowerCase();
  if (RED_FLAGS.some((f) => m.includes(f))) {
    return "These symptoms can be serious. Please consider triggering an SOS or going to your nearest emergency room. Would you like me to show nearby hospitals?";
  }
  if (m.includes("hello") || m.includes("hi ") || turn <= 1) {
    return "Hi — I'm here to help you understand what you're feeling. Could you describe your main symptom and how long you've had it?";
  }
  if (m.includes("how long") || /\bdays?\b|\bweeks?\b/.test(m)) {
    return "Thanks for that detail. On a scale from 1 (barely noticeable) to 10 (worst pain you can imagine), how would you rate the severity right now?";
  }
  if (/[0-9]/.test(m) && (m.includes("severity") || m.includes("pain") || m.length < 20)) {
    return "Got it. Are you experiencing any other symptoms alongside this — like fever, nausea, dizziness, or changes in breathing?";
  }
  if (m.includes("medication") || m.includes("medicine")) {
    return "Good to know. I'll factor your current medications in. Have you taken anything for these symptoms in the last 24 hours?";
  }
  return "Thanks. Based on what you've shared so far, I'd suggest running the structured assessment — it'll give you a clearer picture and route you to the right specialty. Want to do that now?";
}

function generateQuickReplies(message: string): string[] {
  const m = message.toLowerCase();
  if (RED_FLAGS.some((f) => m.includes(f))) return ["Show nearby hospitals", "Trigger SOS", "Call emergency contact"];
  if (m.length < 5) return ["I have a headache", "Chest pain", "Fever and cough", "Stomach pain"];
  return ["Run the assessment", "Tell me more", "Find a doctor", "I'm feeling better"];
}

export default router;

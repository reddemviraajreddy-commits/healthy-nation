import {
  db, profile, vitals, doctors, appointments, medications, conditions,
  medicines, pharmacies, emergencyContacts, hospitals,
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function tableEmpty(table: any): Promise<boolean> {
  const r = await db.select({ c: sql<number>`count(*)::int` }).from(table);
  return (r[0]?.c ?? 0) === 0;
}

async function seedProfile() {
  if (!(await tableEmpty(profile))) return;
  await db.insert(profile).values({
    name: "Asha Patel",
    dob: "1991-06-12",
    gender: "Female",
    bloodType: "O+",
    allergies: ["Penicillin", "Peanuts"],
    medicalNotes: "Mild asthma since childhood. Carries inhaler.",
    emergencyOrganDonor: true,
    dnr: false,
    height: 165.1,
    weight: 62.3,
  });
}

async function seedVitals() {
  if (!(await tableEmpty(vitals))) return;
  const now = Date.now();
  const rows: any[] = [];
  // 14 days of heart rate
  for (let d = 13; d >= 0; d--) {
    for (const h of [8, 14, 21]) {
      const t = new Date(now - d * 86400_000);
      t.setHours(h, 0, 0, 0);
      const hr = 60 + Math.round(Math.sin(d * 0.7 + h) * 8 + Math.random() * 6 + (h === 14 ? 12 : 0));
      rows.push({ vitalType: "heart_rate", value: hr, unit: "bpm", recordedAt: t, status: hr > 100 ? "warning" : "normal", deviceName: "Apple Watch" });
    }
  }
  // Blood pressure
  for (let d = 13; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(7, 30, 0, 0);
    const sys = 118 + Math.round(Math.random() * 14);
    const dia = 76 + Math.round(Math.random() * 8);
    rows.push({ vitalType: "blood_pressure", value: sys, valueSecondary: dia, unit: "mmHg", recordedAt: t, status: sys >= 140 ? "warning" : "normal", deviceName: "Omron M3" });
  }
  // SpO2
  for (let d = 6; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(22, 0, 0, 0);
    const v = 96 + Math.round(Math.random() * 3);
    rows.push({ vitalType: "spo2", value: v, unit: "%", recordedAt: t, status: "normal", deviceName: "Pulse oximeter" });
  }
  // Glucose
  for (let d = 6; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(7, 0, 0, 0);
    const v = 92 + Math.round(Math.random() * 25);
    rows.push({ vitalType: "glucose", value: v, unit: "mg/dL", recordedAt: t, status: v > 130 ? "warning" : "normal", deviceName: "FreeStyle Libre" });
  }
  // Temperature
  for (let d = 4; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(20, 0, 0, 0);
    rows.push({ vitalType: "temperature", value: 98.4 + Math.random() * 0.8, unit: "°F", recordedAt: t, status: "normal", deviceName: "Thermometer" });
  }
  // Steps
  for (let d = 13; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(23, 0, 0, 0);
    rows.push({ vitalType: "steps", value: 5500 + Math.round(Math.random() * 5000), unit: "steps", recordedAt: t, status: "normal", deviceName: "iPhone" });
  }
  // Sleep
  for (let d = 13; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(8, 0, 0, 0);
    const v = 6 + Math.random() * 2.5;
    rows.push({ vitalType: "sleep", value: Number(v.toFixed(1)), unit: "hours", recordedAt: t, status: v < 6 ? "warning" : "normal", deviceName: "Apple Watch" });
  }
  // Respiratory
  for (let d = 6; d >= 0; d--) {
    const t = new Date(now - d * 86400_000); t.setHours(9, 0, 0, 0);
    rows.push({ vitalType: "respiratory_rate", value: 14 + Math.round(Math.random() * 4), unit: "br/min", recordedAt: t, status: "normal", deviceName: "Apple Watch" });
  }
  await db.insert(vitals).values(rows);
}

const DOCTOR_PHOTOS = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400&h=400&fit=crop&q=80",
];

async function seedDoctors() {
  if (!(await tableEmpty(doctors))) return;
  const seedRows = [
    { name: "Dr. Priya Sharma", specialty: "Cardiology", clinic: "Heartwell Clinic", years: 14, rating: 4.9, count: 412, fee: 1200, telefee: 800, langs: ["English", "Hindi"], bio: "Interventional cardiologist with a focus on preventive heart care for adults and athletes." },
    { name: "Dr. Marcus Johnson", specialty: "General Medicine", clinic: "Bayview Family Health", years: 9, rating: 4.7, count: 298, fee: 600, telefee: 450, langs: ["English"], bio: "Family physician treating the whole household, from common colds to chronic care." },
    { name: "Dr. Saanvi Reddy", specialty: "Dermatology", clinic: "Lumin Skin Studio", years: 11, rating: 4.8, count: 506, fee: 900, telefee: 650, langs: ["English", "Telugu"], bio: "Cosmetic and medical dermatology — acne, eczema, pigmentation, and laser treatments." },
    { name: "Dr. James O'Connor", specialty: "Orthopedics", clinic: "Stride Joint & Spine", years: 18, rating: 4.6, count: 221, fee: 1100, telefee: 700, langs: ["English"], bio: "Sports medicine and joint replacement specialist with a conservative-first philosophy." },
    { name: "Dr. Linh Nguyen", specialty: "Pediatrics", clinic: "Little Sprouts Pediatrics", years: 12, rating: 4.95, count: 633, fee: 700, telefee: 500, langs: ["English", "Vietnamese"], bio: "Gentle, evidence-based care for newborns through teens. Lactation-trained." },
    { name: "Dr. Ananya Iyer", specialty: "Psychiatry", clinic: "Stillwater Mental Health", years: 8, rating: 4.85, count: 187, fee: 1500, telefee: 1200, langs: ["English", "Tamil"], bio: "Anxiety, depression, and ADHD across the lifespan. Talk therapy + medication management." },
    { name: "Dr. Rafael Mendes", specialty: "Pulmonology", clinic: "Open Airways Clinic", years: 16, rating: 4.7, count: 264, fee: 1000, telefee: 750, langs: ["English", "Portuguese"], bio: "Asthma, COPD, sleep apnea, and chronic cough specialist." },
    { name: "Dr. Yuki Tanaka", specialty: "Gastroenterology", clinic: "Gut Health Center", years: 13, rating: 4.75, count: 312, fee: 1100, telefee: 800, langs: ["English", "Japanese"], bio: "IBS, IBD, and reflux care with a focus on dietary lifestyle interventions." },
    { name: "Dr. Olivia Bennett", specialty: "Neurology", clinic: "Northstar Neuroscience", years: 15, rating: 4.65, count: 178, fee: 1400, telefee: 1000, langs: ["English"], bio: "Migraines, epilepsy, and movement disorders. Patient-first communication." },
    { name: "Dr. Karim Khalil", specialty: "Endocrinology", clinic: "Balance Hormone & Diabetes", years: 10, rating: 4.8, count: 244, fee: 1100, telefee: 800, langs: ["English", "Arabic"], bio: "Diabetes management, thyroid disease, and metabolic health." },
  ];
  await db.insert(doctors).values(seedRows.map((s, i) => ({
    name: s.name, specialty: s.specialty, bio: s.bio, rating: s.rating, ratingCount: s.count,
    experienceYears: s.years, languages: s.langs, feeInPerson: s.fee, feeTelemedicine: s.telefee,
    supportsTelemedicine: true, clinicName: s.clinic, city: "San Francisco", photoUrl: DOCTOR_PHOTOS[i % DOCTOR_PHOTOS.length], verified: true,
  })));
}

async function seedAppointments() {
  if (!(await tableEmpty(appointments))) return;
  const docs = await db.select().from(doctors);
  if (docs.length === 0) return;
  const now = Date.now();
  await db.insert(appointments).values([
    { doctorId: docs[0].id, scheduledAt: new Date(now + 2 * 86400_000), visitType: "telemedicine", status: "confirmed", fee: docs[0].feeTelemedicine, reason: "Annual cardiac check-up", symptoms: "Occasional palpitations", videoCallLink: "https://meet.healthynation.app/v/asha-priya" },
    { doctorId: docs[2].id, scheduledAt: new Date(now + 5 * 86400_000 + 4 * 3600_000), visitType: "in_person", status: "confirmed", fee: docs[2].feeInPerson, reason: "Skin patch follow-up" },
    { doctorId: docs[5].id, scheduledAt: new Date(now - 12 * 86400_000), visitType: "telemedicine", status: "completed", fee: docs[5].feeTelemedicine, reason: "Therapy session", videoCallLink: "https://meet.healthynation.app/v/asha-ananya" },
    { doctorId: docs[1].id, scheduledAt: new Date(now - 30 * 86400_000), visitType: "in_person", status: "completed", fee: docs[1].feeInPerson, reason: "Annual physical" },
  ]);
}

async function seedMedications() {
  if (!(await tableEmpty(medications))) return;
  await db.insert(medications).values([
    { name: "Albuterol Inhaler", dosage: "90 mcg, 2 puffs", frequency: "As needed", indication: "Asthma", startDate: "2018-03-12", isOngoing: true, refillRemaining: 1, adherencePercent: 92, timeOfDay: "as_needed", notes: "Use 15 minutes before exercise." },
    { name: "Vitamin D3", dosage: "2000 IU", frequency: "Once daily", indication: "Vitamin D deficiency", startDate: "2024-01-05", isOngoing: true, refillRemaining: 3, adherencePercent: 88, timeOfDay: "morning" },
    { name: "Iron Supplement", dosage: "65 mg", frequency: "Once daily", indication: "Mild anemia", startDate: "2025-09-01", isOngoing: true, refillRemaining: 2, adherencePercent: 81, timeOfDay: "evening", notes: "Take with vitamin C, avoid with dairy." },
    { name: "Amoxicillin", dosage: "500 mg", frequency: "Three times daily", indication: "Sinus infection", startDate: "2025-11-18", endDate: "2025-11-28", isOngoing: false, refillRemaining: 0, adherencePercent: 100 },
  ]);
}

async function seedConditions() {
  if (!(await tableEmpty(conditions))) return;
  await db.insert(conditions).values([
    { name: "Mild Asthma", status: "active", severity: "mild", diagnosisDate: "2008-04-22", icdCode: "J45.20", notes: "Triggered by cold air and exercise. Well controlled with rescue inhaler." },
    { name: "Iron-deficiency Anemia", status: "active", severity: "mild", diagnosisDate: "2025-08-30", icdCode: "D50.9", notes: "Hemoglobin 11.2 — supplementing." },
    { name: "Acute Sinusitis", status: "resolved", severity: "moderate", diagnosisDate: "2025-11-18", icdCode: "J01.90", notes: "Resolved after 10-day antibiotic course." },
  ]);
}

async function seedMedicines() {
  if (!(await tableEmpty(medicines))) return;
  await db.insert(medicines).values([
    { name: "Paracetamol", strength: "500 mg", form: "Tablet", manufacturer: "Cipla", price: 4500, mrp: 5000, inStock: true, requiresPrescription: false, category: "Pain & Fever", description: "For mild to moderate pain and fever relief." },
    { name: "Ibuprofen", strength: "400 mg", form: "Tablet", manufacturer: "Sun Pharma", price: 6800, mrp: 7500, inStock: true, requiresPrescription: false, category: "Pain & Fever", description: "Anti-inflammatory pain reliever." },
    { name: "Cetirizine", strength: "10 mg", form: "Tablet", manufacturer: "Dr. Reddy's", price: 3200, mrp: 3800, inStock: true, requiresPrescription: false, category: "Allergy", description: "Once-daily antihistamine for seasonal allergies." },
    { name: "Albuterol Inhaler", strength: "90 mcg/puff", form: "Inhaler", manufacturer: "GlaxoSmithKline", price: 28000, mrp: 32000, inStock: true, requiresPrescription: true, category: "Respiratory", description: "Rescue inhaler for asthma symptoms." },
    { name: "Vitamin D3", strength: "2000 IU", form: "Capsule", manufacturer: "HealthVit", price: 18000, mrp: 22000, inStock: true, requiresPrescription: false, category: "Vitamins", description: "Supports bone and immune health." },
    { name: "Iron + Folic Acid", strength: "65 mg", form: "Tablet", manufacturer: "Zydus", price: 9500, mrp: 11000, inStock: true, requiresPrescription: false, category: "Vitamins", description: "Supplemental iron and folate." },
    { name: "Omeprazole", strength: "20 mg", form: "Capsule", manufacturer: "Lupin", price: 7200, mrp: 8500, inStock: true, requiresPrescription: false, category: "Digestive", description: "Reduces stomach acid for reflux relief." },
    { name: "Loratadine", strength: "10 mg", form: "Tablet", manufacturer: "Mankind", price: 4200, mrp: 5000, inStock: false, requiresPrescription: false, category: "Allergy", description: "Non-drowsy allergy relief." },
    { name: "Amoxicillin", strength: "500 mg", form: "Capsule", manufacturer: "Cipla", price: 14000, mrp: 16000, inStock: true, requiresPrescription: true, category: "Antibiotic", description: "Broad-spectrum antibiotic." },
    { name: "Metformin", strength: "500 mg", form: "Tablet", manufacturer: "USV", price: 5800, mrp: 6500, inStock: true, requiresPrescription: true, category: "Diabetes", description: "First-line therapy for type 2 diabetes." },
    { name: "ORS Sachets", strength: "21.8 g", form: "Powder", manufacturer: "Electral", price: 2200, mrp: 2500, inStock: true, requiresPrescription: false, category: "Hydration", description: "Oral rehydration salts for dehydration." },
    { name: "Multivitamin", strength: "Daily", form: "Tablet", manufacturer: "Centrum", price: 32000, mrp: 38000, inStock: true, requiresPrescription: false, category: "Vitamins", description: "Complete daily multivitamin." },
  ]);
}

async function seedPharmacies() {
  if (!(await tableEmpty(pharmacies))) return;
  await db.insert(pharmacies).values([
    { name: "Wellness Pharmacy", address: "1421 Mission St, San Francisco", distanceKm: 0.8, rating: 4.7, deliveryFee: 4900, etaMinutes: 30, isOpen: true },
    { name: "Apollo 24/7", address: "85 Market St, San Francisco", distanceKm: 1.4, rating: 4.6, deliveryFee: 0, etaMinutes: 45, isOpen: true },
    { name: "MedPlus Express", address: "300 Valencia St, San Francisco", distanceKm: 2.1, rating: 4.5, deliveryFee: 2900, etaMinutes: 60, isOpen: true },
    { name: "City Pharmacy", address: "55 Geary Blvd, San Francisco", distanceKm: 3.0, rating: 4.4, deliveryFee: 1900, etaMinutes: 75, isOpen: false },
  ]);
}

async function seedHospitals() {
  if (!(await tableEmpty(hospitals))) return;
  await db.insert(hospitals).values([
    { name: "St. Francis Memorial Hospital", address: "900 Hyde St, San Francisco", distanceKm: 1.2, phone: "+1-415-353-6000", traumaLevel: "Level II", erOpen: true, etaMinutes: 6 },
    { name: "UCSF Medical Center", address: "505 Parnassus Ave, San Francisco", distanceKm: 4.5, phone: "+1-415-476-1000", traumaLevel: "Level I", erOpen: true, etaMinutes: 14 },
    { name: "Zuckerberg SF General Hospital", address: "1001 Potrero Ave, San Francisco", distanceKm: 3.8, phone: "+1-628-206-8000", traumaLevel: "Level I", erOpen: true, etaMinutes: 12 },
  ]);
}

async function seedEmergencyContacts() {
  if (!(await tableEmpty(emergencyContacts))) return;
  await db.insert(emergencyContacts).values([
    { name: "Rohit Patel", relationship: "Spouse", phone: "+1-415-555-0142", isPrimary: true },
    { name: "Meera Patel", relationship: "Mother", phone: "+1-415-555-0118", isPrimary: false },
    { name: "Dr. Marcus Johnson", relationship: "Family Physician", phone: "+1-415-555-0199", isPrimary: false },
  ]);
}

export async function runSeed() {
  await seedProfile();
  await seedDoctors();
  await seedVitals();
  await seedAppointments();
  await seedMedications();
  await seedConditions();
  await seedMedicines();
  await seedPharmacies();
  await seedHospitals();
  await seedEmergencyContacts();
}

import { Router, type IRouter } from "express";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db, vitals, appointments, medications, orders, doctors, triageSessions } from "@workspace/db";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const latestRows = await db.execute(sql`
    SELECT DISTINCT ON (vital_type) *
    FROM vitals
    ORDER BY vital_type, recorded_at DESC
  `);
  const latestVitals = (latestRows.rows as any[]).map((r) => ({
    id: r.id,
    vitalType: r.vital_type,
    recordedAt: r.recorded_at,
    value: Number(r.value),
    valueSecondary: r.value_secondary === null ? null : Number(r.value_secondary),
    unit: r.unit,
    status: r.status,
    deviceName: r.device_name,
    notes: r.notes,
  }));

  const alerts = latestVitals
    .filter((v) => v.status !== "normal")
    .map((v, i) => ({
      id: `alert-${v.id}-${i}`,
      severity: v.status === "critical" ? "critical" : "warning",
      title: `${formatVitalLabel(v.vitalType)} out of range`,
      message: `Latest reading was ${v.value}${v.unit}. Consider following up.`,
      createdAt: v.recordedAt,
    }));

  const now = new Date();
  const upcoming = await db.select().from(appointments)
    .where(gte(appointments.scheduledAt, now))
    .orderBy(appointments.scheduledAt)
    .limit(5);
  const docMap = new Map((await db.select().from(doctors)).map((d) => [d.id, d]));
  const upcomingAppointments = upcoming.map((a) => {
    const d = docMap.get(a.doctorId);
    return {
      id: a.id,
      doctorId: a.doctorId,
      doctorName: d?.name ?? "Unknown",
      doctorSpecialty: d?.specialty ?? "",
      doctorPhotoUrl: d?.photoUrl ?? "",
      scheduledAt: a.scheduledAt,
      visitType: a.visitType,
      status: a.status,
      fee: a.fee,
      reason: a.reason,
      symptoms: a.symptoms,
      videoCallLink: a.videoCallLink,
    };
  });

  const activeMeds = await db.select({ c: sql<number>`count(*)::int` }).from(medications).where(eq(medications.isOngoing, true));
  const pendingOrdersRows = await db.execute(sql`SELECT COUNT(*)::int AS c FROM orders WHERE status NOT IN ('delivered', 'cancelled')`);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await db.select({ c: sql<number>`count(*)::int` }).from(vitals).where(gte(vitals.recordedAt, startOfDay));

  const adherenceRows = await db.select({ avg: sql<number>`coalesce(avg(adherence_percent), 100)::int` }).from(medications).where(eq(medications.isOngoing, true));
  const criticalCount = latestVitals.filter((v) => v.status === "critical").length;
  const warningCount = latestVitals.filter((v) => v.status === "warning").length;
  const healthScore = Math.max(0, 100 - criticalCount * 20 - warningCount * 8);

  res.json({
    latestVitals,
    alerts,
    upcomingAppointments,
    activeMedications: activeMeds[0]?.c ?? 0,
    pendingOrders: (pendingOrdersRows.rows[0] as any)?.c ?? 0,
    healthScore,
    vitalsToday: todayCount[0]?.c ?? 0,
    adherencePercent: adherenceRows[0]?.avg ?? 100,
  });
});

router.get("/activity/recent", async (req, res) => {
  const params = GetRecentActivityQueryParams.parse(req.query);
  const limit = params.limit ?? 20;

  const items: { id: string; type: string; title: string; description: string; occurredAt: Date | string; status: string | null }[] = [];

  const v = await db.select().from(vitals).orderBy(desc(vitals.recordedAt)).limit(limit);
  for (const r of v) items.push({
    id: `vital-${r.id}`, type: "vital",
    title: `Logged ${formatVitalLabel(r.vitalType)}`,
    description: `${r.value}${r.unit}`,
    occurredAt: r.recordedAt, status: r.status,
  });

  const a = await db.select().from(appointments).orderBy(desc(appointments.createdAt)).limit(limit);
  const docs = new Map((await db.select().from(doctors)).map((d) => [d.id, d]));
  for (const r of a) items.push({
    id: `appt-${r.id}`, type: "appointment",
    title: `Appointment with ${docs.get(r.doctorId)?.name ?? "doctor"}`,
    description: `${r.visitType.replace("_", " ")} • ${r.reason}`,
    occurredAt: r.createdAt, status: r.status,
  });

  const o = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  for (const r of o) items.push({
    id: `order-${r.id}`, type: "order",
    title: `Medicine order #${r.id}`,
    description: `Total ${(r.totalAmount / 100).toFixed(2)}`,
    occurredAt: r.createdAt, status: r.status,
  });

  const t = await db.select().from(triageSessions).orderBy(desc(triageSessions.createdAt)).limit(limit);
  for (const r of t) items.push({
    id: `triage-${r.id}`, type: "triage",
    title: `Symptom check: ${r.primarySymptom}`,
    description: r.summary,
    occurredAt: r.createdAt, status: r.triageLevel,
  });

  items.sort((x, y) => new Date(y.occurredAt).getTime() - new Date(x.occurredAt).getTime());
  res.json(items.slice(0, limit));
});

function formatVitalLabel(t: string): string {
  return t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export default router;

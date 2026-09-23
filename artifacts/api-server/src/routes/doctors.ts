import { Router, type IRouter } from "express";
import { and, eq, gte, ilike, or, sql, desc } from "drizzle-orm";
import { db, doctors, appointments } from "@workspace/db";
import { ListDoctorsQueryParams, GetDoctorAvailabilityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/doctors", async (req, res) => {
  const params = ListDoctorsQueryParams.parse(req.query);
  const conds = [];
  if (params.q) conds.push(or(ilike(doctors.name, `%${params.q}%`), ilike(doctors.specialty, `%${params.q}%`), ilike(doctors.clinicName, `%${params.q}%`)));
  if (params.specialty) conds.push(eq(doctors.specialty, params.specialty));
  if (typeof params.minRating === "number") conds.push(gte(doctors.rating, params.minRating));
  if (params.visitType === "telemedicine") conds.push(eq(doctors.supportsTelemedicine, true));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(doctors).where(where).orderBy(desc(doctors.rating)).limit(50);
  const withAvail = rows.map((d) => ({ ...d, nextAvailable: nextAvailableSlot(d.id) }));
  res.json(withAvail);
});

router.get("/specialties", async (_req, res) => {
  const rows = await db.execute(sql`SELECT specialty AS name, COUNT(*)::int AS doctor_count FROM doctors GROUP BY specialty ORDER BY doctor_count DESC`);
  res.json((rows.rows as any[]).map((r) => ({ name: r.name, doctorCount: r.doctor_count })));
});

router.get("/doctors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [d] = await db.select().from(doctors).where(eq(doctors.id, id));
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...d, nextAvailable: nextAvailableSlot(d.id) });
});

router.get("/doctors/:id/availability", async (req, res) => {
  const id = Number(req.params.id);
  const params = GetDoctorAvailabilityQueryParams.parse(req.query);
  const days = params.days ?? 7;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Existing booked slots
  const future = new Date(today.getTime() + days * 86400_000);
  const booked = await db.select({ scheduledAt: appointments.scheduledAt })
    .from(appointments)
    .where(and(eq(appointments.doctorId, id), gte(appointments.scheduledAt, today)));
  const bookedSet = new Set(booked.map((b) => new Date(b.scheduledAt).toISOString()));
  void future;
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(today.getTime() + i * 86400_000);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const slots = [];
    const hours = isWeekend ? [10, 11, 14, 15] : [9, 10, 11, 14, 15, 16, 17];
    for (const h of hours) {
      for (const m of [0, 30]) {
        const slot = new Date(date); slot.setHours(h, m, 0, 0);
        const iso = slot.toISOString();
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const isPast = slot.getTime() < Date.now();
        const taken = bookedSet.has(iso);
        // Stable pseudo-random: hash slot to mark some as unavailable
        const seed = (id * 31 + h * 7 + m + i) % 9;
        slots.push({ time, available: !isPast && !taken && seed > 1 });
      }
    }
    out.push({ date: date.toISOString().slice(0, 10), slots });
  }
  res.json(out);
});

function nextAvailableSlot(_doctorId: number): string {
  const next = new Date();
  next.setHours(next.getHours() + 4, 0, 0, 0);
  return next.toISOString();
}

export default router;

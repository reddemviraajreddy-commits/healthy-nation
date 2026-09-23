import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, appointments, doctors } from "@workspace/db";
import { CreateAppointmentBody, UpdateAppointmentBody, ListAppointmentsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function shape(appt: typeof appointments.$inferSelect) {
  const [d] = await db.select().from(doctors).where(eq(doctors.id, appt.doctorId));
  return {
    id: appt.id,
    doctorId: appt.doctorId,
    doctorName: d?.name ?? "Unknown",
    doctorSpecialty: d?.specialty ?? "",
    doctorPhotoUrl: d?.photoUrl ?? "",
    scheduledAt: appt.scheduledAt,
    visitType: appt.visitType,
    status: appt.status,
    fee: appt.fee,
    reason: appt.reason,
    symptoms: appt.symptoms,
    videoCallLink: appt.videoCallLink,
  };
}

router.get("/appointments", async (req, res) => {
  const params = ListAppointmentsQueryParams.parse(req.query);
  const where = params.status ? eq(appointments.status, params.status) : undefined;
  const rows = await db.select().from(appointments).where(where).orderBy(desc(appointments.scheduledAt));
  const out = await Promise.all(rows.map(shape));
  res.json(out);
});

router.post("/appointments", async (req, res) => {
  const body = CreateAppointmentBody.parse(req.body);
  const [d] = await db.select().from(doctors).where(eq(doctors.id, body.doctorId));
  if (!d) { res.status(404).json({ error: "Doctor not found" }); return; }
  const fee = body.visitType === "telemedicine" ? d.feeTelemedicine : d.feeInPerson;
  const videoCallLink = body.visitType === "telemedicine" ? `https://meet.healthynation.app/v/${Math.random().toString(36).slice(2, 10)}` : null;
  const [row] = await db.insert(appointments).values({
    doctorId: body.doctorId,
    scheduledAt: new Date(body.scheduledAt),
    visitType: body.visitType,
    status: "confirmed",
    fee,
    reason: body.reason,
    symptoms: body.symptoms ?? null,
    videoCallLink,
  }).returning();
  res.status(201).json(await shape(row));
});

router.get("/appointments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await shape(row));
});

router.patch("/appointments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateAppointmentBody.parse(req.body);
  const updates: Partial<typeof appointments.$inferInsert> = {};
  if (body.status) updates.status = body.status;
  if (body.cancellationReason !== undefined) updates.cancellationReason = body.cancellationReason;
  const [row] = await db.update(appointments).set(updates).where(eq(appointments.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await shape(row));
});

void and;
export default router;

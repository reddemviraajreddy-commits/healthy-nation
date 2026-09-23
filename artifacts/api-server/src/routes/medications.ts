import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, medications } from "@workspace/db";
import { CreateMedicationBody, UpdateMedicationBody, ListMedicationsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/medications", async (req, res) => {
  const params = ListMedicationsQueryParams.parse(req.query);
  const where = typeof params.ongoing === "boolean" ? eq(medications.isOngoing, params.ongoing) : undefined;
  const rows = await db.select().from(medications).where(where).orderBy(desc(medications.isOngoing), desc(medications.id));
  res.json(rows);
});

router.post("/medications", async (req, res) => {
  const body = CreateMedicationBody.parse(req.body);
  const [row] = await db.insert(medications).values({
    name: body.name,
    dosage: body.dosage,
    frequency: body.frequency,
    indication: body.indication,
    startDate: body.startDate,
    timeOfDay: body.timeOfDay ?? null,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/medications/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateMedicationBody.parse(req.body);
  const updates: Partial<typeof medications.$inferInsert> = {};
  if (body.dosage != null) updates.dosage = body.dosage;
  if (body.frequency != null) updates.frequency = body.frequency;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.isOngoing != null) updates.isOngoing = body.isOngoing;
  const [row] = await db.update(medications).set(updates).where(eq(medications.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/medications/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(medications).where(eq(medications.id, id));
  res.status(204).end();
});

export default router;

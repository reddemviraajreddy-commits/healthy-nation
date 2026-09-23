import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db, emergencyContacts, hospitals, sosEvents } from "@workspace/db";
import { CreateEmergencyContactBody, TriggerSosBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/emergency/contacts", async (_req, res) => {
  const rows = await db.select().from(emergencyContacts).orderBy(desc(emergencyContacts.isPrimary), asc(emergencyContacts.name));
  res.json(rows);
});

router.post("/emergency/contacts", async (req, res) => {
  const body = CreateEmergencyContactBody.parse(req.body);
  const [row] = await db.insert(emergencyContacts).values({
    name: body.name,
    relationship: body.relationship,
    phone: body.phone,
    isPrimary: body.isPrimary ?? false,
  }).returning();
  res.status(201).json(row);
});

router.delete("/emergency/contacts/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  res.status(204).end();
});

router.get("/emergency/hospitals", async (_req, res) => {
  const rows = await db.select().from(hospitals).orderBy(asc(hospitals.distanceKm));
  res.json(rows);
});

router.post("/emergency/sos", async (req, res) => {
  const body = TriggerSosBody.parse(req.body);
  const contacts = await db.select().from(emergencyContacts);
  const [event] = await db.insert(sosEvents).values({
    status: "active",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    notes: body.notes ?? null,
    contactsNotified: contacts.length,
  }).returning();
  const hosps = await db.select().from(hospitals).orderBy(asc(hospitals.distanceKm)).limit(3);
  res.status(201).json({
    id: event.id,
    status: event.status,
    triggeredAt: event.triggeredAt,
    latitude: event.latitude,
    longitude: event.longitude,
    contactsNotified: event.contactsNotified,
    hospitals: hosps,
  });
});

router.post("/emergency/sos/:id/resolve", async (req, res) => {
  const id = Number(req.params.id);
  const [event] = await db
    .update(sosEvents)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(sosEvents.id, id))
    .returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: event.id,
    status: event.status,
    triggeredAt: event.triggeredAt,
    latitude: event.latitude,
    longitude: event.longitude,
    contactsNotified: event.contactsNotified,
    hospitals: [],
  });
});

router.get("/emergency/sos/active", async (_req, res) => {
  const [event] = await db.select().from(sosEvents).where(eq(sosEvents.status, "active")).orderBy(desc(sosEvents.triggeredAt)).limit(1);
  if (!event) { res.json(null); return; }
  const hosps = await db.select().from(hospitals).orderBy(asc(hospitals.distanceKm)).limit(3);
  res.json({
    id: event.id,
    status: event.status,
    triggeredAt: event.triggeredAt,
    latitude: event.latitude,
    longitude: event.longitude,
    contactsNotified: event.contactsNotified,
    hospitals: hosps,
  });
});

export default router;

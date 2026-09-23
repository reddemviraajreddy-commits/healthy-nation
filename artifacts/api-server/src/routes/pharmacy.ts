import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, medicines, pharmacies, orders, orderItems } from "@workspace/db";
import { ListMedicinesQueryParams, CreateOrderBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/medicines", async (req, res) => {
  const params = ListMedicinesQueryParams.parse(req.query);
  const conds = [];
  if (params.q) conds.push(or(ilike(medicines.name, `%${params.q}%`), ilike(medicines.description, `%${params.q}%`)));
  if (params.category) conds.push(eq(medicines.category, params.category));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(medicines).where(where).orderBy(asc(medicines.name)).limit(100);
  res.json(rows);
});

router.get("/medicines/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(medicines).where(eq(medicines.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.get("/pharmacies/nearby", async (_req, res) => {
  const rows = await db.select().from(pharmacies).orderBy(asc(pharmacies.distanceKm));
  res.json(rows);
});

const STEP_LABELS = ["Order placed", "Preparing", "Dispatched", "Out for delivery", "Delivered"];
function statusToStep(status: string): number {
  switch (status) {
    case "pending_payment": return 0;
    case "preparing": return 1;
    case "dispatched": return 2;
    case "out_for_delivery": return 3;
    case "delivered": return 4;
    default: return 1;
  }
}

router.get("/orders", async (_req, res) => {
  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const ids = orderRows.map((o) => o.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  const pharmRows = await db.select().from(pharmacies);
  const pharmMap = new Map(pharmRows.map((p) => [p.id, p]));
  const out = orderRows.map((o) => {
    const its = items.filter((i) => i.orderId === o.id);
    return {
      id: o.id,
      status: o.status,
      pharmacyName: pharmMap.get(o.pharmacyId)?.name ?? "Pharmacy",
      totalAmount: o.totalAmount,
      itemCount: its.reduce((sum, i) => sum + i.quantity, 0),
      createdAt: o.createdAt,
      estimatedDeliveryAt: o.estimatedDeliveryAt,
      currentStep: statusToStep(o.status),
    };
  });
  res.json(out);
});

router.post("/orders", async (req, res) => {
  const body = CreateOrderBody.parse(req.body);
  const [pharm] = await db.select().from(pharmacies).where(eq(pharmacies.id, body.pharmacyId));
  if (!pharm) { res.status(404).json({ error: "Pharmacy not found" }); return; }
  const meds = await db.select().from(medicines).where(inArray(medicines.id, body.items.map((i) => i.medicineId)));
  const medMap = new Map(meds.map((m) => [m.id, m]));
  const items = body.items.map((i) => {
    const m = medMap.get(i.medicineId);
    if (!m) throw new Error(`Medicine ${i.medicineId} not found`);
    return { medicineId: m.id, name: m.name, strength: m.strength, quantity: i.quantity, unitPrice: m.price };
  });
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + pharm.deliveryFee + tax;
  const eta = new Date(Date.now() + pharm.etaMinutes * 60_000);
  const [order] = await db.insert(orders).values({
    pharmacyId: pharm.id,
    status: "preparing",
    subtotal,
    deliveryFee: pharm.deliveryFee,
    tax,
    totalAmount: total,
    deliveryAddress: body.deliveryAddress,
    paymentMethod: body.paymentMethod,
    notes: body.notes ?? null,
    driverName: "Rohan K.",
    driverPhone: "+1-555-0142",
    estimatedDeliveryAt: eta,
  }).returning();
  if (items.length) {
    await db.insert(orderItems).values(items.map((i) => ({ orderId: order.id, ...i })));
  }
  res.status(201).json({
    id: order.id,
    status: order.status,
    pharmacyName: pharm.name,
    totalAmount: order.totalAmount,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    createdAt: order.createdAt,
    estimatedDeliveryAt: order.estimatedDeliveryAt,
    currentStep: statusToStep(order.status),
  });
});

router.get("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  if (!o) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const [pharm] = await db.select().from(pharmacies).where(eq(pharmacies.id, o.pharmacyId));
  const currentStep = statusToStep(o.status);
  const created = new Date(o.createdAt).getTime();
  const eta = new Date(o.estimatedDeliveryAt).getTime();
  const stepGap = (eta - created) / (STEP_LABELS.length - 1);
  const steps = STEP_LABELS.map((label, idx) => ({
    label,
    status: idx < currentStep ? "done" : idx === currentStep ? "current" : "pending",
    timestamp: idx <= currentStep ? new Date(created + stepGap * idx).toISOString() : null,
  }));
  res.json({
    id: o.id,
    status: o.status,
    pharmacyName: pharm?.name ?? "Pharmacy",
    items: items.map((i) => ({ medicineId: i.medicineId, name: i.name, strength: i.strength, quantity: i.quantity, unitPrice: i.unitPrice })),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    tax: o.tax,
    totalAmount: o.totalAmount,
    createdAt: o.createdAt,
    estimatedDeliveryAt: o.estimatedDeliveryAt,
    deliveryAddress: o.deliveryAddress,
    paymentMethod: o.paymentMethod,
    currentStep,
    driverName: o.driverName,
    driverPhone: o.driverPhone,
    steps,
  });
});

export default router;

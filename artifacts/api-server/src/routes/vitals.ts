import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, vitals } from "@workspace/db";
import { CreateVitalBody, ListVitalsQueryParams, GetVitalTrendsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const NORMAL_RANGES: Record<string, { unit: string; classify: (v: number, v2?: number | null) => "normal" | "warning" | "critical" }> = {
  heart_rate: { unit: "bpm", classify: (v) => (v < 50 || v > 110 ? "warning" : v < 40 || v > 130 ? "critical" : "normal") },
  spo2: { unit: "%", classify: (v) => (v < 90 ? "critical" : v < 94 ? "warning" : "normal") },
  blood_pressure: { unit: "mmHg", classify: (v, v2) => {
    const sys = v, dia = v2 ?? 0;
    if (sys >= 180 || dia >= 120) return "critical";
    if (sys >= 140 || dia >= 90 || sys < 90) return "warning";
    return "normal";
  }},
  glucose: { unit: "mg/dL", classify: (v) => (v < 70 || v > 180 ? "warning" : v < 54 || v > 250 ? "critical" : "normal") },
  temperature: { unit: "°F", classify: (v) => (v >= 103 ? "critical" : v >= 100.4 || v < 96 ? "warning" : "normal") },
  steps: { unit: "steps", classify: () => "normal" },
  sleep: { unit: "hours", classify: (v) => (v < 5 ? "warning" : "normal") },
  respiratory_rate: { unit: "br/min", classify: (v) => (v < 12 || v > 20 ? "warning" : "normal") },
};

router.get("/vitals", async (req, res) => {
  const params = ListVitalsQueryParams.parse(req.query);
  const days = params.days ?? 30;
  const since = new Date(Date.now() - days * 86400_000);
  const where = params.vitalType
    ? and(eq(vitals.vitalType, params.vitalType), gte(vitals.recordedAt, since))
    : gte(vitals.recordedAt, since);
  const rows = await db.select().from(vitals).where(where).orderBy(desc(vitals.recordedAt)).limit(200);
  res.json(rows);
});

router.post("/vitals", async (req, res) => {
  const body = CreateVitalBody.parse(req.body);
  const meta = NORMAL_RANGES[body.vitalType];
  const status = meta?.classify(body.value, body.valueSecondary ?? null) ?? "normal";
  const [row] = await db.insert(vitals).values({
    vitalType: body.vitalType,
    value: body.value,
    valueSecondary: body.valueSecondary ?? null,
    unit: body.unit ?? meta?.unit ?? "",
    deviceName: body.deviceName ?? null,
    notes: body.notes ?? null,
    status,
  }).returning();
  res.status(201).json(row);
});

router.get("/vitals/latest", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (vital_type) *
    FROM vitals
    ORDER BY vital_type, recorded_at DESC
  `);
  const items = (rows.rows as any[]).map((r) => ({
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
  res.json({ items });
});

router.get("/vitals/trends", async (req, res) => {
  const params = GetVitalTrendsQueryParams.parse(req.query);
  const days = params.days ?? 14;
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await db.select({
    timestamp: vitals.recordedAt,
    value: vitals.value,
    valueSecondary: vitals.valueSecondary,
  })
    .from(vitals)
    .where(and(eq(vitals.vitalType, params.vitalType), gte(vitals.recordedAt, since)))
    .orderBy(vitals.recordedAt);
  res.json(rows);
});

export default router;

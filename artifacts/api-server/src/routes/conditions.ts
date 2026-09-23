import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conditions } from "@workspace/db";
import { CreateConditionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/conditions", async (_req, res) => {
  const rows = await db.select().from(conditions).orderBy(desc(conditions.diagnosisDate));
  res.json(rows);
});

router.post("/conditions", async (req, res) => {
  const body = CreateConditionBody.parse(req.body);
  const [row] = await db.insert(conditions).values({
    name: body.name,
    status: body.status,
    severity: body.severity,
    diagnosisDate: body.diagnosisDate,
    notes: body.notes ?? null,
    icdCode: body.icdCode ?? null,
  }).returning();
  res.status(201).json(row);
});

router.delete("/conditions/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(conditions).where(eq(conditions.id, id));
  res.status(204).end();
});

export default router;

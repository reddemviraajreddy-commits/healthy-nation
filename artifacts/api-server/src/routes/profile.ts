import { Router, type IRouter } from "express";
import { db, profile } from "@workspace/db";

const router: IRouter = Router();

router.get("/me", async (_req, res) => {
  const rows = await db.select().from(profile).limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(rows[0]);
});

export default router;

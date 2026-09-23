import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import vitalsRouter from "./vitals";
import doctorsRouter from "./doctors";
import appointmentsRouter from "./appointments";
import medicationsRouter from "./medications";
import conditionsRouter from "./conditions";
import pharmacyRouter from "./pharmacy";
import triageRouter from "./triage";
import emergencyRouter from "./emergency";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(vitalsRouter);
router.use(doctorsRouter);
router.use(appointmentsRouter);
router.use(medicationsRouter);
router.use(conditionsRouter);
router.use(pharmacyRouter);
router.use(triageRouter);
router.use(emergencyRouter);
router.use(dashboardRouter);

router.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.name === "ZodError") {
    res.status(400).json({ error: "Validation failed", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err?.message ?? "Internal server error" });
});

export default router;

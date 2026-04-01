
import { Router } from "express";
import authRouter from "./auth";
import sessionsRouter from "./sessions";
import questionsRouter from "./questions";
import engagementRouter from "./engagement";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Authentication: register, login, get profile
router.use(authRouter);

// Sessions: create, join, start/pause/end, list participants
router.use(sessionsRouter);

// Questions: submit, list, answer
router.use(questionsRouter);

// Engagement: hand raise, pulse reactions, summary
router.use(engagementRouter);

export default router;

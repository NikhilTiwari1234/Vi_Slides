
import { Router } from "express";
import authRouter from "./auth";
import sessionsRouter from "./sessions";
import questionsRouter from "./questions";
import engagementRouter from "./engagement";
import pollsRouter from "./polls";
import chatRouter from "./chat";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});


router.use(authRouter);


router.use(sessionsRouter);


router.use(questionsRouter);


router.use(engagementRouter);


router.use(pollsRouter);
router.use(chatRouter);

export default router;

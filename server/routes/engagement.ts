

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../config/db";
import { participantsTable, engagementTable, usersTable } from "../models/index";
import { requireAuth } from "../middleware/auth";
import { getSocketServer } from "../socket/index";

const router = Router();

async function getEngagementSummary(sessionId: number) {
  const participants = await db
    .select({
      handRaised: participantsTable.handRaised,
      currentSignal: participantsTable.currentSignal,
      name: usersTable.name,
    })
    .from(participantsTable)
    .innerJoin(usersTable, eq(participantsTable.userId, usersTable.id))
    .where(eq(participantsTable.sessionId, sessionId));

  const raisedHands = participants.filter((p) => p.handRaised);

  return {
    raisedHands: raisedHands.length,
    raisedHandNames: raisedHands.map((p: { name: string }) => p.name),
    
    confused: participants.filter((p: { currentSignal: string | null }) => p.currentSignal === "confused").length,
    ok: participants.filter((p: { currentSignal: string | null }) => p.currentSignal === "ok").length,
    gotIt: participants.filter((p: { currentSignal: string | null }) => p.currentSignal === "got_it").length,
  };
}

// ─── POST /api/sessions/:sessionId/engagement ────────────────────────────────
router.post("/sessions/:sessionId/engagement", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const { type } = req.body;

  const validTypes = ["hand_raise", "hand_lower", "confused", "ok", "got_it"];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ error: "validation_error", message: "Invalid engagement type" });
    return;
  }

  
  await db.insert(engagementTable).values({ userId: req.user!.userId, sessionId, type });

  const userWhere = and(
    eq(participantsTable.userId, req.user!.userId),
    eq(participantsTable.sessionId, sessionId)
  );

  if (type === "hand_raise" || type === "hand_lower") {
    // Update hand-raise flag
    await db.update(participantsTable).set({ handRaised: type === "hand_raise" }).where(userWhere);
  } else {
    
    const [participant] = await db
      .select({ currentSignal: participantsTable.currentSignal })
      .from(participantsTable)
      .where(userWhere);

    const signalType = type as "confused" | "ok" | "got_it";
    const newSignal = participant?.currentSignal === signalType ? null : signalType;

    await db.update(participantsTable).set({ currentSignal: newSignal }).where(userWhere);
  }

  
  const summary = await getEngagementSummary(sessionId);
  const io = getSocketServer();
  if (io) {
    io.to(`session:${sessionId}`).emit("engagement:update", summary);
    io.to(`session:${sessionId}`).emit("hand:update", { userId: req.user!.userId, type });
  }

  res.json(summary);
});

// ─── GET /api/sessions/:sessionId/engagement/summary ─────────────────────────
router.get("/sessions/:sessionId/engagement/summary", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const summary = await getEngagementSummary(sessionId);
  res.json(summary);
});

export default router;

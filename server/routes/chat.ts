import { Router } from "express";
import { db } from "../config/db";
import { chatMessagesTable } from "../models/chatMessages";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET MESSAGES ─────────────────────────────
router.get("/sessions/:sessionId/chat", requireAuth, async (req, res) => {
  const sessionId = Number(req.params.sessionId);

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId));

  res.json(messages);
});

// ─── SEND MESSAGE ─────────────────────────────
router.post("/sessions/:sessionId/chat", requireAuth, async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const userId = req.user!.userId;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  const [newMessage] = await db
    .insert(chatMessagesTable)
    .values({
      sessionId,
      userId,
      message,
    })
    .returning();

  res.json(newMessage);
});

export default router;
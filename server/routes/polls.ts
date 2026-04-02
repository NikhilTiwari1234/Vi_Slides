/**
 * routes/polls.ts — Live Poll Routes
 *
 * POST /api/sessions/:sessionId/polls                       — Create a poll (teacher)
 * GET  /api/sessions/:sessionId/polls                       — List all polls for a session
 * GET  /api/sessions/:sessionId/polls/active                — Get the currently active poll
 * POST /api/sessions/:sessionId/polls/:pollId/activate      — Activate a poll (teacher)
 * POST /api/sessions/:sessionId/polls/:pollId/close         — Close a poll (teacher)
 * POST /api/sessions/:sessionId/polls/:pollId/respond       — Submit a vote (student)
 * GET  /api/sessions/:sessionId/polls/:pollId/results       — Get vote counts
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../config/db";
import { pollsTable, pollResponsesTable } from "../models/polls";
import { requireAuth } from "../middleware/auth";
import { getSocketServer } from "../socket/index";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a results payload: counts per option + total + per-user vote */
async function buildResults(pollId: number, requestUserId?: number) {
  const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId));
  if (!poll) return null;

  const responses = await db
    .select()
    .from(pollResponsesTable)
    .where(eq(pollResponsesTable.pollId, pollId));

  const options = poll.options as string[];
  const counts = new Array<number>(options.length).fill(0);
  for (const r of responses) {
    if (r.selectedOption >= 0 && r.selectedOption < options.length) {
      counts[r.selectedOption]++;
    }
  }

  const userVote =
    requestUserId != null
      ? (responses.find((r) => r.userId === requestUserId)?.selectedOption ?? null)
      : null;

  return {
    pollId: poll.id,
    sessionId: poll.sessionId,
    question: poll.question,
    options,
    status: poll.status,
    counts,
    total: responses.length,
    userVote,
  };
}

// ─── POST /api/sessions/:sessionId/polls ────────────────────────────────────
// Teacher creates a new poll (starts in 'draft' status)
router.post("/sessions/:sessionId/polls", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const { question, options } = req.body as { question: string; options: string[] };

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "validation_error", message: "question is required" });
    return;
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    res.status(400).json({ error: "validation_error", message: "polls require between 2 and 6 options" });
    return;
  }
  const cleanOptions = options.map((o: string) => String(o).trim()).filter(Boolean);
  if (cleanOptions.length < 2) {
    res.status(400).json({ error: "validation_error", message: "at least 2 non-empty options are required" });
    return;
  }

  const [poll] = await db
    .insert(pollsTable)
    .values({ sessionId, question: question.trim(), options: cleanOptions, status: "draft" })
    .returning();

  res.status(201).json(poll);
});

// ─── GET /api/sessions/:sessionId/polls ─────────────────────────────────────
// List all polls for a session (ordered newest first)
router.get("/sessions/:sessionId/polls", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);

  const polls = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.sessionId, sessionId))
    .orderBy(pollsTable.createdAt);

  res.json(polls);
});

// ─── GET /api/sessions/:sessionId/polls/active ──────────────────────────────
// Returns the one active poll (if any), or null
router.get("/sessions/:sessionId/polls/active", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const userId = req.user!.userId;

  const [active] = await db
    .select()
    .from(pollsTable)
    .where(and(eq(pollsTable.sessionId, sessionId), eq(pollsTable.status, "active")));

  if (!active) {
    res.json(null);
    return;
  }

  const results = await buildResults(active.id, userId);
  res.json(results);
});

// ─── POST /api/sessions/:sessionId/polls/:pollId/activate ───────────────────
// Teacher makes this poll live (closes any other active poll first)
router.post(
  "/sessions/:sessionId/polls/:pollId/activate",
  requireAuth,
  async (req, res): Promise<void> => {
    const sessionId = parseInt(req.params.sessionId as string, 10);
    const pollId = parseInt(req.params.pollId as string, 10);

    // Close any currently active poll in the same session
    await db
      .update(pollsTable)
      .set({ status: "closed" })
      .where(and(eq(pollsTable.sessionId, sessionId), eq(pollsTable.status, "active")));

    const [updated] = await db
      .update(pollsTable)
      .set({ status: "active" })
      .where(and(eq(pollsTable.id, pollId), eq(pollsTable.sessionId, sessionId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Poll not found" });
      return;
    }

    const results = await buildResults(pollId);
    const io = getSocketServer();
    if (io) {
      io.to(`session:${sessionId}`).emit("poll:new", { results });
    }

    res.json(updated);
  }
);

// ─── POST /api/sessions/:sessionId/polls/:pollId/close ──────────────────────
// Teacher closes the poll; final results are broadcast
router.post(
  "/sessions/:sessionId/polls/:pollId/close",
  requireAuth,
  async (req, res): Promise<void> => {
    const sessionId = parseInt(req.params.sessionId as string, 10);
    const pollId = parseInt(req.params.pollId as string, 10);

    const [updated] = await db
      .update(pollsTable)
      .set({ status: "closed" })
      .where(and(eq(pollsTable.id, pollId), eq(pollsTable.sessionId, sessionId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Poll not found" });
      return;
    }

    const results = await buildResults(pollId);
    const io = getSocketServer();
    if (io) {
      io.to(`session:${sessionId}`).emit("poll:close", { results });
    }

    res.json(updated);
  }
);

// ─── POST /api/sessions/:sessionId/polls/:pollId/respond ────────────────────
// Student submits their vote (one vote per poll — update if already voted)
router.post(
  "/sessions/:sessionId/polls/:pollId/respond",
  requireAuth,
  async (req, res): Promise<void> => {
    const sessionId = parseInt(req.params.sessionId as string, 10);
    const pollId = parseInt(req.params.pollId as string, 10);
    const userId = req.user!.userId;
    const { selectedOption } = req.body as { selectedOption: number };

    if (typeof selectedOption !== "number" || selectedOption < 0) {
      res.status(400).json({ error: "validation_error", message: "selectedOption must be a non-negative integer" });
      return;
    }

    // Make sure the poll exists and is active
    const [poll] = await db
      .select()
      .from(pollsTable)
      .where(and(eq(pollsTable.id, pollId), eq(pollsTable.sessionId, sessionId)));

    if (!poll) {
      res.status(404).json({ error: "not_found", message: "Poll not found" });
      return;
    }
    if (poll.status !== "active") {
      res.status(400).json({ error: "bad_request", message: "This poll is not currently active" });
      return;
    }

    const options = poll.options as string[];
    if (selectedOption >= options.length) {
      res.status(400).json({ error: "validation_error", message: "selectedOption is out of range" });
      return;
    }

    // Upsert: update vote if the user already responded
    const [existing] = await db
      .select()
      .from(pollResponsesTable)
      .where(and(eq(pollResponsesTable.pollId, pollId), eq(pollResponsesTable.userId, userId)));

    if (existing) {
      await db
        .update(pollResponsesTable)
        .set({ selectedOption })
        .where(eq(pollResponsesTable.id, existing.id));
    } else {
      await db
        .insert(pollResponsesTable)
        .values({ pollId, sessionId, userId, selectedOption });
    }

    const results = await buildResults(pollId, userId);

    // Broadcast updated results to everyone in the session room
    const io = getSocketServer();
    if (io) {
      io.to(`session:${sessionId}`).emit("poll:response", { results });
    }

    res.json(results);
  }
);

// ─── GET /api/sessions/:sessionId/polls/:pollId/results ─────────────────────
// Get current vote counts for a poll
router.get(
  "/sessions/:sessionId/polls/:pollId/results",
  requireAuth,
  async (req, res): Promise<void> => {
    const sessionId = parseInt(req.params.sessionId as string, 10);
    const pollId = parseInt(req.params.pollId as string, 10);
    const userId = req.user!.userId;

    const results = await buildResults(pollId, userId);
    if (!results || results.sessionId !== sessionId) {
      res.status(404).json({ error: "not_found", message: "Poll not found" });
      return;
    }

    res.json(results);
  }
);

export default router;

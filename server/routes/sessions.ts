

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../config/db";
import { sessionsTable, participantsTable, usersTable } from "../models/index";
import { requireAuth, requireTeacher } from "../middleware/auth";
import { getSocketServer } from "../socket/index";

const router = Router();


function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


export async function getParticipantsWithNames(sessionId: number) {
  return db
    .select({
      id: participantsTable.id,
      userId: participantsTable.userId,
      sessionId: participantsTable.sessionId,
      handRaised: participantsTable.handRaised,
      joinedAt: participantsTable.joinedAt,
      name: usersTable.name,
    })
    .from(participantsTable)
    .innerJoin(usersTable, eq(participantsTable.userId, usersTable.id))
    .where(eq(participantsTable.sessionId, sessionId));
}

// ─── POST /api/sessions ───────────────────────────────────────────────────────
router.post("/sessions", requireAuth, requireTeacher, async (req, res): Promise<void> => {
  const { title } = req.body;

  if (!title) {
    res.status(400).json({ error: "validation_error", message: "Session title is required" });
    return;
  }

  // Generate a unique 6-digit code (retry up to 10 times to avoid collisions)
  let code = generateSessionCode();
  for (let i = 0; i < 10; i++) {
    const [existing] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.code, code), eq(sessionsTable.status, "waiting")));
    if (!existing) break;
    code = generateSessionCode();
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({ title, code, status: "waiting", teacherId: req.user!.userId })
    .returning();

  res.status(201).json(session);
});

// ─── GET /api/sessions/my ────────────────────────────────────────────────────
router.get("/sessions/my", requireAuth, async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.teacherId, req.user!.userId))
    .orderBy(sessionsTable.createdAt);

  res.json(sessions);
});

// ─── POST /api/sessions/join ─────────────────────────────────────────────────
router.post("/sessions/join", requireAuth, async (req, res): Promise<void> => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "validation_error", message: "Session code is required" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.code, code));

  if (!session) {
    res.status(404).json({ error: "not_found", message: "No session found with that code" });
    return;
  }
  if (session.status === "ended") {
    res.status(400).json({ error: "bad_request", message: "This session has already ended" });
    return;
  }

  
  const [existing] = await db
    .select()
    .from(participantsTable)
    .where(
      and(
        eq(participantsTable.userId, req.user!.userId),
        eq(participantsTable.sessionId, session.id)
      )
    );

  if (!existing) {
    await db.insert(participantsTable).values({
      userId: req.user!.userId,
      sessionId: session.id,
      handRaised: false,
    });

    
    const io = getSocketServer();
    if (io) {
      const participants = await getParticipantsWithNames(session.id);
      io.to(`session:${session.id}`).emit("session:update", { participants });
    }
  }

  res.json(session);
});

// ─── GET /api/sessions/:sessionId ────────────────────────────────────────────
router.get("/sessions/:sessionId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  res.json(session);
});

// ─── POST /api/sessions/:sessionId/start ─────────────────────────────────────
router.post("/sessions/:sessionId/start", requireAuth, requireTeacher, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.teacherId, req.user!.userId)));

  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({ status: "active" })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

    
  const io = getSocketServer();
  if (io) io.to(`session:${sessionId}`).emit("session:update", { session: updated });

  res.json(updated);
});

// ─── POST /api/sessions/:sessionId/pause ─────────────────────────────────────
router.post("/sessions/:sessionId/pause", requireAuth, requireTeacher, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.teacherId, req.user!.userId)));

  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  
  const newStatus = session.status === "paused" ? "active" : "paused";

  const [updated] = await db
    .update(sessionsTable)
    .set({ status: newStatus })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  const io = getSocketServer();
  if (io) io.to(`session:${sessionId}`).emit("session:update", { session: updated });

  res.json(updated);
});

// ─── POST /api/sessions/:sessionId/end ───────────────────────────────────────
router.post("/sessions/:sessionId/end", requireAuth, requireTeacher, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.teacherId, req.user!.userId)));

  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({ status: "ended" })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  const io = getSocketServer();
  if (io) io.to(`session:${sessionId}`).emit("session:update", { session: updated });

  res.json(updated);
});

// ─── GET /api/sessions/:sessionId/participants ────────────────────────────────
router.get("/sessions/:sessionId/participants", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const participants = await getParticipantsWithNames(sessionId);
  res.json(participants);
});

export default router;

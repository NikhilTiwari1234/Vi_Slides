import { Router } from "express";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../config/db";
import { questionsTable, sessionsTable, usersTable } from "../models/index";
import { requireAuth } from "../middleware/auth";
import { classifyQuestion, generateAnswer, findSimilarQuestion } from "../services/ai";
import { getSocketServer } from "../socket/index";

const router = Router();

async function getQuestionWithStudentName(questionId: number) {
  const [row] = await db
    .select({
      id: questionsTable.id,
      sessionId: questionsTable.sessionId,
      studentId: questionsTable.studentId,
      text: questionsTable.text,
      type: questionsTable.type,
      status: questionsTable.status,
      answer: questionsTable.answer,
      answeredBy: questionsTable.answeredBy,
      mergedIntoId: questionsTable.mergedIntoId,
      duplicateCount: questionsTable.duplicateCount,
      createdAt: questionsTable.createdAt,
      upvotes: questionsTable.upvotes, // ⭐ ADDED
      sentiment: questionsTable.sentiment, // ⭐ ADDED
      studentName: usersTable.name,
    })
    .from(questionsTable)
    .innerJoin(usersTable, eq(questionsTable.studentId, usersTable.id))
    .where(eq(questionsTable.id, questionId));
  return row;
}

// ─── GET QUESTIONS ─────────────────────────────────────────────
router.get("/sessions/:sessionId/questions", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);

  const rows = await db
    .select({
      id: questionsTable.id,
      sessionId: questionsTable.sessionId,
      studentId: questionsTable.studentId,
      text: questionsTable.text,
      type: questionsTable.type,
      status: questionsTable.status,
      answer: questionsTable.answer,
      answeredBy: questionsTable.answeredBy,
      mergedIntoId: questionsTable.mergedIntoId,
      duplicateCount: questionsTable.duplicateCount,
      createdAt: questionsTable.createdAt,
      upvotes: questionsTable.upvotes, // ⭐ ADDED
      sentiment: questionsTable.sentiment, // ⭐ ADDED
      studentName: usersTable.name,
    })
    .from(questionsTable)
    .innerJoin(usersTable, eq(questionsTable.studentId, usersTable.id))
    .where(eq(questionsTable.sessionId, sessionId))
    .orderBy(questionsTable.createdAt);

  res.json(rows);
});

// ─── CREATE QUESTION ───────────────────────────────────────────
router.post("/sessions/:sessionId/questions", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "validation_error", message: "Question text is required" });
    return;
  }

  // ⭐ SENTIMENT LOGIC
  const lowerText = text.toLowerCase();
  let sentiment: "positive" | "neutral" | "negative" = "neutral";

  if (
    lowerText.includes("not understand") ||
    lowerText.includes("confused") ||
    lowerText.includes("doubt") ||
    lowerText.includes("hard")
  ) {
    sentiment = "negative";
  } else if (
    lowerText.includes("clear") ||
    lowerText.includes("easy") ||
    lowerText.includes("understood") ||
    lowerText.includes("good")
  ) {
    sentiment = "positive";
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }
  if (session.status !== "active") {
    res.status(400).json({ error: "bad_request", message: "Questions can only be submitted when the session is active" });
    return;
  }

  const existingQuestions = await db
    .select({ id: questionsTable.id, text: questionsTable.text })
    .from(questionsTable)
    .where(and(eq(questionsTable.sessionId, sessionId), isNull(questionsTable.mergedIntoId)));

  const [questionType, similarId] = await Promise.all([
    classifyQuestion(text.trim()),
    findSimilarQuestion(text.trim(), existingQuestions),
  ]);

  if (similarId) {
    const [original] = await db.select().from(questionsTable).where(eq(questionsTable.id, similarId));

    await db
      .update(questionsTable)
      .set({ duplicateCount: (original?.duplicateCount ?? 0) + 1 })
      .where(eq(questionsTable.id, similarId));

    const [newQuestion] = await db
      .insert(questionsTable)
      .values({
        sessionId,
        studentId: req.user!.userId,
        text: text.trim(),
        type: questionType,
        status: "merged",
        mergedIntoId: similarId,
        duplicateCount: 0,
        sentiment, // ⭐ ADDED
      })
      .returning();

    const updatedOriginal = await getQuestionWithStudentName(original!.id);
    const io = getSocketServer();
    if (io) {
      io.to(`session:${sessionId}`).emit("questions:new", {
        merged: true,
        originalId: similarId,
        updatedQuestion: updatedOriginal,
      });
    }

    const questionWithName = await getQuestionWithStudentName(newQuestion.id);
    res.status(201).json(questionWithName);
    return;
  }

  let answer: string | null = null;
  let answeredBy: "ai" | "teacher" | null = null;
  let status: "pending" | "answered" = "pending";

  if (questionType === "simple") {
    answer = await generateAnswer(text.trim());
    if (answer) {
      answeredBy = "ai";
      status = "answered";
    }
  }

  const [newQuestion] = await db
    .insert(questionsTable)
    .values({
      sessionId,
      studentId: req.user!.userId,
      text: text.trim(),
      type: questionType,
      status,
      answer,
      answeredBy,
      duplicateCount: 0,
      sentiment, // ⭐ ADDED
    })
    .returning();

  const questionWithName = await getQuestionWithStudentName(newQuestion.id);

  const io = getSocketServer();
  if (io) io.to(`session:${sessionId}`).emit("questions:new", { question: questionWithName });

  res.status(201).json(questionWithName);
});

// ─── ANSWER QUESTION ───────────────────────────────────────────
router.post("/sessions/:sessionId/questions/:questionId/answer", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const questionId = parseInt(req.params.questionId as string, 10);
  const { answer, answeredBy } = req.body;

  if (!answer || !answeredBy) {
    res.status(400).json({ error: "validation_error", message: "answer and answeredBy are required" });
    return;
  }

  const [updated] = await db
    .update(questionsTable)
    .set({ answer, answeredBy, status: "answered" })
    .where(and(eq(questionsTable.id, questionId), eq(questionsTable.sessionId, sessionId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Question not found" });
    return;
  }

  const questionWithName = await getQuestionWithStudentName(updated.id);

  const io = getSocketServer();
  if (io) io.to(`session:${sessionId}`).emit("questions:new", { updated: questionWithName });

  res.json(questionWithName);
});

// ─── UPVOTE QUESTION ───────────────────────────────────────────
router.post(
  "/sessions/:sessionId/questions/:questionId/upvote",
  requireAuth,
  async (req, res): Promise<void> => {
    const sessionId = parseInt(req.params.sessionId as string, 10);
    const questionId = parseInt(req.params.questionId as string, 10);

    try {
      await db
        .update(questionsTable)
        .set({
          upvotes: sql`${questionsTable.upvotes} + 1`,
        })
        .where(
          and(
            eq(questionsTable.id, questionId),
            eq(questionsTable.sessionId, sessionId)
          )
        );

      const updated = await getQuestionWithStudentName(questionId);

      const io = getSocketServer();
      if (io) {
        io.to(`session:${sessionId}`).emit("questions:new", {
          updated,
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to upvote" });
    }
  }
);

export default router;
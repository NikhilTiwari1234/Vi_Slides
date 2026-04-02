import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { usersTable } from "../models/index";
import { requireAuth, generateToken } from "../middleware/auth";

const router = Router();

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  try {
    console.log("REGISTER BODY:", req.body);

    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      res
        .status(400)
        .json({
          error: "validation_error",
          message: "All fields are required",
        });
      return;
    }

    if (!["teacher", "student"].includes(role)) {
      res
        .status(400)
        .json({
          error: "validation_error",
          message: "Role must be 'teacher' or 'student'",
        });
      return;
    }

    if (password.length < 6) {
      res
        .status(400)
        .json({
          error: "validation_error",
          message: "Password must be at least 6 characters",
        });
      return;
    }

    // Check existing user
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    if (existing) {
      res
        .status(409)
        .json({ error: "conflict", message: "Email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const [newUser] = await db
      .insert(usersTable)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
      })
      .returning();

    const token = generateToken(
      newUser.id,
      newUser.role as "teacher" | "student",
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      error: "server_error",
      message: err.message || "Something went wrong",
    });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      res
        .status(400)
        .json({
          error: "validation_error",
          message: "Email and password required",
        });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    if (!user) {
      res
        .status(401)
        .json({ error: "unauthorized", message: "Invalid credentials" });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      res
        .status(401)
        .json({ error: "unauthorized", message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user.id, user.role as "teacher" | "student");

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      error: "server_error",
      message: err.message || "Something went wrong",
    });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));

    if (!user) {
      res
        .status(401)
        .json({ error: "unauthorized", message: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    console.error("ME ERROR:", err);
    res.status(500).json({
      error: "server_error",
      message: err.message || "Something went wrong",
    });
  }
});

export default router;

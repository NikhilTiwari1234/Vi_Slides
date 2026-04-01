

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: number;
  role: "teacher" | "student";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "vi-slides-secret-key-change-me";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded; 
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
  }
}


export function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "teacher") {
    res.status(403).json({ error: "forbidden", message: "Only teachers can do this" });
    return;
  }
  next();
}


export function generateToken(userId: number, role: "teacher" | "student"): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

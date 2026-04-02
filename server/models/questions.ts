

import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),

  sessionId: integer("session_id")
    .notNull()
    .references(() => sessionsTable.id),

  studentId: integer("student_id")
    .notNull()
    .references(() => usersTable.id),

  text: text("text").notNull(),

  type: text("type", { enum: ["simple", "complex"] })
    .notNull()
    .default("simple"),

  status: text("status", { enum: ["pending", "answered", "merged"] })
    .notNull()
    .default("pending"),

  answer: text("answer"),

  answeredBy: text("answered_by", { enum: ["teacher", "ai"] }),

  mergedIntoId: integer("merged_into_id"),

  duplicateCount: integer("duplicate_count")
    .notNull()
    .default(0),

  
  upvotes: integer("upvotes").notNull().default(0),

  
  sentiment: text("sentiment", {
    enum: ["positive", "neutral", "negative"],
  })
    .notNull()
    .default("neutral"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Question = typeof questionsTable.$inferSelect;
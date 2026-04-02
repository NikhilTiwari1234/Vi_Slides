/**
 * models/polls.ts — Live Poll Tables
 *
 * polls         — one poll per teacher-launched question (belongs to a session)
 * pollResponses — one row per student vote (unique per student per poll)
 */

import { pgTable, serial, integer, text, json, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  // Array of option strings, e.g. ["Yes", "No", "Maybe"]
  options: json("options").$type<string[]>().notNull(),
  // 'draft'  — just created, not yet visible to students
  // 'active' — currently open for student votes
  // 'closed' — voting finished, results are visible
  status: text("status").$type<"draft" | "active" | "closed">().notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pollResponsesTable = pgTable("poll_responses", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id")
    .notNull()
    .references(() => pollsTable.id, { onDelete: "cascade" }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // 0-based index into the options array
  selectedOption: integer("selected_option").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

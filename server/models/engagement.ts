

import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const engagementTable = pgTable("engagement", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),

  type: text("type", { enum: ["hand_raise", "hand_lower", "confused", "ok", "got_it"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Engagement = typeof engagementTable.$inferSelect;

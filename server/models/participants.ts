

import { pgTable, serial, timestamp, integer, boolean, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const participantsTable = pgTable("participants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  
  handRaised: boolean("hand_raised").notNull().default(false),
  
  currentSignal: text("current_signal", { enum: ["confused", "ok", "got_it"] }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Participant = typeof participantsTable.$inferSelect;

import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),

  sessionId: integer("session_id")
    .notNull()
    .references(() => sessionsTable.id),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),

  message: text("message").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

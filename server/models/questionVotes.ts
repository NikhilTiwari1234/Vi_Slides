import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { questionsTable } from "./questions";
import { usersTable } from "./users";

export const questionVotesTable = pgTable("question_votes", {
  id: serial("id").primaryKey(),

  questionId: integer("question_id")
    .notNull()
    .references(() => questionsTable.id),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
});
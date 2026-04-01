

import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  
  code: text("code").notNull().unique(),
  
  status: text("status", { enum: ["waiting", "active", "paused", "ended"] })
    .notNull()
    .default("waiting"),
    
  teacherId: integer("teacher_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Session = typeof sessionsTable.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scans = pgTable("scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, scanning, completed, failed
  vulnerabilities: jsonb("vulnerabilities").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScanSchema = createInsertSchema(scans).pick({
  url: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  message: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export interface Vulnerability {
  id: string;
  name: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  location: string;
  impact: string;
  category: "SQL Injection" | "XSS" | "CSRF" | "API Issues" | "Load Testing";
}

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const scans = pgTable("scans", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    url: text("url").notNull(),
    status: text("status").notNull().default("pending"),
    vulnerabilities: jsonb("vulnerabilities").default(sql `'[]'::jsonb`),
    pagesScanned: integer("pages_scanned").default(0),
    formsFound: integer("forms_found").default(0), // <-- ADD THIS
    endpointsTested: integer("endpoints_tested").default(0), // <-- ADD THIS
    crawlStats: jsonb("crawl_stats").default(sql `'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});
export const chatMessages = pgTable("chat_messages", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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

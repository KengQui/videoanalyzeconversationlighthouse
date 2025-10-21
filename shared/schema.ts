import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Framework content schema - represents rows from the uploaded Excel
export const frameworkContent = pgTable("framework_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rowData: json("row_data").notNull(), // Flexible JSON storage for any Excel structure
});

export const insertFrameworkContentSchema = createInsertSchema(frameworkContent).pick({
  rowData: true,
});

export type InsertFrameworkContent = z.infer<typeof insertFrameworkContentSchema>;
export type FrameworkContent = typeof frameworkContent.$inferSelect;

// Chat message schema
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// TypeScript interfaces for Excel data structure
export interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export interface ExcelData {
  headers: string[];
  rows: ExcelRow[];
}

// API response types
export interface UploadResponse {
  success: boolean;
  message: string;
  data?: ExcelData;
}

export interface ChatRequest {
  message: string;
  context?: ExcelData;
}

export interface ChatResponse {
  message: string;
  timestamp: string;
}

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Framework content schema - represents rows from the uploaded Excel
export const frameworkContent = pgTable("framework_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rowData: json("row_data").notNull(), // Flexible JSON storage for any Excel structure
});

// Video analyses schema - stores saved video analysis results
export const videoAnalyses = pgTable("video_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoFileName: text("video_file_name").notNull(),
  milestone: integer("milestone").notNull(),
  evaluations: json("evaluations").notNull(), // Array of CriterionEvaluation
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  averageRating: real("average_rating").notNull(),
  agentSpecId: varchar("agent_spec_id"), // Optional reference to agent spec used
  agentSpecName: text("agent_spec_name"), // Name of the agent spec (denormalized for convenience)
  domainEvaluation: json("domain_evaluation"), // Optional domain-specific evaluation results
});

// Agent specifications schema - stores agent spec documents for domain-specific evaluation
export const agentSpecs = pgTable("agent_specs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  specContent: text("spec_content").notNull(), // Full text content of the spec document
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
});

export const insertFrameworkContentSchema = createInsertSchema(frameworkContent).pick({
  rowData: true,
});

export type InsertFrameworkContent = z.infer<typeof insertFrameworkContentSchema>;
export type FrameworkContent = typeof frameworkContent.$inferSelect;

export const insertVideoAnalysisSchema = createInsertSchema(videoAnalyses).omit({
  id: true,
  timestamp: true,
});

export type InsertVideoAnalysis = z.infer<typeof insertVideoAnalysisSchema>;
export type VideoAnalysis = typeof videoAnalyses.$inferSelect;

export const insertAgentSpecSchema = createInsertSchema(agentSpecs).omit({
  id: true,
  uploadDate: true,
});

export type InsertAgentSpec = z.infer<typeof insertAgentSpecSchema>;
export type AgentSpec = typeof agentSpecs.$inferSelect;

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

// Conversation Design Examples schema
export interface ConversationExample {
  id: string;
  principle: string; // e.g., "Clarity", "Brevity", "Context Awareness"
  badExample: string;
  whyItsBad: string;
  goodExample: string | null; // null means "Need user input"
  score?: string; // e.g., "2/5"
  additionalNotes?: string;
  source?: string; // e.g., "Pay period configuration agent", "Retirement agent"
}

export interface ExamplesData {
  examples: ConversationExample[];
}

export interface ExampleMatchCriteria {
  rowText: string; // Text in the row that matches this example
  enabled: boolean; // Whether to show the book icon for this row
}

// Video Analysis schema
export interface CriterionEvaluation {
  criterion: string; // The criterion name from the framework
  rating: number; // 1-5 rating
  feedback: string; // Detailed feedback for this criterion
}

export interface VideoAnalysisRequest {
  milestone: number; // 1, 2, 3, or 4
}

export interface VideoAnalysisResult {
  success: boolean;
  milestone: number;
  evaluations: CriterionEvaluation[];
  agentSpecName?: string; // Name of agent spec if domain evaluation was performed
  domainEvaluation?: DomainEvaluation; // Domain-specific evaluation results
  error?: string;
}

// Saved Video Analysis schema
export interface SavedVideoAnalysis {
  id: string;
  videoFileName: string;
  milestone: number;
  evaluations: CriterionEvaluation[];
  timestamp: string;
  averageRating: number;
  agentSpecId?: string; // Optional link to agent spec used for analysis
  agentSpecName?: string; // Name of the agent spec
  domainEvaluation?: DomainEvaluation; // Domain-specific evaluation results
}

// Domain-specific evaluation results
export interface DomainEvaluation {
  specName: string;
  overallCompliance: number; // 1-5 rating for overall spec compliance
  findings: DomainFinding[];
}

export interface DomainFinding {
  category: string; // e.g., "Question Flow", "Conditional Logic", "Auto-Detection"
  status: "pass" | "fail" | "partial"; // Compliance status
  details: string; // Detailed explanation with examples
  severity?: "critical" | "major" | "minor"; // How important is this issue
}

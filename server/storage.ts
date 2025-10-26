import type { ChatMessage, InsertChatMessage, ExcelData, ConversationExample, ExamplesData, SavedVideoAnalysis, CriterionEvaluation, AgentSpec, InsertAgentSpec, DomainEvaluation } from "@shared/schema";
import { videoAnalyses, agentSpecs } from "@shared/schema";
import { randomUUID } from "crypto";
import { INITIAL_FRAMEWORK_DATA } from "./framework-data";
import { INITIAL_EXAMPLES_DATA } from "./examples-data";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Framework data
  setFrameworkData(data: ExcelData): Promise<void>;
  getFrameworkData(): Promise<ExcelData | null>;
  clearFrameworkData(): Promise<void>;

  // Chat messages
  getChatMessages(): Promise<ChatMessage[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(): Promise<void>;

  // Conversation examples
  getExamples(): Promise<ExamplesData>;
  getExampleByPrinciple(principle: string): Promise<ConversationExample | null>;
  getExamplesByPrinciple(principle: string): Promise<ConversationExample[]>;
  updateExample(id: string, example: Partial<ConversationExample>): Promise<ConversationExample | null>;
  addExample(example: Omit<ConversationExample, 'id'>): Promise<ConversationExample>;

  // Video analyses
  saveVideoAnalysis(
    videoFileName: string,
    milestone: number,
    evaluations: CriterionEvaluation[],
    agentSpecId?: string,
    agentSpecName?: string,
    domainEvaluation?: DomainEvaluation
  ): Promise<SavedVideoAnalysis>;
  getVideoAnalyses(): Promise<SavedVideoAnalysis[]>;
  getVideoAnalysisById(id: string): Promise<SavedVideoAnalysis | null>;
  deleteVideoAnalysis(id: string): Promise<boolean>;

  // Agent specs
  createAgentSpec(spec: InsertAgentSpec): Promise<AgentSpec>;
  getAllAgentSpecs(): Promise<AgentSpec[]>;
  getAgentSpecById(id: string): Promise<AgentSpec | null>;
  getAgentSpecByName(name: string): Promise<AgentSpec | null>;
  updateAgentSpec(id: string, spec: Partial<InsertAgentSpec>): Promise<AgentSpec | null>;
  deleteAgentSpec(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private frameworkData: ExcelData | null = INITIAL_FRAMEWORK_DATA;
  private chatMessages: Map<string, ChatMessage> = new Map();
  private examplesData: Map<string, ConversationExample> = new Map();

  async setFrameworkData(data: ExcelData): Promise<void> {
    this.frameworkData = data;
  }

  async getFrameworkData(): Promise<ExcelData | null> {
    return this.frameworkData;
  }

  async clearFrameworkData(): Promise<void> {
    this.frameworkData = null;
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values());
  }

  async addChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = { ...insertMessage, id };
    this.chatMessages.set(id, message);
    return message;
  }

  async clearChatMessages(): Promise<void> {
    this.chatMessages.clear();
  }

  async getExamples(): Promise<ExamplesData> {
    return { examples: Array.from(this.examplesData.values()) };
  }

  async getExampleByPrinciple(principle: string): Promise<ConversationExample | null> {
    const examples = Array.from(this.examplesData.values());
    return examples.find(e => e.principle.toLowerCase() === principle.toLowerCase()) || null;
  }

  async getExamplesByPrinciple(principle: string): Promise<ConversationExample[]> {
    const examples = Array.from(this.examplesData.values());
    return examples.filter(e => e.principle.toLowerCase() === principle.toLowerCase());
  }

  async updateExample(id: string, updates: Partial<ConversationExample>): Promise<ConversationExample | null> {
    const existing = this.examplesData.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.examplesData.set(id, updated);
    return updated;
  }

  async addExample(example: Omit<ConversationExample, 'id'>): Promise<ConversationExample> {
    const id = randomUUID();
    const newExample = { ...example, id };
    this.examplesData.set(id, newExample);
    return newExample;
  }

  async saveVideoAnalysis(
    videoFileName: string,
    milestone: number,
    evaluations: CriterionEvaluation[],
    agentSpecId?: string,
    agentSpecName?: string,
    domainEvaluation?: DomainEvaluation
  ): Promise<SavedVideoAnalysis> {
    const averageRating = evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length;
    
    const [saved] = await db.insert(videoAnalyses).values({
      videoFileName,
      milestone,
      evaluations: evaluations as any, // JSON column
      averageRating: parseFloat(averageRating.toFixed(1)),
      agentSpecId: agentSpecId || null,
      agentSpecName: agentSpecName || null,
      domainEvaluation: domainEvaluation as any || null
    }).returning();
    
    const domainInfo = agentSpecName ? ` with domain spec: ${agentSpecName}` : "";
    console.log(`💾 Saved video analysis to database: ${videoFileName} (Milestone ${milestone})${domainInfo} - ${evaluations.length} evaluations`);
    
    return {
      id: saved.id,
      videoFileName: saved.videoFileName,
      milestone: saved.milestone,
      evaluations: saved.evaluations as CriterionEvaluation[],
      timestamp: saved.timestamp.toISOString(),
      averageRating: saved.averageRating,
      agentSpecId: saved.agentSpecId || undefined,
      agentSpecName: saved.agentSpecName || undefined,
      domainEvaluation: (saved.domainEvaluation as DomainEvaluation) || undefined
    };
  }

  async getVideoAnalyses(): Promise<SavedVideoAnalysis[]> {
    const analyses = await db.select().from(videoAnalyses).orderBy(desc(videoAnalyses.timestamp));
    
    return analyses.map(a => ({
      id: a.id,
      videoFileName: a.videoFileName,
      milestone: a.milestone,
      evaluations: a.evaluations as CriterionEvaluation[],
      timestamp: a.timestamp.toISOString(),
      averageRating: a.averageRating,
      agentSpecId: a.agentSpecId || undefined,
      agentSpecName: a.agentSpecName || undefined,
      domainEvaluation: (a.domainEvaluation as DomainEvaluation) || undefined
    }));
  }

  async getVideoAnalysisById(id: string): Promise<SavedVideoAnalysis | null> {
    const [analysis] = await db.select().from(videoAnalyses).where(eq(videoAnalyses.id, id));
    
    if (!analysis) return null;
    
    return {
      id: analysis.id,
      videoFileName: analysis.videoFileName,
      milestone: analysis.milestone,
      evaluations: analysis.evaluations as CriterionEvaluation[],
      timestamp: analysis.timestamp.toISOString(),
      averageRating: analysis.averageRating,
      agentSpecId: analysis.agentSpecId || undefined,
      agentSpecName: analysis.agentSpecName || undefined,
      domainEvaluation: (analysis.domainEvaluation as DomainEvaluation) || undefined
    };
  }

  async deleteVideoAnalysis(id: string): Promise<boolean> {
    const result = await db.delete(videoAnalyses).where(eq(videoAnalyses.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createAgentSpec(spec: InsertAgentSpec): Promise<AgentSpec> {
    const [created] = await db.insert(agentSpecs).values(spec).returning();
    console.log(`✅ Created agent spec: ${created.name}`);
    return created;
  }

  async getAllAgentSpecs(): Promise<AgentSpec[]> {
    return await db.select().from(agentSpecs).orderBy(desc(agentSpecs.uploadDate));
  }

  async getAgentSpecById(id: string): Promise<AgentSpec | null> {
    const [spec] = await db.select().from(agentSpecs).where(eq(agentSpecs.id, id));
    return spec || null;
  }

  async getAgentSpecByName(name: string): Promise<AgentSpec | null> {
    const [spec] = await db.select().from(agentSpecs).where(eq(agentSpecs.name, name));
    return spec || null;
  }

  async updateAgentSpec(id: string, updates: Partial<InsertAgentSpec>): Promise<AgentSpec | null> {
    const [updated] = await db
      .update(agentSpecs)
      .set(updates)
      .where(eq(agentSpecs.id, id))
      .returning();
    
    if (updated) {
      console.log(`✅ Updated agent spec: ${updated.name}`);
    }
    return updated || null;
  }

  async deleteAgentSpec(id: string): Promise<boolean> {
    const result = await db.delete(agentSpecs).where(eq(agentSpecs.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  constructor() {
    // Initialize with example data
    if (INITIAL_EXAMPLES_DATA && INITIAL_EXAMPLES_DATA.examples) {
      INITIAL_EXAMPLES_DATA.examples.forEach(ex => {
        this.examplesData.set(ex.id, ex);
      });
    }
  }
}

export const storage = new MemStorage();

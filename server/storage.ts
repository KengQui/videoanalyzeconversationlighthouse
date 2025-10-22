import type { ChatMessage, InsertChatMessage, ExcelData, ConversationExample, ExamplesData } from "@shared/schema";
import { randomUUID } from "crypto";
import { INITIAL_FRAMEWORK_DATA } from "./framework-data";
import { INITIAL_EXAMPLES_DATA } from "./examples-data";

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

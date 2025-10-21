import type { ChatMessage, InsertChatMessage, ExcelData } from "@shared/schema";
import { randomUUID } from "crypto";
import { INITIAL_FRAMEWORK_DATA } from "./framework-data";

export interface IStorage {
  // Framework data
  setFrameworkData(data: ExcelData): Promise<void>;
  getFrameworkData(): Promise<ExcelData | null>;
  clearFrameworkData(): Promise<void>;

  // Chat messages
  getChatMessages(): Promise<ChatMessage[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(): Promise<void>;
}

export class MemStorage implements IStorage {
  private frameworkData: ExcelData | null = INITIAL_FRAMEWORK_DATA;
  private chatMessages: Map<string, ChatMessage> = new Map();

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
}

export const storage = new MemStorage();

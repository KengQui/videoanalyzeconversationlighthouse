import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatWithFramework } from "./gemini";
import type { ChatRequest, ChatResponse } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get current framework data
  app.get("/api/framework", async (req, res) => {
    try {
      const data = await storage.getFrameworkData();
      res.json(data);
    } catch (error) {
      console.error("Get framework error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve framework data" });
    }
  });

  // Chat with AI about framework
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body as ChatRequest;

      if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      // Get framework context if not provided
      let frameworkContext = context;
      if (!frameworkContext) {
        frameworkContext = (await storage.getFrameworkData()) || undefined;
      }

      // Get AI response
      const aiResponse = await chatWithFramework(message, frameworkContext);

      const chatResponse: ChatResponse = {
        message: aiResponse,
        timestamp: new Date().toISOString(),
      };

      // Store messages
      await storage.addChatMessage({
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });

      await storage.addChatMessage({
        role: "assistant",
        content: aiResponse,
        timestamp: chatResponse.timestamp,
      });

      res.json(chatResponse);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process chat request",
      });
    }
  });

  // Get chat history
  app.get("/api/chat/history", async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json({ success: true, data: messages });
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

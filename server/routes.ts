import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatWithFramework } from "./gemini";
import type { ChatRequest, ChatResponse, ConversationExample } from "@shared/schema";

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

  // Get all examples
  app.get("/api/examples", async (req, res) => {
    try {
      const examples = await storage.getExamples();
      res.json({ success: true, data: examples });
    } catch (error) {
      console.error("Get examples error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve examples" });
    }
  });

  // Get example by principle
  app.get("/api/examples/principle/:principle", async (req, res) => {
    try {
      const { principle } = req.params;
      const example = await storage.getExampleByPrinciple(principle);
      if (!example) {
        return res.status(404).json({ success: false, message: "Example not found for this principle" });
      }
      res.json({ success: true, data: example });
    } catch (error) {
      console.error("Get example by principle error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve example" });
    }
  });

  // Update example
  app.put("/api/examples/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body as Partial<ConversationExample>;
      const updated = await storage.updateExample(id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, message: "Example not found" });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Update example error:", error);
      res.status(500).json({ success: false, message: "Failed to update example" });
    }
  });

  // Add new example
  app.post("/api/examples", async (req, res) => {
    try {
      const example = req.body as Omit<ConversationExample, 'id'>;
      if (!example.principle || !example.badExample || !example.whyItsBad) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: principle, badExample, whyItsBad" 
        });
      }
      const newExample = await storage.addExample(example);
      res.json({ success: true, data: newExample });
    } catch (error) {
      console.error("Add example error:", error);
      res.status(500).json({ success: false, message: "Failed to add example" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

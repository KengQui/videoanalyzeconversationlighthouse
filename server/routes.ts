import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as fs from "fs/promises";
import * as path from "path";
import { storage } from "./storage";
import { chatWithFramework } from "./gemini";
import { compressVideo, analyzeVideoWithGemini, isValidVideo } from "./video-analysis";
import type { ChatRequest, ChatResponse, ConversationExample, VideoAnalysisResult } from "@shared/schema";

// Configure multer for video uploads
const upload = multer({
  dest: "/tmp/video-uploads",
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max upload size
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    const allowedMimeTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

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

  // Get example by principle (single - kept for backwards compatibility)
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

  // Get ALL examples for a principle
  app.get("/api/examples/all/:principle", async (req, res) => {
    try {
      const { principle } = req.params;
      const examples = await storage.getExamplesByPrinciple(principle);
      res.json({ success: true, data: examples });
    } catch (error) {
      console.error("Get all examples by principle error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve examples" });
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

  // Analyze video against Conversation Design criteria
  app.post("/api/video/analyze", upload.single("video"), async (req, res) => {
    let uploadedFilePath: string | undefined;
    let compressedFilePath: string | undefined;

    try {
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No video file uploaded"
        });
      }

      uploadedFilePath = req.file.path;

      // Validate milestone parameter
      const milestone = parseInt(req.body.milestone);
      if (!milestone || milestone < 1 || milestone > 4) {
        return res.status(400).json({
          success: false,
          error: "Invalid milestone. Must be between 1 and 4"
        });
      }

      console.log(`Processing video upload: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) for Milestone ${milestone}`);

      // Validate video file
      const isValid = await isValidVideo(uploadedFilePath);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: "Invalid video file. Please upload a valid video file."
        });
      }

      // Compress video
      compressedFilePath = path.join("/tmp/video-uploads", `compressed-${Date.now()}.mp4`);
      await compressVideo(uploadedFilePath, compressedFilePath);

      // Analyze with Gemini
      const evaluations = await analyzeVideoWithGemini(compressedFilePath, milestone);

      const result: VideoAnalysisResult = {
        success: true,
        milestone,
        evaluations
      };

      res.json(result);

    } catch (error: any) {
      console.error("Video analysis error:", error);
      res.status(500).json({
        success: false,
        milestone: parseInt(req.body.milestone) || 0,
        evaluations: [],
        error: error.message || "Failed to analyze video"
      });
    } finally {
      // Clean up temporary files
      try {
        if (uploadedFilePath) {
          await fs.unlink(uploadedFilePath);
        }
        if (compressedFilePath) {
          await fs.unlink(compressedFilePath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temporary files:", cleanupError);
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

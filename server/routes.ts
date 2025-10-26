import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as fs from "fs/promises";
import * as path from "path";
import { storage } from "./storage";
import { chatWithFramework } from "./gemini";
import { compressVideo, analyzeVideoWithGemini, analyzeDomainCompliance, isValidVideo } from "./video-analysis";
import type { ChatRequest, ChatResponse, ConversationExample, VideoAnalysisResult } from "@shared/schema";

// Ensure upload directory exists
const UPLOAD_DIR = "/tmp/video-uploads";
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(err => {
  console.error("Failed to create upload directory:", err);
});

// Configure multer for video uploads
const videoUpload = multer({
  dest: UPLOAD_DIR,
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

// Configure multer for agent spec uploads
const SPEC_UPLOAD_DIR = "/tmp/spec-uploads";
fs.mkdir(SPEC_UPLOAD_DIR, { recursive: true }).catch(err => {
  console.error("Failed to create spec upload directory:", err);
});

const specUpload = multer({
  dest: SPEC_UPLOAD_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for spec files
  },
  fileFilter: (req, file, cb) => {
    console.log("Agent spec upload - accepting file:", {
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    // Accept all document files - we'll extract text from them
    cb(null, true);
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
  app.post("/api/video/analyze", async (req, res) => {
    let uploadedFilePath: string | undefined;
    let compressedFilePath: string | undefined;

    // Handle file upload with multer
    await new Promise<void>((resolve, reject) => {
      videoUpload.single("video")(req, res, (err: any) => {
        if (err) {
          console.error("Multer upload error:", err);
          res.status(400).json({
            success: false,
            milestone: 0,
            evaluations: [],
            error: err.message || "File upload failed"
          });
          reject(err);
        } else {
          resolve();
        }
      });
    }).catch(() => {
      // Error already sent in multer callback
      return;
    });

    // If we already sent a response (due to multer error), don't continue
    if (res.headersSent) {
      return;
    }

    try {
      console.log("Video analysis request received", {
        hasFile: !!req.file,
        milestone: req.body.milestone,
        fileSize: req.file?.size,
        fileName: req.file?.originalname
      });

      // Validate file upload
      if (!req.file) {
        console.error("No file in request");
        return res.status(400).json({
          success: false,
          milestone: 0,
          evaluations: [],
          error: "No video file uploaded"
        });
      }

      uploadedFilePath = req.file.path;

      // Validate milestone parameter
      const milestone = parseInt(req.body.milestone);
      if (!milestone || milestone < 1 || milestone > 4) {
        console.error("Invalid milestone:", req.body.milestone);
        return res.status(400).json({
          success: false,
          milestone: 0,
          evaluations: [],
          error: "Invalid milestone. Must be between 1 and 4"
        });
      }

      // Get agent spec if provided
      const agentSpecId = req.body.agentSpecId;
      let agentSpec = null;
      if (agentSpecId) {
        agentSpec = await storage.getAgentSpecById(agentSpecId);
        if (!agentSpec) {
          console.warn(`Agent spec ID ${agentSpecId} not found, proceeding with general analysis only`);
        } else {
          console.log(`Using agent spec: ${agentSpec.name} for domain-specific evaluation`);
        }
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

      // Analyze with Gemini (general Conversation Design evaluation)
      const evaluations = await analyzeVideoWithGemini(compressedFilePath, milestone);

      // Perform domain-specific evaluation if agent spec is provided
      let domainEvaluation = undefined;
      if (agentSpec) {
        console.log(`📋 Starting domain compliance analysis for: ${agentSpec.name}`);
        try {
          domainEvaluation = await analyzeDomainCompliance(compressedFilePath, agentSpec);
          console.log(`✅ Domain compliance analysis complete`);
        } catch (error: any) {
          console.error(`⚠️  Domain compliance analysis failed:`, error.message);
          // Continue without domain evaluation - don't fail the entire analysis
        }
      }

      // Save the analysis to storage (with domain evaluation if available)
      const savedAnalysis = await storage.saveVideoAnalysis(
        req.file.originalname,
        milestone,
        evaluations,
        agentSpec?.id,
        agentSpec?.name,
        domainEvaluation
      );

      const result: VideoAnalysisResult = {
        success: true,
        milestone,
        evaluations,
        agentSpecName: agentSpec?.name,
        domainEvaluation: domainEvaluation
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

  // Get all saved video analyses
  app.get("/api/video/analyses", async (_req, res) => {
    try {
      const analyses = await storage.getVideoAnalyses();
      res.json({ success: true, data: analyses });
    } catch (error: any) {
      console.error("Error fetching video analyses:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get a specific video analysis by ID
  app.get("/api/video/analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getVideoAnalysisById(req.params.id);
      if (!analysis) {
        return res.status(404).json({ success: false, error: "Analysis not found" });
      }
      res.json({ success: true, data: analysis });
    } catch (error: any) {
      console.error("Error fetching video analysis:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete a video analysis
  app.delete("/api/video/analyses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteVideoAnalysis(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "Analysis not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting video analysis:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // AGENT SPECS MANAGEMENT ROUTES

  // Get all agent specs
  app.get("/api/agent-specs", async (_req, res) => {
    try {
      const specs = await storage.getAllAgentSpecs();
      res.json({ success: true, data: specs });
    } catch (error: any) {
      console.error("Error fetching agent specs:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get agent spec by ID
  app.get("/api/agent-specs/:id", async (req, res) => {
    try {
      const spec = await storage.getAgentSpecById(req.params.id);
      if (!spec) {
        return res.status(404).json({ success: false, error: "Agent spec not found" });
      }
      res.json({ success: true, data: spec });
    } catch (error: any) {
      console.error("Error fetching agent spec:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create new agent spec (with file upload)
  app.post("/api/agent-specs", specUpload.single("specFile"), async (req, res) => {
    try {
      const { name, specContent } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: "Agent spec name is required" });
      }

      // Check if name already exists
      const existing = await storage.getAgentSpecByName(name);
      if (existing) {
        return res.status(400).json({ success: false, error: "An agent spec with this name already exists" });
      }

      let content = specContent;

      // If file was uploaded, read its content
      if (req.file) {
        const fs = await import('fs/promises');
        try {
          // For text-based files, read as UTF-8
          if (req.file.mimetype.startsWith('text/') || 
              req.file.originalname.endsWith('.txt') ||
              req.file.originalname.endsWith('.md') ||
              req.file.originalname.endsWith('.json')) {
            content = await fs.readFile(req.file.path, 'utf-8');
          } else {
            // For binary files (Word, PDF, etc.), store a message indicating manual entry needed
            content = `[Binary file uploaded: ${req.file.originalname}]\n\nPlease copy and paste the text content of your agent specification in the "Spec Content" field above, or upload a plain text file (.txt, .md, .json) instead.`;
          }
        } finally {
          // Clean up uploaded file
          await fs.unlink(req.file.path).catch(() => {});
        }
      }

      if (!content) {
        return res.status(400).json({ success: false, error: "Spec content is required" });
      }

      const spec = await storage.createAgentSpec({ name, specContent: content });
      res.json({ success: true, data: spec });
    } catch (error: any) {
      console.error("Error creating agent spec:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update agent spec
  app.put("/api/agent-specs/:id", specUpload.single("specFile"), async (req, res) => {
    try {
      const { name, specContent } = req.body;
      const updates: any = {};

      if (name) {
        // Check if name already exists (excluding current spec)
        const existing = await storage.getAgentSpecByName(name);
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({ success: false, error: "An agent spec with this name already exists" });
        }
        updates.name = name;
      }

      // If file was uploaded, read its content
      if (req.file) {
        const fs = await import('fs/promises');
        try {
          // For text-based files, read as UTF-8
          if (req.file.mimetype.startsWith('text/') || 
              req.file.originalname.endsWith('.txt') ||
              req.file.originalname.endsWith('.md') ||
              req.file.originalname.endsWith('.json')) {
            updates.specContent = await fs.readFile(req.file.path, 'utf-8');
          } else {
            // For binary files (Word, PDF, etc.), store a message indicating manual entry needed
            updates.specContent = `[Binary file uploaded: ${req.file.originalname}]\n\nPlease copy and paste the text content of your agent specification in the "Spec Content" field above, or upload a plain text file (.txt, .md, .json) instead.`;
          }
        } finally {
          // Clean up uploaded file
          await fs.unlink(req.file.path).catch(() => {});
        }
      } else if (specContent) {
        updates.specContent = specContent;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: "No updates provided" });
      }

      const updated = await storage.updateAgentSpec(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, error: "Agent spec not found" });
      }

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error("Error updating agent spec:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete agent spec
  app.delete("/api/agent-specs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAgentSpec(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "Agent spec not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting agent spec:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

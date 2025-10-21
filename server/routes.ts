import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { chatWithFramework } from "./gemini";
import type { ExcelData, ExcelRow, ChatRequest, ChatResponse } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx and .csv files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload and parse Excel/CSV file
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      // Parse the file using xlsx
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        return res.status(400).json({ success: false, message: "File is empty" });
      }

      // Extract headers from first row
      const headers = Object.keys(jsonData[0] as object);
      
      // Format data
      const excelData: ExcelData = {
        headers,
        rows: jsonData as ExcelRow[],
      };

      // Store in memory
      await storage.setFrameworkData(excelData);

      res.json({
        success: true,
        message: "File uploaded successfully",
        data: excelData,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process file",
      });
    }
  });

  // Get current framework data
  app.get("/api/framework", async (req, res) => {
    try {
      const data = await storage.getFrameworkData();
      // Return 200 with null if no data exists
      res.json(data);
    } catch (error) {
      console.error("Get framework error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve framework data" });
    }
  });

  // Clear framework data
  app.delete("/api/framework", async (req, res) => {
    try {
      await storage.clearFrameworkData();
      res.json({ success: true, message: "Framework data cleared" });
    } catch (error) {
      console.error("Clear framework error:", error);
      res.status(500).json({ success: false, message: "Failed to clear framework data" });
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

  // Export framework data as Excel
  app.post("/api/export", async (req, res) => {
    try {
      const data = req.body as ExcelData;

      if (!data || !data.headers || !data.rows) {
        return res.status(400).json({ success: false, message: "Invalid data format" });
      }

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(data.rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Framework Data");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=framework_export.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ success: false, message: "Failed to export data" });
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

  // Clear chat history
  app.delete("/api/chat/history", async (req, res) => {
    try {
      await storage.clearChatMessages();
      res.json({ success: true, message: "Chat history cleared" });
    } catch (error) {
      console.error("Clear chat history error:", error);
      res.status(500).json({ success: false, message: "Failed to clear chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import { GoogleGenAI } from "@google/genai";
import type { ExcelData } from "@shared/schema";

// DON'T DELETE THIS COMMENT
// Using Vertex AI configuration with project-specific settings
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"

// Configure Google AI with Vertex AI API key and project settings
const apiKey = process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const projectId = process.env.GOOGLE_PROJECT_ID || "";
const location = process.env.GOOGLE_LOCATION || "us-central1";

// Initialize Google Generative AI with Vertex AI credentials
const ai = new GoogleGenAI({ 
  apiKey: apiKey,
  // Note: The @google/genai library uses the API key for authentication
  // Project ID and location are handled automatically via the API key's project association
});

export async function chatWithFramework(
  message: string,
  frameworkContext?: ExcelData
): Promise<string> {
  try {
    // Log configuration for debugging
    console.log("Using Vertex AI configuration:", {
      hasApiKey: !!apiKey,
      projectId: projectId || "not set",
      location: location
    });
    
    let systemPrompt = `You are a helpful AI assistant specialized in explaining and answering questions about agent evaluation frameworks.`;

    let contextInfo = "";
    if (frameworkContext) {
      // Format framework data for context
      contextInfo = `\n\nFramework Content:\n`;
      contextInfo += `Headers: ${frameworkContext.headers.join(", ")}\n`;
      contextInfo += `Number of rows: ${frameworkContext.rows.length}\n\n`;
      contextInfo += `Sample data (first 5 rows):\n`;
      
      frameworkContext.rows.slice(0, 5).forEach((row, idx) => {
        contextInfo += `Row ${idx + 1}:\n`;
        frameworkContext.headers.forEach(header => {
          contextInfo += `  ${header}: ${row[header]}\n`;
        });
        contextInfo += "\n";
      });

      systemPrompt += ` You have access to the user's framework data. Use this data to provide accurate, specific answers about their evaluation framework. Reference specific rows, columns, or values when relevant.`;
    } else {
      systemPrompt += ` The user hasn't uploaded framework data yet. Encourage them to upload their framework spreadsheet so you can provide specific assistance.`;
    }

    const fullPrompt = systemPrompt + contextInfo + `\n\nUser question: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to communicate with AI. Please check your API key configuration.");
  }
}

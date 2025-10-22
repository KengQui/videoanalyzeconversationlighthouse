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
    
    // CUSTOMIZE YOUR PROMPT HERE
    let systemPrompt = `You are an expert AI assistant specialized in agent evaluation frameworks. 
    You help users understand evaluation criteria, milestones, and best practices for building conversational AI agents.
    Be concise, practical, and focus on actionable insights.`;

    let contextInfo = "";
    if (frameworkContext) {
      // Format framework data for context - providing ALL rows for comprehensive analysis
      contextInfo = `\n\nAgent Evaluation Framework Details:\n`;
      contextInfo += `Total Evaluation Criteria: ${frameworkContext.rows.length}\n`;
      contextInfo += `Milestones: ${frameworkContext.headers.filter(h => h !== "__EMPTY").join(", ")}\n\n`;
      
      // Provide complete framework data for better context
      contextInfo += `Complete Framework Data:\n`;
      contextInfo += `=====================================\n`;
      
      frameworkContext.rows.forEach((row, idx) => {
        const criteriaName = row["__EMPTY"] || `Criteria ${idx + 1}`;
        contextInfo += `\n${idx + 1}. ${criteriaName}\n`;
        
        frameworkContext.headers.forEach(header => {
          if (header !== "__EMPTY" && row[header]) {
            contextInfo += `   - ${header}: ${row[header]}\n`;
          }
        });
      });

      systemPrompt += ` You have complete access to all ${frameworkContext.rows.length} evaluation criteria across ${frameworkContext.headers.filter(h => h !== "__EMPTY").length} milestones.
      When answering:
      - Reference specific criteria by name and milestone when relevant
      - Provide counts and statistics when asked
      - Explain the progression from one milestone to the next
      - Highlight patterns or themes in the evaluation framework
      - Give practical examples of how to meet specific criteria`;
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

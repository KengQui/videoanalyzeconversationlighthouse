import { GoogleGenAI } from "@google/genai";
import type { ExcelData } from "@shared/schema";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function chatWithFramework(
  message: string,
  frameworkContext?: ExcelData
): Promise<string> {
  try {
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

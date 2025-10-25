import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";
import { getConversationDesignCriteria } from "./framework-utils";
import type { CriterionEvaluation } from "@shared/schema";

const execAsync = promisify(exec);

const MAX_VIDEO_SIZE_MB = 20;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

/**
 * Compresses a video file to approximately 20MB using FFmpeg
 * Output format: H.264 codec, 720p resolution, mono audio
 * 
 * @param inputPath - Path to the input video file
 * @param outputPath - Path where the compressed video should be saved
 * @returns Promise that resolves when compression is complete
 */
export async function compressVideo(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Get video duration first to calculate target bitrate
    const probeCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
    const { stdout: durationStr } = await execAsync(probeCommand);
    const duration = parseFloat(durationStr.trim());
    
    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid video duration");
    }

    // Calculate target bitrate to achieve ~20MB file size
    // Formula: bitrate (kbps) = (target_size_bytes * 8) / duration_seconds / 1000
    // We reserve 10% for audio (64kbps mono)
    const audioBitrate = 64; // kbps
    const totalBitrate = (MAX_VIDEO_SIZE_BYTES * 8) / duration / 1000; // kbps
    const videoBitrate = Math.floor(totalBitrate - audioBitrate);
    
    // Ensure minimum quality
    const minBitrate = 500; // kbps
    const targetVideoBitrate = Math.max(videoBitrate, minBitrate);

    // FFmpeg command to compress video
    // -i: input file
    // -vf scale=-2:720: scale to 720p height, width auto-calculated to maintain aspect ratio (-2 ensures even number)
    // -c:v libx264: use H.264 codec
    // -b:v: target video bitrate
    // -maxrate: maximum bitrate (1.5x target for quality)
    // -bufsize: buffer size (2x target bitrate)
    // -preset medium: encoding speed/compression ratio tradeoff
    // -c:a aac: use AAC audio codec
    // -ac 1: mono audio (1 channel)
    // -b:a: audio bitrate
    // -movflags +faststart: optimize for web streaming
    const ffmpegCommand = `ffmpeg -i "${inputPath}" \
      -vf "scale=-2:720" \
      -c:v libx264 \
      -b:v ${targetVideoBitrate}k \
      -maxrate ${Math.floor(targetVideoBitrate * 1.5)}k \
      -bufsize ${Math.floor(targetVideoBitrate * 2)}k \
      -preset medium \
      -c:a aac \
      -ac 1 \
      -b:a ${audioBitrate}k \
      -movflags +faststart \
      -y \
      "${outputPath}"`;

    console.log(`Compressing video: ${inputPath} -> ${outputPath}`);
    console.log(`Target video bitrate: ${targetVideoBitrate}kbps (duration: ${duration.toFixed(2)}s)`);
    
    await execAsync(ffmpegCommand);
    
    // Verify the output file was created and check its size
    const stats = await fs.stat(outputPath);
    const sizeMB = stats.size / 1024 / 1024;
    console.log(`Compressed video size: ${sizeMB.toFixed(2)}MB`);
    
    // If still too large, do another pass with lower bitrate
    if (stats.size > MAX_VIDEO_SIZE_BYTES * 1.1) { // Allow 10% overage
      console.log("Video still too large, compressing again with lower bitrate...");
      const lowerBitrate = Math.floor(targetVideoBitrate * 0.7);
      
      const ffmpegCommand2 = `ffmpeg -i "${inputPath}" \
        -vf "scale=-2:720" \
        -c:v libx264 \
        -b:v ${lowerBitrate}k \
        -maxrate ${Math.floor(lowerBitrate * 1.5)}k \
        -bufsize ${Math.floor(lowerBitrate * 2)}k \
        -preset medium \
        -c:a aac \
        -ac 1 \
        -b:a ${audioBitrate}k \
        -movflags +faststart \
        -y \
        "${outputPath}"`;
      
      await execAsync(ffmpegCommand2);
      
      const stats2 = await fs.stat(outputPath);
      const sizeMB2 = stats2.size / 1024 / 1024;
      console.log(`Re-compressed video size: ${sizeMB2.toFixed(2)}MB`);
    }
    
  } catch (error: any) {
    console.error("Video compression error:", error);
    throw new Error(`Failed to compress video: ${error.message}`);
  }
}

/**
 * Gets basic information about a video file
 * @param filePath - Path to the video file
 * @returns Object containing duration, width, height, and size
 */
export async function getVideoInfo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}> {
  try {
    const probeCommand = `ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height -of json "${filePath}"`;
    const { stdout } = await execAsync(probeCommand);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams.find((s: any) => s.width && s.height);
    
    return {
      duration: parseFloat(info.format.duration) || 0,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      size: parseInt(info.format.size) || 0
    };
  } catch (error: any) {
    console.error("Error getting video info:", error);
    throw new Error(`Failed to get video information: ${error.message}`);
  }
}

/**
 * Validates that a file is a valid video file
 * @param filePath - Path to the file to validate
 * @returns true if valid video, false otherwise
 */
export async function isValidVideo(filePath: string): Promise<boolean> {
  try {
    await getVideoInfo(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Analyzes a video file against Conversation Design criteria using Gemini AI
 * @param videoPath - Path to the compressed video file
 * @param milestone - The milestone number (1-4) to evaluate against
 * @returns Array of evaluations with ratings (1-5) and feedback for each criterion
 */
export async function analyzeVideoWithGemini(
  videoPath: string,
  milestone: number
): Promise<CriterionEvaluation[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.");
  }

  // Use Google AI Studio with API key
  const ai = new GoogleGenAI({ apiKey });

  try {
    // Get the conversation design criteria for this milestone
    const criteria = getConversationDesignCriteria(milestone);
    
    if (criteria.length === 0) {
      throw new Error(`No Conversation Design criteria found for milestone ${milestone}`);
    }

    console.log(`Analyzing video against ${criteria.length} Conversation Design criteria for Milestone ${milestone}`);

    // Read the video file and convert to base64
    const videoBuffer = await fs.readFile(videoPath);
    const videoBase64 = videoBuffer.toString('base64');

    // Create the evaluation prompt
    const prompt = `You are an expert in conversational AI design. Analyze this video of an AI conversation interface against the following Conversation Design criteria from Milestone ${milestone} of our evaluation framework.

For each criterion listed below, provide:
1. A rating from 1-5 where:
   - 1 = Criterion not met at all
   - 2 = Criterion partially met, significant gaps
   - 3 = Criterion adequately met, room for improvement
   - 4 = Criterion well met, minor improvements possible
   - 5 = Criterion excellently met

2. Detailed feedback explaining your rating, including:
   - Specific observations from the video
   - What was done well (if anything)
   - What could be improved
   - Examples or timestamps from the video when relevant

**Conversation Design Criteria to Evaluate:**
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**IMPORTANT:** Respond with a valid JSON array. Each element should have exactly these fields:
- criterion: The exact criterion name from the list above
- rating: A number from 1-5
- feedback: Detailed text feedback

Example format:
[
  {
    "criterion": "Use simple, direct language",
    "rating": 4,
    "feedback": "The AI consistently uses clear, straightforward language throughout the conversation. At 0:32, it asks 'How many employees do you have?' rather than using jargon. One minor improvement: at 1:15, the phrase 'configure pay periods' could be simplified to 'set up when you pay employees'."
  }
]

Provide your evaluation as a JSON array only, no other text.`;

    // Send to Gemini with video
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "video/mp4",
              data: videoBase64
            }
          },
          { text: prompt }
        ]
      }]
    });

    const responseText = response.text?.trim() || "";
    
    if (!responseText) {
      throw new Error("Gemini returned an empty response");
    }

    // Parse the JSON response
    // Remove markdown code blocks if present
    let jsonText = responseText;
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const evaluations: CriterionEvaluation[] = JSON.parse(jsonText);
      
      // Validate the response structure
      if (!Array.isArray(evaluations)) {
        throw new Error("Response is not an array");
      }

      for (const evaluation of evaluations) {
        if (!evaluation.criterion || typeof evaluation.rating !== 'number' || !evaluation.feedback) {
          throw new Error("Invalid evaluation structure");
        }
        
        // Ensure rating is within 1-5 range
        if (evaluation.rating < 1 || evaluation.rating > 5) {
          console.warn(`Rating ${evaluation.rating} out of range for "${evaluation.criterion}", clamping to 1-5`);
          evaluation.rating = Math.max(1, Math.min(5, evaluation.rating));
        }
      }

      console.log(`Successfully analyzed video, received ${evaluations.length} evaluations`);
      return evaluations;

    } catch (parseError: any) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }

  } catch (error: any) {
    console.error("Video analysis error:", error);
    throw new Error(`Failed to analyze video: ${error.message}`);
  }
}

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";
import { getConversationDesignCriteria } from "./framework-utils";
import type { CriterionEvaluation, AgentSpec, DomainEvaluation } from "@shared/schema";

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
    console.log(`⏳ Step 1/3: Reading video file...`);

    // Read the video file and convert to base64
    const videoBuffer = await fs.readFile(videoPath);
    const videoBase64 = videoBuffer.toString('base64');
    const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`✓ Video file loaded (${fileSizeMB}MB)`);
    console.log(`⏳ Step 2/3: Encoding video for AI analysis...`);
    console.log(`✓ Video encoded and ready`);
    console.log(`⏳ Step 3/3: Sending to Gemini AI for analysis (this may take 2-5 minutes)...`);

    // Create the evaluation prompt
    const prompt = `You are an expert in conversational AI design. Analyze this video of an AI conversation interface against the following Conversation Design criteria from Milestone ${milestone} of our evaluation framework.

Watch the video carefully and provide specific examples with timestamps for each criterion.

For each criterion listed below, provide:
1. A rating from 1-5 where:
   - 1 = Criterion not met at all
   - 2 = Criterion partially met, significant gaps
   - 3 = Criterion adequately met, room for improvement
   - 4 = Criterion well met, minor improvements possible
   - 5 = Criterion excellently met

2. Detailed feedback explaining your rating. **MUST include specific examples from the video with timestamps**:
   - Cite specific moments from the video (e.g., "At 0:45, the AI asks...")
   - Quote exact phrases or describe specific interactions you observed
   - Provide timestamps in MM:SS format for key examples
   - Note what was done well with concrete examples
   - Identify specific moments that could be improved
   - Reference at least 2-3 specific examples from the video for each criterion

**Conversation Design Criteria to Evaluate:**
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**IMPORTANT:** Respond with a valid JSON array. Each element should have exactly these fields:
- criterion: The exact criterion name from the list above
- rating: A number from 1-5
- feedback: Detailed text feedback with specific video examples and timestamps

**CRITICAL:** Use only standard ASCII quotes (" and ') in your response - no smart quotes, curly quotes, or special unicode characters. Use only regular ASCII punctuation.

Example format:
[
  {
    "criterion": "Use simple, direct language",
    "rating": 4,
    "feedback": "The AI demonstrates strong use of clear language throughout most of the conversation. At 0:32, it asks 'How many employees do you have?' which is direct and easy to understand. At 1:45, it says 'Let me help you set up your payroll' instead of using technical jargon. However, at 2:15, the phrase 'configure pay periods' could be simplified to 'set up when you pay employees' to be more accessible to non-technical users. At 3:20, the explanation of tax withholding was clear and well-paced."
  }
]

Provide your evaluation as a JSON array only, no other text.`;

    // Send to Gemini with video
    const startTime = Date.now();
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

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✓ AI analysis completed in ${elapsedTime}s`);

    const responseText = response.text?.trim() || "";
    
    if (!responseText) {
      throw new Error("Gemini returned an empty response");
    }
    
    console.log(`⏳ Parsing AI response...`);

    // Parse the JSON response
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
    // Remove ```json or ``` at the start and end
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
    jsonText = jsonText.replace(/\s*```\s*$/, '');
    jsonText = jsonText.trim();
    
    // Aggressively clean ALL non-standard characters by converting each character
    const cleanedChars: string[] = [];
    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];
      const code = char.charCodeAt(0);
      
      // Handle various quote types
      if (code === 0x201C || code === 0x201D || code === 0x201E || code === 0x201F || code === 0x00AB || code === 0x00BB) {
        cleanedChars.push('"');  // All double quotes
      } else if (code === 0x2018 || code === 0x2019 || code === 0x201A || code === 0x201B || code === 0x2039 || code === 0x203A) {
        cleanedChars.push("'");  // All single quotes
      } else if (code === 0x2013 || code === 0x2014 || code === 0x2015) {
        cleanedChars.push('-');  // Em/en dashes
      } else if (code === 0x2026) {
        cleanedChars.push('...');  // Ellipsis
      } else if (code >= 0x2010 && code <= 0x2012) {
        cleanedChars.push('-');  // Other dashes
      } else if ((code >= 0x2000 && code <= 0x200B) || code === 0x202F || code === 0x205F || code === 0x3000) {
        cleanedChars.push(' ');  // Various spaces
      } else {
        cleanedChars.push(char);  // Keep as-is
      }
    }
    jsonText = cleanedChars.join('');

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

      console.log(`✓ Successfully analyzed video, received ${evaluations.length} evaluations`);
      console.log(`🎉 Analysis complete! All ${evaluations.length} criteria evaluated.`);
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

/**
 * Analyzes a video against a specific agent specification for domain compliance
 * @param videoPath - Path to the compressed video file
 * @param agentSpec - The agent specification to evaluate against
 * @param videoBase64 - Optional pre-encoded video (to avoid re-reading)
 * @returns Domain evaluation with compliance rating and findings
 */
export async function analyzeDomainCompliance(
  videoPath: string,
  agentSpec: AgentSpec,
  videoBase64?: string
): Promise<DomainEvaluation> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log(`🔍 Performing domain-specific evaluation against: ${agentSpec.name}`);
    console.log(`⏳ Step 1/3: Preparing agent specification...`);

    // Read video if not provided
    let base64Data = videoBase64;
    if (!base64Data) {
      console.log(`⏳ Reading video file...`);
      const videoBuffer = await fs.readFile(videoPath);
      base64Data = videoBuffer.toString('base64');
      console.log(`✓ Video file loaded`);
    }

    console.log(`⏳ Step 2/3: Analyzing conversation against agent spec...`);

    // Create domain evaluation prompt
    const prompt = `You are an expert in conversational AI quality assurance. You will analyze this video of an AI conversation to determine how well it complies with a specific agent specification.

**AGENT SPECIFICATION FOR "${agentSpec.name}":**

${agentSpec.specContent}

---

**YOUR TASK:**

1. Watch the video carefully and identify specific behaviors, flows, questions, and logic demonstrated by the AI agent
2. Compare what you observe against the agent specification document above
3. Evaluate compliance across different categories (e.g., Question Flow, Conditional Logic, Auto-Detection, Error Handling, etc.)
4. For each category, determine:
   - Whether it PASSES (fully compliant with spec)
   - Whether it FAILS (not compliant with spec)
   - Whether it's PARTIAL (partially compliant, some issues)
   - Severity: CRITICAL (breaks core functionality), MAJOR (significant issue), MINOR (small deviation)

**IMPORTANT:** Provide your evaluation as a valid JSON object with exactly this structure:

{
  "specName": "${agentSpec.name}",
  "overallCompliance": <number 1-5, where 5=perfect compliance, 1=major spec violations>,
  "findings": [
    {
      "category": "<category name like 'Question Flow', 'Conditional Logic', etc.>",
      "status": "<pass|fail|partial>",
      "details": "<Detailed explanation with specific examples and timestamps from the video>",
      "severity": "<critical|major|minor>"
    }
  ]
}

**CRITICAL:** Use only standard ASCII quotes (" and ') in your response - no smart quotes, curly quotes, or special unicode characters. Use only regular ASCII punctuation.

**Include specific examples with timestamps:**
- Reference specific moments from the video (e.g., "At 0:32, the agent asks...")
- Quote actual questions or responses you observe
- Compare what you see to what the spec requires
- Note any deviations, missing features, or compliance successes

Provide at least 4-6 findings covering different aspects of the specification. Be thorough and specific.

Respond with the JSON object only, no other text.`;

    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "video/mp4",
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }]
    });

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✓ Domain analysis completed in ${elapsedTime}s`);

    const responseText = response.text?.trim() || "";
    
    if (!responseText) {
      throw new Error("Gemini returned empty response for domain evaluation");
    }

    console.log(`⏳ Step 3/3: Parsing domain evaluation results...`);

    // Clean and parse JSON response (same cleaning logic as general evaluation)
    let jsonText = responseText.trim();
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
    jsonText = jsonText.replace(/\s*```\s*$/, '');
    jsonText = jsonText.trim();

    // Clean non-standard characters
    const cleanedChars: string[] = [];
    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];
      const code = char.charCodeAt(0);
      
      if (code === 0x201C || code === 0x201D || code === 0x201E || code === 0x201F || code === 0x00AB || code === 0x00BB) {
        cleanedChars.push('"');
      } else if (code === 0x2018 || code === 0x2019 || code === 0x201A || code === 0x201B || code === 0x2039 || code === 0x203A) {
        cleanedChars.push("'");
      } else if (code === 0x2013 || code === 0x2014 || code === 0x2015) {
        cleanedChars.push('-');
      } else if (code === 0x2026) {
        cleanedChars.push('...');
      } else if (code >= 0x2010 && code <= 0x2012) {
        cleanedChars.push('-');
      } else if ((code >= 0x2000 && code <= 0x200B) || code === 0x202F || code === 0x205F || code === 0x3000) {
        cleanedChars.push(' ');
      } else {
        cleanedChars.push(char);
      }
    }
    jsonText = cleanedChars.join('');

    try {
      const domainEval: DomainEvaluation = JSON.parse(jsonText);
      
      // Validate structure
      if (!domainEval.specName || typeof domainEval.overallCompliance !== 'number' || !Array.isArray(domainEval.findings)) {
        throw new Error("Invalid domain evaluation structure");
      }

      // Clamp compliance rating to 1-5
      domainEval.overallCompliance = Math.max(1, Math.min(5, domainEval.overallCompliance));

      // Validate findings
      for (const finding of domainEval.findings) {
        if (!finding.category || !finding.status || !finding.details) {
          console.warn("Invalid finding structure, skipping:", finding);
        }
      }

      console.log(`✓ Domain evaluation complete: ${domainEval.findings.length} findings, overall compliance ${domainEval.overallCompliance}/5`);
      console.log(`🎉 Domain analysis complete for ${agentSpec.name}!`);
      return domainEval;

    } catch (parseError: any) {
      console.error("Failed to parse domain evaluation response:", responseText);
      throw new Error(`Failed to parse domain evaluation as JSON: ${parseError.message}`);
    }

  } catch (error: any) {
    console.error("Domain compliance analysis error:", error);
    throw new Error(`Failed to analyze domain compliance: ${error.message}`);
  }
}

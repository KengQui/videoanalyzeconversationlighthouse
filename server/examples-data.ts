import type { ExamplesData } from "@shared/schema";

export const INITIAL_EXAMPLES_DATA: ExamplesData = {
  examples: [
    {
      id: "clarity-1",
      principle: "Clarity",
      score: "2/5",
      badExample: `AI: "Pay date offset from end date, Derived from 1 matching example, confidence 1.0, across 1 example, Status: ready"`,
      whyItsBad: `Uses technical/ML jargon like "Derived from 1 matching example, confidence 1.0" and system terminology like "Pay date offset from end date" without explaining what these mean to the user. Also uses confusing phrases like "across 1 example" and "Status: ready" which don't clarify what the user needs to know.`,
      goodExample: `AI: "I found your pay schedule configuration. Your employees are paid 5 days after each pay period ends. Would you like me to set this up for you?"`,
      additionalNotes: "Remove all ML/data extraction metadata and use plain language that matches the user's mental model"
    },
    {
      id: "clarity-2", 
      principle: "Clarity",
      score: "1.5/5",
      badExample: `AI: "Would you like to configure the W2 pension box type? Options: System Rules/Yes/No"`,
      whyItsBad: `Uses unexplained technical terminology. "W2 pension box type" is confusing - it's actually about Box 13 'Retirement plan' on W-2 forms. "System Rules" option is unclear with no definition provided.`,
      goodExample: `AI: "When should Box 13 'Retirement plan' be checked on W-2 forms?\n• System Rules: Check only if employee contributed or received employer contributions\n• Always: Check for all eligible employees\n• Never: Never check this box"`,
      additionalNotes: "Always explain technical terms and what each option means in practical terms"
    },
    {
      id: "context-awareness-1",
      principle: "Context Awareness",
      score: "1.5/5",
      badExample: `System: "File uploaded successfully"\nAI: "Would you like to create a pay period profile from this file?"`,
      whyItsBad: `The system just confirmed the file was uploaded, but the AI acts unaware and asks if the user wants to use it. The AI should already know the file was uploaded and proceed accordingly.`,
      goodExample: `System: "File uploaded successfully"\nAI: "I'll analyze your uploaded file now and show you what I found..."`,
      additionalNotes: "AI should maintain awareness of system state and recent actions"
    },
    {
      id: "context-awareness-2",
      principle: "Context Awareness",
      score: "0.5/5",
      badExample: `AI: "What is the minimum age requirement for employees?"\n[Document clearly states: "Minimum age: 21"]\nAI: "What is the service requirement?"\n[Document states: "1 year of service"]`,
      whyItsBad: `AI asks for information that's already available in the uploaded document. It fails to extract and use the data, creating unnecessary work for the user.`,
      goodExample: `AI: "I found these eligibility requirements in your document:\n• Minimum age: 21\n• Service requirement: 1 year\nIs this correct?"`,
      additionalNotes: "Always extract available information from documents before asking users"
    },
    {
      id: "brevity-1",
      principle: "Brevity",
      score: "2/5",
      badExample: `AI: "The maximum employee contribution percentage is 100%. Now, regarding the W2 pension box type configuration..."`,
      whyItsBad: `Includes unrelated information (contribution limits) right before asking about W2 configuration. This adds unnecessary verbosity and cognitive load.`,
      goodExample: null,
      additionalNotes: "Need user input for good example - should separate unrelated topics"
    },
    {
      id: "consistency-1",
      principle: "Consistency",
      score: "1/5",
      badExample: `AI: "Found majority cadence: Semi-Monthly"\n[But then shows] "Profile #1: Bi-Weekly Pay Period (Type: EVERY_N_WEEKS)"`,
      whyItsBad: `Contradicts itself immediately - says semi-monthly is the majority but then shows bi-weekly as the main profile. Creates confusion about what was actually found.`,
      goodExample: `AI: "I found multiple pay schedules in your document:\n• 2 profiles use Bi-Weekly\n• 3 profiles use Semi-Monthly\nWhich would you like to configure?"`,
      additionalNotes: "Be consistent in reporting findings and avoid contradictions"
    },
    {
      id: "empathy-tone-1",
      principle: "Empathy & Tone",
      score: "2/5",
      badExample: `AI: "I encountered an issue displaying the profiles in a table"`,
      whyItsBad: `Exposes internal technical problems to the user, making the system appear unreliable and unfinished. Creates doubt about the system's capabilities.`,
      goodExample: null,
      additionalNotes: "Need user input for good example - should handle errors gracefully without exposing internal issues"
    },
    {
      id: "turn-taking-1",
      principle: "Turn-Taking & Flow",
      score: "2/5",
      badExample: `System: "File uploaded successfully"\nAI: "The file has been uploaded. Would you like to create a profile from this file?"`,
      whyItsBad: `Unnecessary confirmation after a successful action. The system already confirmed the upload, so the AI should proceed to the next logical step.`,
      goodExample: `System: "File uploaded successfully"\nAI: [Proceeds directly to analyze and display findings]`,
      additionalNotes: "Avoid redundant confirmations and maintain conversation flow"
    },
    {
      id: "turn-taking-2",
      principle: "Turn-Taking & Flow",
      score: "1/5",
      badExample: `AI: "When does eligibility begin?"\nAI: "Is there a waiting period?"\n[These are asked in the wrong order]`,
      whyItsBad: `Asks about timing before establishing if there's a waiting period at all. The logical order should be: first ask IF there's a waiting period, then ask about timing details.`,
      goodExample: `AI: "Is there a waiting period for eligibility?"\n[If yes] → "How long is the waiting period?"\n[If no] → "When does eligibility begin?"`,
      additionalNotes: "Follow logical question sequencing: prerequisites before details"
    },
    {
      id: "proactive-guidance-1",
      principle: "Proactive Guidance",
      score: "1.5/5",
      badExample: `User: "I want a weekly pay period starting 1 Jan 2025 to 31 dec 2025"\nAI: [Accepts this without question]`,
      whyItsBad: `Doesn't flag that weekly pay periods with end dates don't make logical sense. Weekly pay periods typically run indefinitely. AI should recognize this contradiction and guide the user.`,
      goodExample: `User: "I want a weekly pay period starting 1 Jan 2025 to 31 dec 2025"\nAI: "I notice you mentioned an end date. Weekly pay periods typically run indefinitely unless you're planning to change your schedule. Did you mean to set up a temporary pay schedule, or should this continue indefinitely?"`,
      additionalNotes: "Proactively identify and clarify illogical inputs"
    },
    {
      id: "proactive-guidance-2",
      principle: "Proactive Guidance",
      score: "0.5/5",
      badExample: `AI: "Select from: System Rules/Yes/No"\n[No explanation of what these options mean]`,
      whyItsBad: `Provides options without any guidance on when to use each one. Users don't know what "System Rules" means or when they should choose Yes vs No.`,
      goodExample: null,
      additionalNotes: "Need user input for good example - should explain when to use each option"
    },
    {
      id: "confirmation-feedback-1",
      principle: "Confirmation & Feedback",
      score: "2/5",
      badExample: `AI: [Shows extraction metadata]\nAI: "Please confirm these settings"\nAI: [Only then creates the actual configuration]`,
      whyItsBad: `Backwards confirmation workflow - asks user to confirm extraction data instead of showing what will actually be configured. User confirms before seeing the final result.`,
      goodExample: `AI: "Here's what I'll configure based on your document:\n[Shows actual configuration preview]\nWould you like me to proceed with these settings?"`,
      additionalNotes: "Show what will be configured before asking for confirmation"
    },
    {
      id: "error-recovery-1",
      principle: "Error Recovery",
      score: "1.5/5",
      badExample: `User: "Can you setup if..." [grammatically broken]\nAI: [Proceeds without clarifying]`,
      whyItsBad: `No clear help or clarification pathways when user intent is unclear. Doesn't offer disambiguation or ways to clarify the ambiguous request.`,
      goodExample: null,
      additionalNotes: "Need user input for good example - should offer clarification options"
    },
    {
      id: "accessibility-1",
      principle: "Accessibility & Inclusivity",
      score: "2/5",
      badExample: `AI: "Configure primary deduction type (rollup deduction) and additional deduction level (secondary deduction)"`,
      whyItsBad: `Heavy use of technical/UKG-specific terminology creates barriers for users unfamiliar with the system. Raises reading level and adds cognitive load.`,
      goodExample: null,
      additionalNotes: "Need user input for good example - should use plain language accessible to all users"
    }
  ]
};
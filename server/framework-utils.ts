import type { ExcelData, ExcelRow } from "@shared/schema";
import { INITIAL_FRAMEWORK_DATA } from "./framework-data";

// Column mapping for milestones
const MILESTONE_COLUMNS: Record<number, string> = {
  1: "1/1/2026 (Milestone 1)",
  2: "(milestone 2)",
  3: "(Milestone 3)",
  4: "Milestone 4"
};

/**
 * Extracts Conversation Design criteria from the framework data for a specific milestone
 * @param milestone - The milestone number (1-4)
 * @returns Array of criterion names that are enabled (marked with ✅) in that milestone
 */
export function getConversationDesignCriteria(milestone: number): string[] {
  const frameworkData = INITIAL_FRAMEWORK_DATA;
  const milestoneColumn = MILESTONE_COLUMNS[milestone];
  
  if (!milestoneColumn) {
    throw new Error(`Invalid milestone: ${milestone}. Must be 1, 2, 3, or 4.`);
  }

  const criteria: string[] = [];
  let inConversationDesign = false;
  let foundConversationDesign = false;

  for (const row of frameworkData.rows) {
    const criterionName = row.__EMPTY as string;
    
    // Check if we've reached the Conversation Design section
    if (criterionName === "Conversation Design") {
      inConversationDesign = true;
      foundConversationDesign = true;
      continue;
    }

    // Check if we've left the Conversation Design section
    // The section ends when we hit another major section (Error Handling, etc.)
    if (inConversationDesign && criterionName && 
        (criterionName === "Error Handling" || 
         criterionName === "Monitoring AI for unexpected behaviors during use" ||
         criterionName === "SOURCE ATTRIBUTION (CONVERSATIONAL)" ||
         criterionName === "Correction Handling")) {
      break;
    }

    // If we're in the Conversation Design section
    if (inConversationDesign && criterionName) {
      const milestoneValue = row[milestoneColumn] as string;
      
      // Skip section headers (they have empty milestone values or are just category labels)
      // We only want actual criteria that have values
      if (!milestoneValue || milestoneValue === "") {
        continue;
      }

      // Include criteria that have "Yes" or "✅" in the milestone column
      // This includes variations like "✅ Yes", "✅ Yes (with conditions)", etc.
      if (milestoneValue.includes("✅") || milestoneValue.includes("Yes")) {
        criteria.push(criterionName);
      }
    }
  }

  if (!foundConversationDesign) {
    throw new Error("Conversation Design section not found in framework data");
  }

  return criteria;
}

/**
 * Get all criteria from the framework data for a specific milestone
 * Useful for debugging or displaying the full framework
 */
export function getAllCriteriaForMilestone(milestone: number): ExcelRow[] {
  const frameworkData = INITIAL_FRAMEWORK_DATA;
  const milestoneColumn = MILESTONE_COLUMNS[milestone];
  
  if (!milestoneColumn) {
    throw new Error(`Invalid milestone: ${milestone}. Must be 1, 2, 3, or 4.`);
  }

  return frameworkData.rows.filter(row => {
    const milestoneValue = row[milestoneColumn] as string;
    return milestoneValue && (milestoneValue.includes("✅") || milestoneValue.includes("Yes"));
  });
}

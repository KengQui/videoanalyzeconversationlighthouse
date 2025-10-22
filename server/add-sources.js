const fs = require('fs');

// Read the file
let content = fs.readFileSync('examples-data.ts', 'utf8');

// List of IDs that should be "Pay period configuration agent"
const payPeriodIds = [
  'clarity-1', 'clarity-2', 'context-awareness-1', 'context-awareness-2',
  'brevity-1', 'consistency-1', 'empathy-tone-1', 'turn-taking-1',
  'turn-taking-2', 'proactive-guidance-1', 'proactive-guidance-2',
  'confirmation-feedback-1', 'error-recovery-1', 'accessibility-1'
];

// List of IDs that should be "Retirement agent"
const retirementIds = [
  'context-awareness-3', 'context-awareness-4', 'clarity-4', 'clarity-5',
  'turn-taking-3', 'turn-taking-4', 'consistency-2', 'empathy-tone-2',
  'proactive-guidance-3', 'proactive-guidance-4', 'accessibility-2',
  'confirmation-feedback-2', 'brevity-2'
];

// Function to add source after additionalNotes
function addSource(content, id, source) {
  const idPattern = new RegExp(`id: "${id}"`, 'g');
  const idIndex = content.search(idPattern);
  
  if (idIndex === -1) {
    console.log(`ID ${id} not found`);
    return content;
  }
  
  // Find the closing brace for this example
  let braceCount = 0;
  let inExample = false;
  let endIndex = -1;
  
  for (let i = idIndex; i < content.length; i++) {
    if (content[i] === '{') {
      if (!inExample) inExample = true;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0 && inExample) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (endIndex === -1) {
    console.log(`Could not find end of example ${id}`);
    return content;
  }
  
  // Check if source already exists
  const exampleText = content.substring(idIndex, endIndex);
  if (exampleText.includes('source:')) {
    console.log(`Example ${id} already has source`);
    return content;
  }
  
  // Find additionalNotes and add source after it
  const notesPattern = /additionalNotes: "[^"]*"/;
  const exampleStart = content.substring(0, endIndex);
  const lastNotesMatch = exampleStart.match(notesPattern);
  
  if (lastNotesMatch) {
    const notesEndIndex = exampleStart.lastIndexOf(lastNotesMatch[0]) + lastNotesMatch[0].length;
    content = content.substring(0, notesEndIndex) + 
              `,\n      source: "${source}"` + 
              content.substring(notesEndIndex);
  }
  
  return content;
}

// Add sources for Pay period configuration agent
payPeriodIds.forEach(id => {
  content = addSource(content, id, "Pay period configuration agent");
});

// Add sources for Retirement agent  
retirementIds.forEach(id => {
  content = addSource(content, id, "Retirement agent");
});

// Write the updated content
fs.writeFileSync('examples-data.ts', content);
console.log('Sources added successfully!');
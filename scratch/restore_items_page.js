const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\ZETTA\\.gemini\\antigravity-ide\\brain\\deca7f42-2bee-4ea8-b871-f580906f55f2\\.system_generated\\logs\\transcript.jsonl';
const targetPath = 'c:\\Users\\ZETTA\\OneDrive\\Desktop\\project\\app\\components\\ItemsPage.tsx';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const step = JSON.parse(line);
    // Find the step where ItemsPage.tsx was viewed
    if (step.type === 'VIEW_FILE' && step.content && step.content.includes('File Path: `file:///c:/Users/ZETTA/OneDrive/Desktop/project/app/components/ItemsPage.tsx`')) {
      console.log('Found VIEW_FILE step:', step.step_index);
      // Clean up line numbers in step.content
      // Format is: "1: use client;\r\n2: \r\n" etc
      const contentLines = step.content.split('\n');
      const restoredLines = [];
      for (const rawLine of contentLines) {
        const match = rawLine.match(/^\d+:\s?(.*)$/);
        if (match) {
          restoredLines.push(match[1]);
        }
      }
      const restoredContent = restoredLines.join('\n');
      fs.writeFileSync(targetPath, restoredContent, 'utf8');
      console.log('Restored successfully!');
      process.exit(0);
    }
  }
  console.log('Could not find VIEW_FILE step in transcript');
} catch (e) {
  console.error('Error:', e);
}

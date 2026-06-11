const fs = require('fs');
const path = require('path');

const logPath = 'C:/Users/ZETTA/.gemini/antigravity-ide/brain/faa7fcbc-1c76-4867-86fd-a20a7e604d1f/.system_generated/logs/transcript.jsonl';
const fileContent = fs.readFileSync(logPath, 'utf8');
const lines = fileContent.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const json = JSON.parse(line);
    if (json.step_index === 868) {
      fs.writeFileSync('c:/Users/ZETTA/OneDrive/Desktop/project/scratch/restored_lines.txt', json.content, 'utf8');
      console.log('Saved step 868 content to restored_lines.txt');
      break;
    }
  } catch (e) {
    // Ignore parse errors
  }
}

const fs = require('fs');
const logPath = 'C:\\Users\\ZETTA\\.gemini\\antigravity-ide\\brain\\deca7f42-2bee-4ea8-b871-f580906f55f2\\.system_generated\\logs\\transcript.jsonl';
try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const step = JSON.parse(line);
    if (step.step_index === 121) {
      console.log('Step 121 content length:', step.content.length);
      console.log('Step 121 content preview:', step.content.slice(-200));
    }
  }
} catch (e) {
  console.error(e);
}

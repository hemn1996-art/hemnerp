const fs = require('fs');
const readline = require('readline');

async function printSample() {
  const logPath = 'C:\\Users\\ZETTA\\.gemini\\antigravity-ide\\brain\\faa7fcbc-1c76-4867-86fd-a20a7e604d1f\\.system_generated\\logs\\transcript.jsonl';
  
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    if (count < 5) {
      console.log(`Line ${count}:`, Object.keys(JSON.parse(line)));
      console.log(line.substring(0, 300));
      count++;
    } else {
      break;
    }
  }
}

printSample().catch(console.error);

const fs = require('fs');
const readline = require('readline');

async function search() {
  const logPath = 'C:\\Users\\ZETTA\\.gemini\\antigravity-ide\\brain\\faa7fcbc-1c76-4867-86fd-a20a7e604d1f\\.system_generated\\logs\\transcript.jsonl';
  
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.content && obj.content.includes('PurchaseReturnPage.tsx') && obj.content.includes('availableStock')) {
      console.log(`Found step: ${obj.step_index}, type: ${obj.type}`);
      fs.writeFileSync('C:\\Users\\ZETTA\\OneDrive\\Desktop\\project\\scratch\\recovered_purchase_return.txt', obj.content);
      console.log("Written to scratch\\recovered_purchase_return.txt");
    }
  }
}

search().catch(console.error);

const fs = require('fs');
const readline = require('readline');

async function recover() {
  const logPath = 'C:\\Users\\ZETTA\\.gemini\\antigravity-ide\\brain\\faa7fcbc-1c76-4867-86fd-a20a7e604d1f\\.system_generated\\logs\\transcript.jsonl';
  
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('PurchaseReturnPage.tsx')) {
      const obj = JSON.parse(line);
      // We look for step of type VIEW_FILE or tool response with content
      if (obj.output && obj.output.includes('File Path: `file:///c:/Users/ZETTA/OneDrive/Desktop/project/app/components/PurchaseReturnPage.tsx`')) {
        console.log("Found view_file output!");
        fs.writeFileSync('C:\\Users\\ZETTA\\OneDrive\\Desktop\\project\\scratch\\recovered_purchase_return.txt', obj.output);
        console.log("Saved to scratch\\recovered_purchase_return.txt");
      }
    }
  }
}

recover().catch(console.error);

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/components/PurchasePage.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('select') && (line.includes('accountId') || line.includes('expense') || line.includes('Debt'))) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});

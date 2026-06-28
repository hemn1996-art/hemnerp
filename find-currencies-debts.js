const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/reports/debts/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.toLowerCase().includes('cur')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});

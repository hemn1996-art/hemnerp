const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'app', 'components', 'InvoicePage.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');

console.log('Searching in InvoicePage.tsx...');
lines.forEach((line, idx) => {
  if (line.includes('print') || line.includes('print-area') || line.includes('printArea')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

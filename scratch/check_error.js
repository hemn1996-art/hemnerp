const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/components/ItemsPage_fixed.tsx');
const buf = fs.readFileSync(filePath);

console.log('Buffer length:', buf.length);
// Print bytes around 4967
const start = Math.max(0, 4967 - 20);
const end = Math.min(buf.length, 4967 + 20);

console.log('Bytes around index 4967:');
const slice = buf.slice(start, end);
for (let i = 0; i < slice.length; i++) {
  const byteVal = slice[i];
  const offset = start + i;
  console.log(`Offset ${offset}: 0x${byteVal.toString(16).toUpperCase()} (${byteVal}) - Char: ${String.fromCharCode(byteVal)}`);
}

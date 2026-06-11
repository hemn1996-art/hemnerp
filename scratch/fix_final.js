const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, '../app/components/ItemsPage.tsx');

console.log('1. Restoring original file from Git...');
try {
  execSync('git checkout -- app/components/ItemsPage.tsx', { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to restore via git checkout. Please make sure git is installed and you run this in the project root.');
  process.exit(1);
}

console.log('2. Reading file content...');
const content = fs.readFileSync(filePath, 'utf8');

const win1252Mappings = {
  0x20AC: 0x80, 0x0081: 0x81, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B,
  0x0152: 0x8C, 0x008D: 0x8D, 0x017D: 0x8E, 0x008F: 0x8F, 0x0090: 0x90, 0x2018: 0x91,
  0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x009D: 0x9D,
  0x017E: 0x9E, 0x0178: 0x9F
};

console.log('3. Decoding Mojibake characters to UTF-8...');
const bytes = [];
for (let i = 0; i < content.length; i++) {
  const code = content.charCodeAt(i);
  if (code <= 0x7F) {
    bytes.push(code);
  } else if (win1252Mappings[code] !== undefined) {
    bytes.push(win1252Mappings[code]);
  } else if (code >= 0xA0 && code <= 0xFF) {
    bytes.push(code);
  } else if (code >= 0x80 && code <= 0x9F) {
    bytes.push(code);
  } else {
    // If it's a character outside the Latin-1 range, encode it back to its UTF-8 representation
    const buf = Buffer.from(content[i], 'utf8');
    for (let j = 0; j < buf.length; j++) {
      bytes.push(buf[j]);
    }
  }
}

const restoredBuffer = Buffer.from(bytes);

console.log('4. Overwriting file with clean Kurdish (UTF-8) encoding...');
fs.writeFileSync(filePath, restoredBuffer);
console.log('Done! ItemsPage.tsx has been successfully repaired and saved.');

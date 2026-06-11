const fs = require('fs');
const path = require('path');

// Windows-1252 to byte mapping for 0x80-0x9F
const win1252Map = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201C: 0x93, // “
  0x201D: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F  // Ÿ
};

function restoreUtf8FromString(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7F) {
      bytes.push(code);
    } else if (win1252Map[code] !== undefined) {
      bytes.push(win1252Map[code]);
    } else if (code >= 0xA0 && code <= 0xFF) {
      bytes.push(code);
    } else {
      // For any other characters, we just convert them back to UTF-8 bytes to preserve them
      const utf8Buf = Buffer.from(str[i], 'utf8');
      for (let j = 0; j < utf8Buf.length; j++) {
        bytes.push(utf8Buf[j]);
      }
    }
  }
  return Buffer.from(bytes);
}

const targetFile = path.join(__dirname, '../app/components/ItemsPage.tsx');
const content = fs.readFileSync(targetFile, 'utf8');
const restoredBuffer = restoreUtf8FromString(content);

// Let's write to a temp file first to inspect it
const tempFile = path.join(__dirname, '../app/components/ItemsPage_fixed.tsx');
fs.writeFileSync(tempFile, restoredBuffer);
console.log('Restored content written to ItemsPage_fixed.tsx');

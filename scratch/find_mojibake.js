const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../components')
];

const filesToFix = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // If we see characteristic mojibake character sequences like "Ø¯Úµ" or "Ø²ÛŒ"
      if (content.includes('Ø') && (content.includes('Ú') || content.includes('Û') || content.includes('Ù'))) {
        filesToFix.push(fullPath);
      }
    }
  }
}

targetDirs.forEach(scanDir);
console.log('Found files with mojibake:', filesToFix);
fs.writeFileSync(path.join(__dirname, 'mojibake_files.json'), JSON.stringify(filesToFix, null, 2));

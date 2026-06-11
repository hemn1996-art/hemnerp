const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  // 1. Repair Category 1 (corrupted print button: nt}>)
  const pattern1 = /\s*nt\s*\}\s*>\s*(?:پرێنتکردن)\s*<\/button>/g;
  if (content.includes('nt}>') && content.includes('پرێنتکردن')) {
    console.log(`Repairing print button in: ${file}`);
    content = content.replace(/\{\s*isLocked\s*\?\s*["']خەزن\s+کراوە["']\s*:\s*editId\s*\?\s*["']نوێکردنەوە["']\s*:\s*["']خەزنکردن["']\s*\}\s*nt\s*\}\s*>/, 
      `{isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}
            </button>

            <button style={outlineBlueBtn} onClick={handlePrint}>`
    );
    modified = true;
  }

  // 2. Repair Category 2 (corrupted settings button: ShowSettings(true)}>)
  if (content.includes('ShowSettings(true)}>') && content.includes('ڕێکخستن')) {
    console.log(`Repairing settings button in: ${file}`);
    content = content.replace(/\{\s*isLocked\s*\?\s*["']خەزن\s+کراوە["']\s*:\s*editId\s*\?\s*["']نوێکردنەوە["']\s*:\s*["']خەزنکردن["']\s*\}\s*ShowSettings\(true\)\s*\}\s*>/,
      `{isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}
            </button>

            <button style={outlineBlueBtn} onClick={() => setShowSettings(true)}>`
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully repaired: ${file}`);
  }
});

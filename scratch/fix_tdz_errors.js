const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const isTarget = content.includes('editId?: string') || content.includes('editId?: string;') || file === 'AccountsPage.tsx';
  if (!isTarget) return;

  const isInvoice = file === 'InvoicePage.tsx';

  // 1. Check if the TDZ hook exists at the top
  const hookRegex = /\s*useEffect\(\(\)\s*=>\s*\{\s*if\s*\(\s*editId\s*&&\s*!isEditLoading\s*\)\s*\{\s*setSaved(?:Invoice)?Snapshot\(current(?:Invoice)?Snapshot\);\s*\}\s*\}\s*,\s*\[\s*editId\s*,\s*isEditLoading\s*,\s*current(?:Invoice)?Snapshot\s*\]\);/;

  if (hookRegex.test(content)) {
    console.log(`Fixing TDZ error in: ${file}`);
    // Extract the hook
    const hookMatch = content.match(hookRegex)[0];
    // Remove the hook from the top
    content = content.replace(hookRegex, '');

    // 2. Find const isSaved / const isInvoiceSaved and insert it right before
    const isSavedRegex = /(const\s+is(?:Invoice)?Saved\s*=)/;
    if (isSavedRegex.test(content)) {
      content = content.replace(isSavedRegex, `${hookMatch}\n\n  $1`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully moved hook in ${file}`);
    } else {
      console.warn(`Could not find const isSaved declaration in ${file}`);
    }
  }
});

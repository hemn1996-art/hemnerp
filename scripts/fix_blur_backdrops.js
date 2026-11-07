const fs = require('fs');
const path = require('path');

const files = [
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/PurchasePage.tsx',
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/PurchaseReturnPage.tsx',
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/SalesReturnPage.tsx',
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/InvoicePage.tsx',
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Replace dark backdrop and blur with transparent backdrop
  content = content.replace(/background:\s*"rgba\(15,\s*23,\s*42,\s*0\.3\)",\s*\r?\n\s*backdropFilter:\s*"blur\(2px\)",/g, 'background: "rgba(0, 0, 0, 0.001)",');
  content = content.replace(/background:\s*"rgba\(0,\s*0,\s*0,\s*0\.01\)",\s*\r?\n\s*backdropFilter:\s*"blur\(2px\)",/g, 'background: "rgba(0, 0, 0, 0.001)",');
  content = content.replace(/backdropFilter:\s*"blur\(2px\)",\s*\r?\n\s*background:\s*"rgba\(15,\s*23,\s*42,\s*0\.3\)",/g, 'background: "rgba(0, 0, 0, 0.001)",');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Cleaned backdrop in ${path.basename(file)}`);
}

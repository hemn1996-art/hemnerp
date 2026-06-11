const fs = require('fs');

const path = 'app/components/PurchaseReturnPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = 'value={formatCurrencyMapWithColors(supplierBalanceReductionByCurrency)}';
const replacementStr = 'value={formatCurrencyMap(supplierBalanceReductionByCurrency)}';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully replaced helper function in PurchaseReturnPage.tsx!");
} else {
  console.error("Target string not found in file!");
  process.exit(1);
}

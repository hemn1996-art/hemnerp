const fs = require('fs');

const path = 'app/components/PurchaseReturnPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `              <StatBox
                title="کۆی ماوەی ئەم پسووڵە"
                value={formatCurrencyMapWithColors(supplierBalanceReductionByCurrency)}
              />`;

const replacementStr = `              <StatBox
                title="کۆی ماوەی ئەم پسووڵە"
                value={formatCurrencyMapWithColors(supplierBalanceReductionByCurrency)}
                color="#dc2626"
              />`;

if (!content.includes(targetStr)) {
  // Let's do a more robust string replacement
  const alternateStr = `              <StatBox\r\n                title="کۆی ماوەی ئەم پسووڵە"\r\n                value={formatCurrencyMapWithColors(supplierBalanceReductionByCurrency)}\r\n              />`;
  if (content.includes(alternateStr)) {
    content = content.replace(alternateStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully fixed using CRLF match!");
  } else {
    console.error("Target string not found in file!");
    process.exit(1);
  }
} else {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully fixed using LF match!");
}

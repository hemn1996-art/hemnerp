const fs = require('fs');
const content = fs.readFileSync('app/components/PurchaseReturnPage.tsx', 'utf8');

const startIndex = content.indexOf('function formatCurrencyMap');
if (startIndex !== -1) {
  console.log(content.substring(startIndex, startIndex + 400));
} else {
  console.log("Not found");
}

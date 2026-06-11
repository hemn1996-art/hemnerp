const fs = require('fs');
const content = fs.readFileSync('app/components/PurchaseReturnPage.tsx', 'utf8');

console.log("has formatCurrencyMap:", content.includes('formatCurrencyMap'));
console.log("has formatCurrencyMapWithColors:", content.includes('formatCurrencyMapWithColors'));

const match = content.match(/function formatCurrencyMap[^{]*/g);
console.log("Matches:", match);

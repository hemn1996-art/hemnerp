const fs = require('fs');
const content = fs.readFileSync('app/components/SalesReturnPage.tsx', 'utf8');

console.log("has formatCurrencyMapWithColors:", content.includes('formatCurrencyMapWithColors'));
const match = content.match(/function formatCurrencyMap[^{]*/g);
console.log("Matches:", match);

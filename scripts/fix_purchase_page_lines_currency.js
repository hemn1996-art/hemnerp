const fs = require('fs');

const path = 'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/PurchasePage.tsx';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('lines: rows.map((row: any) => {')) {
    targetIdx = i;
    break;
  }
}

if (targetIdx !== -1) {
  console.log('Found at line:', targetIdx + 1);
  for (let j = targetIdx; j < targetIdx + 20; j++) {
    if (lines[j].includes('note: row.note,')) {
      lines.splice(j + 1, 0, '          currencyId: row.currencyId,');
      break;
    }
  }
  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('Successfully inserted currencyId into PurchasePage.tsx lines payload!');
}

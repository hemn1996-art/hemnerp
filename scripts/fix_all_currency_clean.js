const fs = require('fs');

function replaceInFile(filePath, searchStr, replaceStr) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced in ${filePath}`);
  } else {
    console.log(`Search string not found in ${filePath}`);
  }
}

// 1. QuotationPage.tsx
replaceInFile(
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/QuotationPage.tsx',
  'currencyId: line.currencyId || (Number(line.unitPrice) > 1000 ? 2 : (voucher.currencyId || 1)),',
  'currencyId: line.currencyId || voucher.currencyId || 1,'
);

// 2. invoices/page.tsx
replaceInFile(
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/reports/invoices/page.tsx',
  'const lineCurId = line.currencyId || (Number(line.unitPrice) > 1000 ? 2 : (voucher.currencyId || 1));',
  'const lineCurId = line.currencyId || voucher.currencyId || 1;'
);

replaceInFile(
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/reports/invoices/page.tsx',
  'const isIQD = line.currencyId === 2 || Number(line.currencyId) === 2 || Number(line.unitPrice) > 1000;',
  'const isIQD = line.currencyId === 2 || Number(line.currencyId) === 2;'
);

// 3. account-statement/page.tsx
replaceInFile(
  'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/reports/account-statement/page.tsx',
  'const lineCurId = line.currencyId || (Number(line.unitPrice) > 1000 ? 2 : (v.currencyId || 1));',
  'const lineCurId = line.currencyId || v.currencyId || 1;'
);

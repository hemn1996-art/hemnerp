const fs = require('fs');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Loading mappedRows: ensure currencyId checks unitPrice > 1000 fallback
  const oldLoadingPattern = /currencyId:\s*line\.currencyId\s*\|\|\s*voucher\.currencyId\s*\|\|\s*1/g;
  const newLoadingPattern = 'currencyId: line.currencyId || (Number(line.unitPrice) > 1000 ? 2 : (voucher.currencyId || 1))';
  if (oldLoadingPattern.test(content)) {
    content = content.replace(oldLoadingPattern, newLoadingPattern);
    changed = true;
  }

  // 2. Saving lines payload: ensure currencyId: row.currencyId is included
  const saveLinesTarget = `note: row.note,
          warehouseId,`;
  const saveLinesReplacement = `note: row.note,
          currencyId: row.currencyId,
          warehouseId,`;
  if (content.includes(saveLinesTarget)) {
    content = content.replace(saveLinesTarget, saveLinesReplacement);
    changed = true;
  }

  const saveLinesTarget2 = `note: row.note,
          warehouseId:`;
  const saveLinesReplacement2 = `note: row.note,
          currencyId: row.currencyId,
          warehouseId:`;
  if (content.includes(saveLinesTarget2) && !content.includes('currencyId: row.currencyId,')) {
    content = content.replace(saveLinesTarget2, saveLinesReplacement2);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

fixFile('c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/InvoicePage.tsx');
fixFile('c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/SalesReturnPage.tsx');
fixFile('c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/PurchaseReturnPage.tsx');
fixFile('c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/QuotationPage.tsx');

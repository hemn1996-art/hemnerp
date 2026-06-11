const fs = require('fs');

const files = [
    'app/components/PurchasePage.tsx',
    'app/components/PurchaseReturnPage.tsx',
    'app/components/SalesReturnPage.tsx'
];

files.forEach(path => {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/changePaidCurrency\(Number\(e\.target\.value\)\)/g, 'setPaidCurrencyId(Number(e.target.value))');
    fs.writeFileSync(path, content);
    console.log("Fixed", path);
});

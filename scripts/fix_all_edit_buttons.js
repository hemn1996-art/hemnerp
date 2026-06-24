const fs = require('fs');

const pages = [
    'PurchasePage.tsx',
    'PurchaseReturnPage.tsx',
    'SalesReturnPage.tsx',
    'ExpensePage.tsx',
    'QuotationPage.tsx',
    'MyDebtPage.tsx',
    'PeopleDebtPage.tsx',
    'DebtDiscountPage.tsx',
    'PeopleDebtDiscountPage.tsx',
    'CashDepositPage.tsx',
    'CashWithdrawalPage.tsx',
    'ProductTransferPage.tsx',
    'MaterialIssuePage.tsx',
    'WarehouseDamagePage.tsx',
    'WarehouseStockPage.tsx'
];

pages.forEach(page => {
    const path = `app/components/${page}`;
    if (!fs.existsSync(path)) return;
    
    let content = fs.readFileSync(path, 'utf8');

    // Fix referenceNo loading (if it exists)
    content = content.replace(/setInvoiceNumber\(String\(voucher\.id\)\);/g, 'setInvoiceNumber(voucher.referenceNo || String(voucher.id));');

    // Fix button text
    content = content.replace(/\{isLocked \? "خەزن کراوە" : "خەزنکردن"\}/g, '{isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}');
    content = content.replace(/\{isInvoiceLocked \? "خەزن کراوە" : "خەزنکردن"\}/g, '{isInvoiceLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}');
    content = content.replace(/\{isSaved \? "خەزن کراوە" : "خەزنکردن"\}/g, '{isSaved ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}');

    fs.writeFileSync(path, content);
    console.log("Fixed", path);
});

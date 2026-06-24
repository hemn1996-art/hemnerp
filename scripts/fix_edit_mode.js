const fs = require('fs');

function fixPage(path) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');

    // 1. Fix referenceNo loading
    content = content.replace(/setInvoiceNumber\(String\(voucher\.id\)\);/g, 'setInvoiceNumber(voucher.referenceNo || String(voucher.id));');

    // 2. Fix button text
    // We look for: {isInvoiceLocked ? "خەزن کراوە" : "خەزنکردن"}
    // Or: {isLocked ? "خەزن کراوە" : "خەزنکردن"}
    content = content.replace(/\{isInvoiceLocked \? "خەزن کراوە" : "خەزنکردن"\}/g, '{isInvoiceLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}');
    content = content.replace(/\{isLocked \? "خەزن کراوە" : "خەزنکردن"\}/g, '{isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}');

    fs.writeFileSync(path, content);
    console.log("Fixed", path);
}

fixPage('app/components/InvoicePage.tsx');
fixPage('app/components/MoneyInPage.tsx');
fixPage('app/components/MoneyOutPage.tsx');


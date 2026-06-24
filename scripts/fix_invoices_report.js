const fs = require('fs');
const path = 'app/reports/invoices/page.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    const searchString = 'const processedVouchers = useMemo(() => {\\n    let list = [...vouchers];';
    const replacement = `const processedVouchers = useMemo(() => {
    let list = [...vouchers];
    
    // Exclude cashbox transfers and exchanges from invoices report
    list = list.filter(v => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange");`;
    
    if (content.includes(searchString)) {
        content = content.replace(searchString, replacement);
        fs.writeFileSync(path, content);
        console.log('Successfully updated the file to exclude cashbox vouchers.');
    } else {
        console.log('Search string not found in app/reports/invoices/page.tsx');
    }
} else {
    console.log('File not found: app/reports/invoices/page.tsx');
}

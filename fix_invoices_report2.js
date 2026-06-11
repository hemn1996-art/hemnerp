const fs = require('fs');
const path = 'app/reports/invoices/page.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Find the exact line
    const targetLine = "const processedVouchers = useMemo(() => {";
    const replacement = `const processedVouchers = useMemo(() => {
    let list = [...vouchers];
    
    // Exclude cashbox transfers and exchanges from invoices report
    list = list.filter(v => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange");`;
    
    // Replace const processedVouchers = useMemo(() => {\n    let list = [...vouchers];
    // using regex
    content = content.replace(/const processedVouchers = useMemo\(\(\) => \{\s*let list = \[\.\.\.vouchers\];/, replacement);
    fs.writeFileSync(path, content);
    console.log('Successfully updated the file to exclude cashbox vouchers.');
} else {
    console.log('File not found: app/reports/invoices/page.tsx');
}

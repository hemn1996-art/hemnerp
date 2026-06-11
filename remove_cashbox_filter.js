const fs = require('fs');
const path = 'app/reports/invoices/page.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Remove the options
    content = content.replace('<option value="cashbox_transfer">گواستنەوەی پارە</option>', '');
    content = content.replace('<option value="cashbox_exchange">گۆڕینەوەی پارە</option>', '');
    
    fs.writeFileSync(path, content);
    console.log('Successfully removed cashbox options from filter.');
} else {
    console.log('File not found: app/reports/invoices/page.tsx');
}

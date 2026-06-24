const fs = require('fs');

const files = ['invoices', 'debts', 'items', 'material-movements', 'profit'].map(p => `c:/Users/ZETTA/OneDrive/Desktop/ok erp/app/reports/${p}/page.tsx`);

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('import MultiSelectDropdown')) {
    c = c.replace(/"use client";\s*/, '"use client";\n\nimport MultiSelectDropdown from "../../components/MultiSelectDropdown";\n');
    fs.writeFileSync(f, c);
    console.log('Added to', f);
  }
});

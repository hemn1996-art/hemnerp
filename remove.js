const fs = require('fs');
const files = ['invoices', 'debts', 'items', 'material-movements', 'profit'].map(p => `c:/Users/ZETTA/OneDrive/Desktop/ok erp/app/reports/${p}/page.tsx`);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const start = content.indexOf('function MultiSelectDropdown');
  if (start !== -1) {
    const endStr = '  );\r\n}';
    let end = content.indexOf(endStr, start);
    let usedLen = endStr.length;
    if (end === -1) {
      end = content.indexOf('  );\n}', start);
      usedLen = 6;
    }
    if (end !== -1) {
      end += usedLen;
      content = content.substring(0, start) + content.substring(end);
      fs.writeFileSync(file, content);
      console.log('Removed from', file);
    } else {
      console.log('End not found in', file);
    }
  } else {
    console.log('Already removed from', file);
  }
});

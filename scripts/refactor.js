const fs = require('fs');

const files = ['invoices', 'debts', 'items', 'material-movements', 'profit'].map(p => `c:/Users/ZETTA/OneDrive/Desktop/ok erp/app/reports/${p}/page.tsx`);

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import MultiSelectDropdown')) {
    content = content.replace(/(import .*;\n)+/, match => match + 'import MultiSelectDropdown from "../../components/MultiSelectDropdown";\n');
  }
  
  // Robust replacement
  content = content.replace(/function MultiSelectDropdown[\s\S]*?(?=\n(?:export )?function )/, '');
  
  content = content.replace(/label="جۆری پسوڵە"/g, 'label="جۆری پسوڵە" pluralLabel="جۆر"');
  content = content.replace(/label="جۆری خەرجی"/g, 'label="جۆری خەرجی" pluralLabel="جۆر"');
  content = content.replace(/label="کۆگا"/g, 'label="کۆگا" pluralLabel="کۆگا"');
  content = content.replace(/label="دۆخی پارەدان"/g, 'label="دۆخی پارەدان" pluralLabel="دۆخ"');
  content = content.replace(/label="فلتەری داشکاندن"/g, 'label="فلتەری داشکاندن" pluralLabel="فلتەر"');
  content = content.replace(/label="ئەکاونت"/g, 'label="ئەکاونت" pluralLabel="ئەکاونت"');
  content = content.replace(/label="کاسە"/g, 'label="کاسە" pluralLabel="کاسە"');
  
  fs.writeFileSync(file, content);
  console.log(file + ' updated');
});

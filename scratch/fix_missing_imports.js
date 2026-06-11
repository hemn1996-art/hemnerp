const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const usesFormattedInput = content.includes('<FormattedNumberInput');
  const importsFormattedInput = content.includes('import FormattedNumberInput from');

  if (usesFormattedInput && !importsFormattedInput) {
    console.log(`Adding missing import to: ${file}`);
    if (content.startsWith('"use client";')) {
      content = content.replace('"use client";', '"use client";\nimport FormattedNumberInput from "./FormattedNumberInput";');
    } else {
      content = 'import FormattedNumberInput from "./FormattedNumberInput";\n' + content;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully fixed import in ${file}`);
  }
});

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

const moneyKeywords = [
  'purchasePrice',
  'price',
  'returnPrice',
  'discount',
  'amount',
  'exchangeRate',
  'paidAmounts',
  'expenseTotal',
  'expense',
  'deliveryFee',
  'openingBalance',
  'balance',
  'creditLimit',
  'manualExpensePerUnit',
  'manualExpenseTotal',
  'displayedExpenseTotal'
];

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const isTarget = content.includes('editId?: string') || content.includes('editId?: string;') || file === 'AccountsPage.tsx';
  if (!isTarget) return;

  console.log(`Processing number inputs in: ${file}`);

  let modified = false;

  // Regex to match <input ... /> elements (with newline support)
  const inputRegex = /<input\b[\s\S]*?\/>/g;

  content = content.replace(inputRegex, (inputTag) => {
    // Check if this input is a money input
    const isMoneyInput = (inputTag.includes('inputMode="decimal"') || inputTag.includes('inputMode="numeric"')) &&
                         moneyKeywords.some(keyword => inputTag.includes(keyword));

    if (!isMoneyInput) return inputTag;

    // We found a money input! Let's convert it to FormattedNumberInput
    console.log(`  Replacing money input in ${file}: ${inputTag.substring(0, 100).replace(/\s+/g, ' ')}...`);
    modified = true;

    let newTag = inputTag;
    // 1. Change tag name
    newTag = newTag.replace(/^<input\b/, '<FormattedNumberInput');

    // 2. Remove inputMode, lang, dir if present
    newTag = newTag.replace(/\s*inputMode="[^"]*"/g, '');
    newTag = newTag.replace(/\s*lang="[^"]*"/g, '');
    newTag = newTag.replace(/\s*dir="[^"]*"/g, '');

    // 3. Update onChange handler
    // Handle both single line and multiline function declarations: (e) => or (event) =>
    newTag = newTag.replace(/(onChange=\{\s*\(\s*)(e|event)(\s*\)\s*=>)/g, '$1val$3');
    newTag = newTag.replace(/(onChange=\{\s*)(e|event)(\s*=>)/g, '$1val$3');
    
    newTag = newTag.replace(/e\.target\.value/g, 'val');
    newTag = newTag.replace(/event\.target\.value/g, 'val');
    newTag = newTag.replace(/onlyDecimal\(\s*val\s*\)/g, 'val');
    newTag = newTag.replace(/onlyInteger\(\s*val\s*\)/g, 'val');
    newTag = newTag.replace(/onlyPositiveDecimal\(\s*val\s*\)/g, 'val');

    return newTag;
  });

  if (modified) {
    // Add import if not present
    if (!content.includes('FormattedNumberInput')) {
      if (content.startsWith('"use client";')) {
        content = content.replace('"use client";', '"use client";\nimport FormattedNumberInput from "./FormattedNumberInput";');
      } else {
        content = 'import FormattedNumberInput from "./FormattedNumberInput";\n' + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully modified money inputs in ${file}`);
  }
});

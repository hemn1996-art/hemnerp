const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components';

const files = [
  'MoneyInPage.tsx',
  'MoneyOutPage.tsx',
  'InvoicePage.tsx',
  'PurchasePage.tsx',
  'SalesReturnPage.tsx',
  'PurchaseReturnPage.tsx',
  'PeopleDebtPage.tsx',
  'PeopleDebtDiscountPage.tsx',
  'MyDebtPage.tsx',
  'ExpensePage.tsx',
  'DebtDiscountPage.tsx'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Revert default rate state
  content = content.replace(/useState\("1500"\)/g, 'useState("150000")');
  content = content.replace(/setExchangeRate\("1500"\)/g, 'setExchangeRate("150000")');
  content = content.replace(/useState\('1500'\)/g, "useState('150000')");
  content = content.replace(/setExchangeRate\('1500'\)/g, "setExchangeRate('150000')");

  // 2. Revert load from database
  content = content.replace(/setExchangeRate\(String\(voucher\.exchangeRate\)\)/g, 'setExchangeRate(String(voucher.exchangeRate * 100))');
  content = content.replace(/setExchangeRate\(String\(invoice\.exchangeRate\)\)/g, 'setExchangeRate(String(invoice.exchangeRate * 100))');
  content = content.replace(/setExchangeRate\(String\(debt\.exchangeRate\)\)/g, 'setExchangeRate(String(debt.exchangeRate * 100))');
  content = content.replace(/setExchangeRate\(String\(expense\.exchangeRate\)\)/g, 'setExchangeRate(String(expense.exchangeRate * 100))');

  // 3. Update convertCurrency local functions
  content = content.replace(
    /const rate = toNumber\(exchangeRate\) \|\| 1500;/g,
    'const rate = (toNumber(exchangeRate) / 100) || 1500;'
  );

  // 4. Update the active rate in calculations to be rate / 100
  // Find "const rate = toNumber(exchangeRate);" and replace with / 100
  content = content.replace(
    /const rate = toNumber\(exchangeRate\);/g,
    'const rate = toNumber(exchangeRate) / 100;'
  );

  // 5. Update paidAmounts exchangeRate mapping
  let targetVar = 'invoiceCurrencyId';
  if (file === 'MoneyInPage.tsx') targetVar = 'activeTargetCurrencyId';
  else if (file === 'MoneyOutPage.tsx') targetVar = 'activeTargetCurrencyId';
  else if (file === 'PurchasePage.tsx') targetVar = 'purchaseCurrencyId';
  else if (file === 'SalesReturnPage.tsx') targetVar = 'returnCurrencyId';
  else if (file === 'PurchaseReturnPage.tsx') targetVar = 'returnCurrencyId';

  // Replace: (currencies.find((c: any) => c.id === p.currencyId)?.code === "USD") ? 1 : rate
  const regex = /\(currencies\.find\(\(c: any\) => c\.id === p\.currencyId\)\?\.code === "USD"\) \? 1 : rate/g;
  content = content.replace(regex, `(p.currencyId === ${targetVar}) ? 1 : rate`);

  // 6. Update UI Labels
  content = content.replace(/ڕەیتی 1 دۆلار بۆ پارەی دراو/g, 'ڕەیتی 100 دۆلار بۆ پارەی دراو');
  content = content.replace(/ڕەیتی 1 دۆلار بە دینار/g, 'ڕەیتی 100 دۆلار بە دینار');
  content = content.replace(/ڕەیتی 1 دۆلار/g, 'ڕەیتی 100 دۆلار');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});

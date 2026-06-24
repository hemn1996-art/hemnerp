const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'app/components');
const filesToFix = [
  "InvoicePage.tsx",
  "SalesReturnPage.tsx",
  "PurchaseReturnPage.tsx",
  "ExpensePage.tsx",
  "MoneyInPage.tsx",
  "MoneyOutPage.tsx",
  "MyDebtPage.tsx",
  "PeopleDebtPage.tsx",
  "PeopleDebtDiscountPage.tsx",
  "DebtDiscountPage.tsx",
  "CashDepositPage.tsx",
  "CashWithdrawalPage.tsx",
  "MaterialIssuePage.tsx",
  "WarehouseDamagePage.tsx",
  "WarehouseStockPage.tsx",
  "QuotationPage.tsx",
  "AccountsPage.tsx",
  "ItemsPage.tsx"
];

for (const file of filesToFix) {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace mockData import
  content = content.replace(
    /import\s+\{\s*currencies\s*\}\s+from\s+"([^"]*mockData)"/g,
    'import { currencies as mockCurrencies } from "$1"'
  );
  content = content.replace(
    /import\s+\{\s*accountTypes\s*,\s*currencies\s*\}\s+from\s+"([^"]*mockData)"/g,
    'import { accountTypes, currencies as mockCurrencies } from "$1"'
  );
  
  // Find where useStore hooks are declared
  if (content.includes('const storeCurrencies = useStore')) {
    continue; // Already fixed
  }

  // Insert store hooks right after the first useStore
  content = content.replace(
    /(const \w+ = useStore\([^)]+\)[^;]*;)/,
    `$1\n  const storeCurrencies = useStore((s: any) => s.currencies) || [];\n  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);\n  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;`
  );

  // Add fetchCurrencies to useEffect([])
  if (content.includes('useEffect(() => {') && !content.includes('fetchCurrencies()')) {
    content = content.replace(
      /(useEffect\(\(\) => \{[^]*?)(fetchAccounts\(\);|fetchProducts\(\);|fetchCashboxes\(\);)([^}]*\},\s*\[\]\);)/,
      `$1$2\n    if (storeCurrencies.length === 0) fetchCurrencies();$3`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${file}`);
}

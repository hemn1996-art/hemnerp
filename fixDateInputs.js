/**
 * Adds onClick showPicker to every type="date" input.
 * Handles both \n and \r\n line endings.
 */

const fs   = require("fs");
const path = require("path");

const ROOT = __dirname;

const FILES = [
  "app/components/ExpensePage.tsx",
  "app/components/CashDepositPage.tsx",
  "app/components/CashWithdrawalPage.tsx",
  "app/components/DebtDiscountPage.tsx",
  "app/components/MyDebtPage.tsx",
  "app/components/PeopleDebtPage.tsx",
  "app/components/PeopleDebtDiscountPage.tsx",
  "app/components/InvoicePage.tsx",
  "app/components/PurchasePage.tsx",
  "app/components/PurchaseReturnPage.tsx",
  "app/components/SalesReturnPage.tsx",
  "app/components/QuotationPage.tsx",
  "app/components/ProductTransferPage.tsx",
  "app/components/MaterialIssuePage.tsx",
  "app/components/WarehouseDamagePage.tsx",
  "app/components/WarehouseStockPage.tsx",
];

let total = 0;

for (const rel of FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { console.log(`SKIP: ${rel}`); continue; }

  let src = fs.readFileSync(fp, "utf8");
  if (src.includes(".showPicker()")) { console.log(`SKIP (done): ${rel}`); continue; }

  // Replace type="date" followed by either \r\n or \n
  const before = src;
  src = src.replace(/( +)type="date"\r?\n/g, (m, indent) => {
    const eol = m.includes("\r\n") ? "\r\n" : "\n";
    const oc  = `${indent}onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch {} }}${eol}`;
    return m + oc;
  });

  if (src !== before) {
    fs.writeFileSync(fp, src, "utf8");
    console.log(`✅ ${rel}`);
    total++;
  } else {
    console.log(`— ${rel}`);
  }
}

console.log(`\nDone – ${total} file(s).`);

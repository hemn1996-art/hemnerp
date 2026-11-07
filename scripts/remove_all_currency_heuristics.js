const fs = require('fs');

// The standard helper function to check if a currency is IQD
// Uses ONLY currencyId — never price magnitude as a heuristic
const IQD_COMMENT = `// isIQD: strictly use stored currencyId (2 = IQD), never guess from price magnitude`;
const IQD_HELPER = `Number(row.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(row.currencyId))?.code === "IQD")`;
const IQD_HELPER_R = `Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD")`;

// Replacements: remove the trailing "|| (unitCost > 1000)" and "|| cost > 1000"
const files = [
  {
    path: 'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/MaterialIssuePage.tsx',
    replacements: [
      {
        search: 'Number(row.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(row.currencyId))?.code === "IQD") || (unitCost > 1000)',
        replace: 'Number(row.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(row.currencyId))?.code === "IQD")'
      }
    ]
  },
  {
    path: 'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/WarehouseDamagePage.tsx',
    replacements: [
      {
        search: 'Number(row.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(row.currencyId))?.code === "IQD") || (unitCost > 1000)',
        replace: 'Number(row.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(row.currencyId))?.code === "IQD")'
      }
    ]
  },
  {
    path: 'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/WarehouseStockPage.tsx',
    replacements: [
      {
        // Line 678 - in totalAmount calculation
        search: 'const isIqdRow = Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD") || cost > 1000;',
        replace: 'const isIqdRow = Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD");'
      },
      {
        // Line 897 - in the StatBox convertedUsd calculation
        search: 'const isIqdRow = Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD") || cost > 1000;',
        replace: 'const isIqdRow = Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD");'
      }
    ]
  }
];

let totalReplacements = 0;
for (const file of files) {
  if (!fs.existsSync(file.path.replace(/\//g, '\\'))) {
    console.log(`File not found: ${file.path}`);
    continue;
  }
  let content = fs.readFileSync(file.path.replace(/\//g, '\\'), 'utf8');
  let modified = false;
  for (const r of file.replacements) {
    if (content.includes(r.search)) {
      // Replace ALL occurrences
      while (content.includes(r.search)) {
        content = content.replace(r.search, r.replace);
        totalReplacements++;
        modified = true;
        console.log(`Replaced in ${file.path}`);
      }
    } else {
      console.log(`[SKIP] not found in ${file.path}: "${r.search.slice(0, 60)}..."`);
    }
  }
  if (modified) {
    fs.writeFileSync(file.path.replace(/\//g, '\\'), content, 'utf8');
  }
}

console.log(`\nDone. ${totalReplacements} replacements made.`);

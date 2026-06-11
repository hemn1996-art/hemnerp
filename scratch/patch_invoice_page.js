const fs = require('fs');

const path = 'app/components/InvoicePage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Simple replacement for balanceCurrencyId inside AccountLike
const target = 'balanceByCurrency?: Record<string, number>;';
const target_crlf = 'balanceByCurrency?: Record<string, number>;\r\n';

if (content.includes(target_crlf)) {
  content = content.replace(target_crlf, 'balanceByCurrency?: Record<string, number>;\r\n  balanceCurrencyId?: number;\r\n');
  console.log("AccountLike patched (CRLF)");
} else if (content.includes(target)) {
  content = content.replace(target, 'balanceByCurrency?: Record<string, number>;\n  balanceCurrencyId?: number;');
  console.log("AccountLike patched (LF)");
} else {
  console.log("Target not found!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Patching of InvoicePage.tsx completed.");

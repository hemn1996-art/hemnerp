const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'components', 'PurchaseReturnPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The corrupted block:
const target = `            {paidCurrencies.length > 0 && (
              <div style={paidSummaryBox}>
                    if (blockIfLocked()) return;
                    setExchangeRate(onlyInteger(e.target.value));
                  }}
                  inputMode="numeric"
                  lang="en"
                  dir="ltr"
                  style={{ ...input, ...lockedFieldStyle }}
                />
              </Field>
            )}`;

const replacement = `            {paidCurrencies.length > 0 && (
              <div style={paidSummaryBox}>
                <strong>پارەی دراو:</strong>
                <span>{getPaidSummaryText()}</span>
              </div>
            )}

            {showRate && (
              <Field label="ڕەیتی 1 دۆلار بۆ پارەی دراو">
                <input
                  value={exchangeRate}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setExchangeRate(onlyInteger(e.target.value));
                  }}
                  inputMode="numeric"
                  lang="en"
                  dir="ltr"
                  style={{ ...input, ...lockedFieldStyle }}
                />
              </Field>
            )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed PurchaseReturnPage.tsx!");
} else {
  // Try a regex replacement just in case spaces/newlines differ
  const regex = /\{paidCurrencies\.length > 0 && \(\s*<div style=\{paidSummaryBox\}>\s*if \(blockIfLocked\(\)\) return;\s*setExchangeRate\(onlyInteger\(e\.target\.value\)\);\s*\}\}\s*inputMode="numeric"\s*lang="en"\s*dir="ltr"\s*style=\{\{\s*\.\.\.input,\s*\.\.\.lockedFieldStyle\s*\}\}\s*\/>\s*<\/Field>\s*\)\}/;
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully fixed PurchaseReturnPage.tsx via Regex!");
  } else {
    console.log("Could not find the target corrupted block in PurchaseReturnPage.tsx.");
  }
}

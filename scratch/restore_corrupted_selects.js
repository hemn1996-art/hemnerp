const fs = require('fs');
const path = require('path');

const projectDir = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components';

const fixes = {
  'DebtDiscountPage.tsx': {
    bad: `                <select
                  value={discountCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDiscountCurrencyId(Number(e.target.value));
                  }
                  style={{ ...input, ...lockedFieldStyle , minWidth: "130px" }}
                >`,
    good: `                <select
                  value={discountCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDiscountCurrencyId(Number(e.target.value));
                  }}
                  style={{ ...input, ...lockedFieldStyle, minWidth: "130px" }}
                >`
  },
  'ExpensePage.tsx': {
    bad: `                          <select
                  value={row.currencyId}
                  disabled={isLocked}
                  onChange={(e) => updateRow(row.id, {
                                currencyId: Number(e.target.value),
                              })
                            
                  style={{ ...smallSelect, ...lockedFieldStyle , minWidth: "130px", minWidth: "130px" }}
                          >`,
    good: `                          <select
                            value={row.currencyId}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateRow(row.id, {
                                currencyId: Number(e.target.value),
                              })
                            }
                            style={{ ...smallSelect, ...lockedFieldStyle, minWidth: "130px" }}
                          >`
  },
  'MyDebtPage.tsx': {
    bad: `                <select
                  value={discountCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDiscountCurrencyId(Number(e.target.value));
                  }
                  style={{ ...input, ...lockedFieldStyle , minWidth: "130px" }}
                >`,
    good: `                <select
                  value={discountCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDiscountCurrencyId(Number(e.target.value));
                  }}
                  style={{ ...input, ...lockedFieldStyle, minWidth: "130px" }}
                >`
  },
  'PeopleDebtDiscountPage.tsx': {
    bad: `                <select
                  value={discountCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDiscountCurrencyId(Number(e.target.value));
                  }
                  style={{ ...input, ...lockedFieldStyle , minWidth: "130px" }}
                >`,
    good: `                <select
                  value={discountCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDiscountCurrencyId(Number(e.target.value));
                  }}
                  style={{ ...input, ...lockedFieldStyle, minWidth: "130px" }}
                >`
  },
  'PeopleDebtPage.tsx': {
    bad: `                <select
                  value={currencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setCurrencyId(Number(e.target.value));
                  }
                  style={{ ...input, ...lockedFieldStyle , minWidth: "130px" }}
                >`,
    good: `                <select
                  value={currencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setCurrencyId(Number(e.target.value));
                  }}
                  style={{ ...input, ...lockedFieldStyle, minWidth: "130px" }}
                >`
  },
  'QuotationPage.tsx': {
    bad: `                          <select
                  value={row.currencyId}
                  disabled={isLocked}
                  onChange={(e) => updateRow(row.id, {
                                currencyId: Number(e.target.value),
                              })
                            
                  style={{ ...smallSelect, ...lockedFieldStyle , minWidth: "130px", minWidth: "130px" }}
                          >`,
    good: `                          <select
                            value={row.currencyId}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateRow(row.id, {
                                currencyId: Number(e.target.value),
                              })
                            }
                            style={{ ...smallSelect, ...lockedFieldStyle, minWidth: "130px" }}
                          >`
  }
};

Object.entries(fixes).forEach(([file, fix]) => {
  const filePath = path.join(projectDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Normalize CRLF to LF for comparison
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedBad = fix.bad.replace(/\r\n/g, '\n');
  const normalizedGood = fix.good.replace(/\r\n/g, '\n');

  if (normalizedContent.includes(normalizedBad)) {
    const result = normalizedContent.replace(normalizedBad, normalizedGood);
    const hasCRLF = content.includes('\r\n');
    fs.writeFileSync(filePath, hasCRLF ? result.replace(/\n/g, '\r\n') : result, 'utf8');
    console.log(`Successfully fixed select tag in ${file}`);
  } else {
    console.error(`Could not match target bad pattern in ${file}`);
  }
});

console.log("Corrections completed.");

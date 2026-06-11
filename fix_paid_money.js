const fs = require('fs');

function processFile(path) {
    if (!fs.existsSync(path)) return;
    
    let content = fs.readFileSync(path, 'utf8');
    
    const searchString = `<div style={twoCol}>
              <Field label="پارەی دراو">
                <input
                  value={paidAmounts[paidCurrencyId] || ""}
                  disabled={isInvoiceLocked}
                  onChange={(e) =>
                    updatePaidAmount(paidCurrencyId, e.target.value)
                  }
                  inputMode="decimal"
                  lang="en"
                  dir="ltr"
                  placeholder="0"
                  style={{ ...input, ...lockedFieldStyle }}
                />
              </Field>

              <Field label="دراو">
                <select
                  value={paidCurrencyId}
                  disabled={isInvoiceLocked}
                  onChange={(e) => changePaidCurrency(Number(e.target.value))}
                  style={{ ...input, ...lockedFieldStyle }}
                >
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>`;

    const searchString2 = searchString.replace('isInvoiceLocked', 'isLocked').replace('isInvoiceLocked', 'isLocked');

    const replacement = `<div style={{ maxWidth: 320 }}>
              <Field label="پارەی دراو">
                <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
                  <input
                    value={paidAmounts[paidCurrencyId] || ""}
                    disabled={isInvoiceLocked}
                    onChange={(e) => updatePaidAmount(paidCurrencyId, e.target.value)}
                    inputMode="decimal"
                    lang="en"
                    dir="ltr"
                    placeholder="0"
                    style={{ flex: 1, border: "none", outline: "none", padding: "8px 12px", background: isInvoiceLocked ? "#f3f4f6" : "#fff", cursor: isInvoiceLocked ? "not-allowed" : "text" }}
                  />
                  <select
                    value={paidCurrencyId}
                    disabled={isInvoiceLocked}
                    onChange={(e) => changePaidCurrency(Number(e.target.value))}
                    style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 12px", outline: "none", fontWeight: "bold", color: "#1e293b", cursor: isInvoiceLocked ? "not-allowed" : "pointer" }}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>`;

    let newContent = content;
    
    if (content.includes(searchString)) {
        newContent = content.replace(searchString, replacement);
    } else if (content.includes(searchString2)) {
        newContent = content.replace(searchString2, replacement.replace(/isInvoiceLocked/g, 'isLocked'));
    } else {
        console.log("Could not find the paid money box pattern in", path);
        return;
    }

    fs.writeFileSync(path, newContent);
    console.log("Updated", path);
}

const files = [
    'app/components/InvoicePage.tsx',
    'app/components/PurchasePage.tsx',
    'app/components/PurchaseReturnPage.tsx',
    'app/components/SalesReturnPage.tsx',
    'app/components/MoneyInPage.tsx',
    'app/components/MoneyOutPage.tsx'
];

files.forEach(processFile);

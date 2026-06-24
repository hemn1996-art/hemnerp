const fs = require('fs');

function processFile(path) {
    if (!fs.existsSync(path)) return;
    
    let content = fs.readFileSync(path, 'utf8');
    
    const lines = content.split('\\n');
    let startIndex = -1;
    let endIndex = -1;
    let lockedVar = 'isInvoiceLocked';

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('label="پارەی دراو"')) {
            // Found the start of the field.
            // Check if it's inside `<div style={twoCol}>`
            if (i > 0 && lines[i-1].includes('style={twoCol}')) {
                startIndex = i - 1;
                
                // Now find the end of the `twoCol` div
                let openDivs = 1;
                for (let j = startIndex + 1; j < lines.length; j++) {
                    if (lines[j].includes('<div')) openDivs++;
                    if (lines[j].includes('</div')) {
                        openDivs--;
                        if (openDivs === 0) {
                            endIndex = j;
                            break;
                        }
                    }
                }
                
                if (endIndex !== -1) {
                    // Check which locked variable it uses
                    const blockStr = lines.slice(startIndex, endIndex + 1).join('\\n');
                    if (blockStr.includes('disabled={isLocked}')) {
                        lockedVar = 'isLocked';
                    }
                    
                    break;
                }
            }
        }
    }

    if (startIndex !== -1 && endIndex !== -1) {
        const replacement = `            <div style={{ maxWidth: 320 }}>
              <Field label="پارەی دراو">
                <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
                  <input
                    value={paidAmounts[paidCurrencyId] || ""}
                    disabled={${lockedVar}}
                    onChange={(e) => updatePaidAmount(paidCurrencyId, e.target.value)}
                    inputMode="decimal"
                    lang="en"
                    dir="ltr"
                    placeholder="0"
                    style={{ flex: 1, border: "none", outline: "none", padding: "8px 12px", background: ${lockedVar} ? "#f3f4f6" : "#fff", cursor: ${lockedVar} ? "not-allowed" : "text" }}
                  />
                  <select
                    value={paidCurrencyId}
                    disabled={${lockedVar}}
                    onChange={(e) => changePaidCurrency(Number(e.target.value))}
                    style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 12px", outline: "none", fontWeight: "bold", color: "#1e293b", cursor: ${lockedVar} ? "not-allowed" : "pointer" }}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>`;

        lines.splice(startIndex, endIndex - startIndex + 1, replacement);
        fs.writeFileSync(path, lines.join('\\n'));
        console.log("Updated", path);
    } else {
        console.log("Could not find pattern in", path);
    }
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

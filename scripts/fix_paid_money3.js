const fs = require('fs');

function processFile(path) {
    if (!fs.existsSync(path)) return;
    
    let content = fs.readFileSync(path, 'utf8');
    
    // Find <Field label="پارەی دراو">
    const fieldIndex = content.indexOf('<Field label="پارەی دراو">');
    if (fieldIndex === -1) {
        console.log("Not found in", path);
        return;
    }
    
    // Find the `<div style={twoCol}>` right before it
    const divIndex = content.lastIndexOf('<div style={twoCol}>', fieldIndex);
    if (divIndex === -1) {
        console.log("No twoCol div found before field in", path);
        return;
    }
    
    // Find the end of the twoCol div
    let openDivs = 1;
    let pos = divIndex + '<div style={twoCol}>'.length;
    let endIndex = -1;
    
    while (pos < content.length) {
        const nextOpen = content.indexOf('<div', pos);
        const nextClose = content.indexOf('</div', pos);
        
        if (nextClose === -1) break;
        
        if (nextOpen !== -1 && nextOpen < nextClose) {
            openDivs++;
            pos = nextOpen + 4;
        } else {
            openDivs--;
            pos = nextClose + 5;
            if (openDivs === 0) {
                endIndex = nextClose + '</div>'.length + 1;
                break;
            }
        }
    }
    
    if (endIndex !== -1) {
        const block = content.substring(divIndex, endIndex);
        const lockedVar = block.includes('isInvoiceLocked') ? 'isInvoiceLocked' : 'isLocked';
        
        const replacement = `<div style={{ maxWidth: 320 }}>
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
            </div>
`;
        
        content = content.substring(0, divIndex) + replacement + content.substring(endIndex);
        fs.writeFileSync(path, content);
        console.log("Updated", path);
    } else {
        console.log("Could not find end of div in", path);
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

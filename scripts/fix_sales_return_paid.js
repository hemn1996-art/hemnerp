const fs = require('fs');
const path = 'app/components/SalesReturnPage.tsx';

let content = fs.readFileSync(path, 'utf8');

const fieldIndex = content.indexOf('<Field label="پارەی گەڕاوە بۆ کریار">');
if (fieldIndex !== -1) {
    const divIndex = content.lastIndexOf('<div style={twoCol}>', fieldIndex);
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
              <Field label="پارەی گەڕاوە بۆ کریار">
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
        console.log("Updated SalesReturnPage.tsx");
    }
}

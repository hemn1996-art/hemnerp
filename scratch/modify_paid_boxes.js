const fs = require('fs');
const path = require('path');

const componentsDir = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components';
const targetFiles = [
  'InvoicePage.tsx',
  'PurchasePage.tsx',
  'PurchaseReturnPage.tsx',
  'SalesReturnPage.tsx',
  'MoneyInPage.tsx',
  'MoneyOutPage.tsx'
];

targetFiles.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Search for the input element with value={paidAmounts[paidCurrencyId]}
  let index = 0;
  while (true) {
    index = content.indexOf('paidAmounts[paidCurrencyId]', index);
    if (index === -1) break;

    // Find the enclosing <Field ... </Field> around this index
    const startField = content.lastIndexOf('<Field', index);
    const endField = content.indexOf('</Field>', index);

    if (startField !== -1 && endField !== -1 && startField < index && index < endField) {
      const fieldBlock = content.slice(startField, endField + 8);
      
      // Let's parse label, disabled, and onChange from the existing block
      const labelMatch = fieldBlock.match(/label="([^"]+)"/);
      const labelText = labelMatch ? labelMatch[1] : 'پارەی دراو';

      const disabledMatch = fieldBlock.match(/disabled=\{([^}]+)\}/);
      const disabledVar = disabledMatch ? disabledMatch[1] : 'isLocked';

      const selectChangeMatch = fieldBlock.match(/onChange=\{\(e\)\s*=>\s*([^}]+)\}/);
      let selectChangeExpr = selectChangeMatch ? selectChangeMatch[1] : 'setPaidCurrencyId(Number(e.target.value))';

      let onChangeStr = '';
      if (selectChangeExpr.includes('changePaidCurrency')) {
        onChangeStr = 'changePaidCurrency(Number(e.target.value))';
      } else {
        onChangeStr = 'setPaidCurrencyId(Number(e.target.value))';
      }

      // We construct the multi-box replacement block using the original label text dynamically!
      const replacementBlock = `
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {currencies.filter(c => c.id === paidCurrencyId || (paidAmounts[c.id] && paidAmounts[c.id].trim() !== "" && parseFloat(paidAmounts[c.id]) !== 0)).map((currency) => {
                const isCurrent = currency.id === paidCurrencyId;
                return (
                  <Field key={currency.id} label={isCurrent ? "${labelText}" : \`\${currency.name} (\${currency.symbol})\`}>
                    <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
                      <input
                        value={paidAmounts[currency.id] || ""}
                        disabled={${disabledVar}}
                        onChange={(e) => updatePaidAmount(currency.id, e.target.value)}
                        inputMode="decimal"
                        lang="en"
                        dir="ltr"
                        placeholder="0"
                        style={{ flex: 1, border: "none", outline: "none", padding: "8px 12px", background: ${disabledVar} ? "#f3f4f6" : "#fff", cursor: ${disabledVar} ? "not-allowed" : "text" }}
                      />
                      <select
                        value={currency.id}
                        disabled={${disabledVar}}
                        onChange={(e) => ${onChangeStr}}
                        style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 12px", outline: "none", fontWeight: "bold", color: "#1e293b", cursor: ${disabledVar} ? "not-allowed" : "pointer", minWidth: "130px" }}
                      >
                        {currencies.map((curr) => (
                          <option key={curr.id} value={curr.id}>
                            {curr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                );
              })}
            </div>`;

      // Check if this Field is inside a wrapper div like <div style={{ maxWidth: 320 }}> or similar
      const prevDivIndex = content.lastIndexOf('<div', startField);
      const nextDivIndex = content.indexOf('</div>', endField);
      
      if (prevDivIndex !== -1 && nextDivIndex !== -1 && prevDivIndex < startField && endField < nextDivIndex) {
        const wrapperCandidate = content.slice(prevDivIndex, nextDivIndex + 6);
        if (wrapperCandidate.includes('maxWidth') || wrapperCandidate.includes('width: "100%"')) {
          content = content.slice(0, prevDivIndex) + replacementBlock + content.slice(nextDivIndex + 6);
          console.log(`Replaced parent wrapper for: ${file}`);
        } else {
          content = content.slice(0, startField) + replacementBlock + content.slice(endField + 8);
          console.log(`Replaced Field block for: ${file}`);
        }
      } else {
        content = content.slice(0, startField) + replacementBlock + content.slice(endField + 8);
        console.log(`Replaced Field block for: ${file}`);
      }
      
      break;
    } else {
      index += 'paidAmounts[paidCurrencyId]'.length;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Successfully updated: ${file}`);
  }
});

const fs = require('fs');

const filePath = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components/InvoicePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `              <InfoRow label="ئاگاداری دواکەوتن">
            <div style={totalGrid}>`;

const replacement = `              <InfoRow label="ئاگاداری دواکەوتن">
                {selectedAccount.debtAlertDays
                  ? \`\${selectedAccount.debtAlertDays} ڕۆژ\`
                  : "-"}
              </InfoRow>

              <InfoRow label="کەفیل">
                {selectedAccount.guarantorName || "-"}
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const result = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  const hasCRLF = content.includes('\r\n');
  fs.writeFileSync(filePath, hasCRLF ? result.replace(/\n/g, '\r\n') : result, 'utf8');
  console.log("Successfully repaired InvoicePage.tsx JSX tags!");
} else {
  console.error("Could not find the target section to repair.");
}

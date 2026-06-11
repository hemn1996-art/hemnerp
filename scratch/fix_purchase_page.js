const fs = require('fs');
const path = 'app/components/PurchasePage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block to replace
const targetStr = `          {supplier && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری دابینکەر</div>

              <InfoRow label="جۆری هەژمار">
                {getAccountTypeName(supplier.accountTypeId)}
              </InfoRow>

              <InfoRow label="ژمارەی تەلەفۆن">
                {supplier.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{supplier.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {supplier.address || "-"}
              </InfoRow>

              <InfoRow label="قەرزی پێشوو">
                {formatCurrencyMapWithColors(accountBalanceBeforeByCurrency)}
              </InfoRow>

              <InfoRow label="کۆی گشتی ماوە">
                {formatCurrencyMapWithColors(accountBalanceAfterByCurrency)}
              </InfoRow>
            </div>
          )}`;

const replacementStr = `          {supplier && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowSupplierInfo((prev) => !prev)}
              >
                {showSupplierInfo
                  ? "▲ شاردنەوەی زانیاری دابینکەر"
                  : "▼ زانیاری دابینکەر"}
              </button>
            </div>
          )}

          {supplier && showSupplierInfo && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری دابینکەر</div>

              <InfoRow label="جۆری هەژمار">
                {getAccountTypeName(supplier.accountTypeId)}
              </InfoRow>

              <InfoRow label="ژمارەی تەلەفۆن">
                {supplier.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{supplier.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {supplier.address || "-"}
              </InfoRow>

              <InfoRow label="قەرزی پێشوو">
                {formatCurrencyMapWithColors(accountBalanceBeforeByCurrency)}
              </InfoRow>

              <InfoRow label="کۆی گشتی ماوە">
                {formatCurrencyMapWithColors(accountBalanceAfterByCurrency)}
              </InfoRow>
            </div>
          )}`;

// Check with CRLF and LF
let index = content.indexOf(targetStr);
if (index === -1) {
  // Try with LF normalized
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
  index = normalizedContent.indexOf(normalizedTarget);
  if (index === -1) {
    console.error("Target block not found in PurchasePage.tsx");
    process.exit(1);
  }
  
  // Reconstruct using LF
  const prefix = normalizedContent.substring(0, index);
  const suffix = normalizedContent.substring(index + normalizedTarget.length);
  const newContent = prefix + replacementStr.replace(/\r\n/g, '\n') + suffix;
  fs.writeFileSync(path, newContent, 'utf8');
} else {
  const prefix = content.substring(0, index);
  const suffix = content.substring(index + targetStr.length);
  const newContent = prefix + replacementStr + suffix;
  fs.writeFileSync(path, newContent, 'utf8');
}

console.log("Successfully updated PurchasePage.tsx with supplier details toggle!");

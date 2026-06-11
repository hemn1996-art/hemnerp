const fs = require('fs');

const filePath = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components/PurchasePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `const toastCloseBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "white",
  fontSize: 26,
  borderRadius: 18,
  padding: 16,
  position: "var(--left-panel-position, sticky)" as any,
  top: 16,
};`;

const replacement = `const toastCloseBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "white",
  fontSize: 26,
  lineHeight: 1,
  cursor: "pointer",
  fontWeight: 900,
};

const pageGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--page-grid-cols, 360px 1fr)",
  gap: 18,
  alignItems: "stretch",
};

const leftPanel: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  position: "var(--left-panel-position, sticky)" as any,
  top: 16,
};`;

// Replace handling CRLF/LF normalized
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const result = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  // Write back preserving CRLF if the original file had it
  const hasCRLF = content.includes('\r\n');
  fs.writeFileSync(filePath, hasCRLF ? result.replace(/\n/g, '\r\n') : result, 'utf8');
  console.log("Successfully fixed PurchasePage.tsx layout styles!");
} else {
  console.error("Could not find the target toastCloseBtn declaration.");
}

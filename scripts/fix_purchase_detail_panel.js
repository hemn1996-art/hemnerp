const fs = require('fs');

const purchasePagePath = 'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/components/PurchasePage.tsx';
let content = fs.readFileSync(purchasePagePath, 'utf8');

// Replace detailPanel container in PurchasePage.tsx
const oldContainer = `<div style={{ ...detailPanel, marginTop: 0 }} onClick={(e) => e.stopPropagation()}>`;
const newContainer = `<div
                                  style={{
                                    ...detailPanel,
                                    position: "relative",
                                    zIndex: 9999,
                                    marginTop: 0,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >`;

if (content.includes(oldContainer)) {
  content = content.replace(oldContainer, newContainer);
  fs.writeFileSync(purchasePagePath, content, 'utf8');
  console.log('Successfully updated detailPanel container in PurchasePage.tsx');
} else {
  console.log('oldContainer not found in PurchasePage.tsx');
}

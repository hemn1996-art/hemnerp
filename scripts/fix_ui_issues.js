const fs = require('fs');
const path = require('path');

// 1. Fix maximumFractionDigits in all components
const componentsDir = path.join(__dirname, 'app/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // We are looking for minimumFractionDigits: 0, maximumFractionDigits: 2
  // and we change it to maximumFractionDigits: 1
  if (content.includes('maximumFractionDigits: 2')) {
    content = content.replace(/maximumFractionDigits:\s*2/g, 'maximumFractionDigits: 1');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}

// 2. Fix app/utils/formatNumber.ts
const utilPath = path.join(__dirname, 'app/utils/formatNumber.ts');
if (fs.existsSync(utilPath)) {
  let utilContent = fs.readFileSync(utilPath, 'utf8');
  utilContent = utilContent.replace(/maximumFractionDigits:\s*2/g, 'maximumFractionDigits: 1');
  utilContent = utilContent.replace(/Math\.round\(num \* 100\) \/ 100/g, 'Math.round(num * 10) / 10');
  fs.writeFileSync(utilPath, utilContent, 'utf8');
  console.log(`Updated formatNumber.ts`);
}

// 3. Remove "New Voucher" button from app/invoices/page.tsx
const invoicesPath = path.join(__dirname, 'app/invoices/page.tsx');
if (fs.existsSync(invoicesPath)) {
  let invContent = fs.readFileSync(invoicesPath, 'utf8');
  // the block is:
  // {editId && (
  //   <button
  //     onClick={() => clearEditId()}
  //     style={{
  //       ...
  //       پسووڵەی نوێ
  //     </button>
  // )}
  // We can just remove it using regex
  const regex = /\{editId && \(\s*<button[^>]*clearEditId[^>]*>[\s\S]*?پسووڵەی نوێ\s*<\/button>\s*\)\}/;
  invContent = invContent.replace(regex, '');
  fs.writeFileSync(invoicesPath, invContent, 'utf8');
  console.log(`Removed New Voucher button from invoices/page.tsx`);
}

// 4. Update sorting in api/products/route.ts to use id: 'desc' instead of createdAt: 'desc'
const productsApi = path.join(__dirname, 'app/api/products/route.ts');
if (fs.existsSync(productsApi)) {
  let prodContent = fs.readFileSync(productsApi, 'utf8');
  prodContent = prodContent.replace(/orderBy:\s*\{\s*createdAt:\s*"desc"\s*\}/g, 'orderBy: { id: "desc" }');
  fs.writeFileSync(productsApi, prodContent, 'utf8');
  console.log(`Updated sorting in api/products/route.ts`);
}

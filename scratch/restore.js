const fs = require('fs');
const path = require('path');

const mapPath = 'c:\\Users\\ZETTA\\OneDrive\\Desktop\\project\\.next\\server\\chunks\\ssr\\app_components_ItemsPage_tsx_0p12l5.._.js.map';
const outputPath = 'c:\\Users\\ZETTA\\OneDrive\\Desktop\\project\\app\\components\\ItemsPage.tsx';

try {
  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const originalSource = mapData.sourcesContent[0];
  fs.writeFileSync(outputPath, originalSource, 'utf8');
  console.log('Successfully restored ItemsPage.tsx from sourcemap!');
} catch (e) {
  console.error('Error during restoration:', e);
}

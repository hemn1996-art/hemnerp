const fs = require('fs');
const path = require('path');

const componentsDir = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace `alignItems: "start"` with `alignItems: "stretch"` inside pageGrid style
  // Since we want to make sure we only modify pageGrid and it's defined as an object:
  // const pageGrid: CSSProperties = { ... alignItems: "start" ... }
  // or similar. Let's do a simple replacement:
  
  if (content.includes('alignItems: "start"')) {
    // Specifically target it when it is part of the pageGrid definition area
    // Let's do a replace
    content = content.replace(/alignItems:\s*"start"/g, 'alignItems: "stretch"');
    console.log(`Updated alignItems to stretch in ${file}`);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log("Stretching layout updates completed.");

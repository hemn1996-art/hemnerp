const fs = require('fs');
const path = require('path');

const componentsDir = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  let index = 0;
  while ((index = content.indexOf('<select', index)) !== -1) {
    // Find the real closing '>' of the select tag by tracking brace nesting
    let bracesCount = 0;
    let endSelectIndex = -1;
    for (let i = index; i < content.length; i++) {
      const char = content[i];
      if (char === '{') bracesCount++;
      else if (char === '}') bracesCount--;
      else if (char === '>' && bracesCount === 0) {
        endSelectIndex = i;
        break;
      }
    }

    if (endSelectIndex === -1) {
      index += 7;
      continue;
    }

    const selectTag = content.substring(index, endSelectIndex + 1);
    const styleCount = (selectTag.match(/style=/g) || []).length;
    
    if (styleCount >= 2 && selectTag.includes('minWidth: "130px"')) {
      console.log(`Found duplicate styles on select in ${file}`);
      
      // Let's remove the style={{ minWidth: "130px" }}
      let cleanedTag = selectTag.replace(/style=\{\{\s*minWidth:\s*"130px"\s*\}\}/, '');
      
      // Find the remaining style attribute and inject minWidth: "130px"
      const doubleBraceMatch = cleanedTag.match(/style=\{\{\s*([\s\S]*?)\s*\}\}/);
      if (doubleBraceMatch) {
        const innerStyle = doubleBraceMatch[1];
        const replacementStyle = `style={{ ${innerStyle}, minWidth: "130px" }}`;
        cleanedTag = cleanedTag.replace(doubleBraceMatch[0], replacementStyle);
      } else {
        const singleBraceMatch = cleanedTag.match(/style=\{([^}]+)\}/);
        if (singleBraceMatch) {
          const innerStyle = singleBraceMatch[1];
          const replacementStyle = `style={{ ...${innerStyle}, minWidth: "130px" }}`;
          cleanedTag = cleanedTag.replace(singleBraceMatch[0], replacementStyle);
        }
      }

      content = content.substring(0, index) + cleanedTag + content.substring(endSelectIndex + 1);
      index += cleanedTag.length;
    } else {
      index += 7;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log("Improved duplicate styles scan and fix completed.");

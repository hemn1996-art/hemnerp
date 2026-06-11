const fs = require('fs');
const path = require('path');

const projectDir = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components';
const files = ['MyDebtPage.tsx', 'PeopleDebtPage.tsx', 'PeopleDebtDiscountPage.tsx'];

files.forEach(file => {
  const filePath = path.join(projectDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Let's match the incorrect onChange block:
  // onChange={(e) => {
  //   if (blockIfLocked()) return;
  //   setXYZ(Number(e.target.value));
  // }
  // style={{ ...input, ...lockedFieldStyle , minWidth: "130px" }}
  
  const regex = /onChange=\{\(e\)\s*=>\s*\{\s*\r?\n\s*if\s*\(blockIfLocked\(\)\)\s*return;\s*\r?\n\s*(setDebtCurrencyId|setCurrencyId|setDiscountCurrencyId)\(Number\(e\.target\.value\)\);\s*\r?\n\s*\}\s*\r?\n\s*style=\{\{\s*\*input,\s*\*lockedFieldStyle\s*,\s*minWidth:\s*"130px"\s*\}\}/g;

  // Let's do a more generic regex: match "onChange={(e) => { ... }" where the closing "}" for onChange is missing before "style={{"
  const genericRegex = /onChange=\{\(e\)\s*=>\s*\{\s*\r?\n\s*if\s*\(blockIfLocked\(\)\)\s*return;\s*\r?\n\s*([a-zA-Z0-9_]+)\(Number\(e\.target\.value\)\);\s*\r?\n\s*\}\s*\r?\n\s*style=\{\{\s*([^\}]+)\s*\}\}/g;

  // Wait, let's look at the bad pattern: it ends with "}" instead of "}}" because the onChange closing brace is missing!
  // Yes! "onChange={(e) => { ... }" starts with "{" and should end with "}}". But it ends with "}".
  // So:
  // onChange={(e) => {
  //   ...
  // }
  // style={{ ... }}
  
  const badPattern = /onChange=\{\(e\)\s*=>\s*\{\s*\r?\n\s*if\s*\(blockIfLocked\(\)\)\s*return;\s*\r?\n\s*([a-zA-Z0-9_]+)\(Number\(e\.target\.value\)\);\s*\r?\n\s*\}\s*\r?\n\s*style=\{\{\s*([^\}]+)\s*\}\}/g;

  if (content.match(badPattern)) {
    content = content.replace(badPattern, (match, setFn, styleBody) => {
      console.log(`Fixing select brace in ${file} for fn ${setFn}`);
      return `onChange={(e) => {
                    if (blockIfLocked()) return;
                    ${setFn}(Number(e.target.value));
                  }}
                  style={{ ${styleBody} }}`;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
    console.error(`Could not match regex in ${file}`);
  }
});

console.log("Improved brace fixes completed.");

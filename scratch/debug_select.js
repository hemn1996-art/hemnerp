const fs = require('fs');
const filePath = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components/MaterialIssuePage.tsx';
const content = fs.readFileSync(filePath, 'utf8');

let index = 0;
while ((index = content.indexOf('<select', index)) !== -1) {
  const endSelectIndex = content.indexOf('>', index);
  console.log(`Found <select at index ${index}, end index ${endSelectIndex}`);
  if (endSelectIndex !== -1) {
    const selectTag = content.substring(index, endSelectIndex + 1);
    console.log("selectTag:", JSON.stringify(selectTag));
    const styleCount = (selectTag.match(/style=/g) || []).length;
    console.log("styleCount:", styleCount);
    console.log("includes minWidth:", selectTag.includes('minWidth: "130px"'));
  }
  index += 7;
}

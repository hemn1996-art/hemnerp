const fs = require('fs');
const path = require('path');

const cacheDir = 'c:\\Users\\ZETTA\\OneDrive\\Desktop\\project\\.next\\dev\\cache\\turbopack';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

try {
  if (fs.existsSync(cacheDir)) {
    const files = walkDir(cacheDir);
    console.log('Total cache files:', files.length);
    for (const file of files) {
      if (file.endsWith('.sst')) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('function AddItemForm') && content.includes('const [name, setName]')) {
          console.log('Found match in file:', file);
          console.log('File size:', content.length);
          // Let's find if it has the whole block or looks like the source code
          const startIdx = content.indexOf('function AddItemForm');
          console.log('Snippet:', content.slice(startIdx, startIdx + 1000));
        }
      }
    }
  } else {
    console.log('Cache directory does not exist');
  }
} catch (e) {
  console.error(e);
}

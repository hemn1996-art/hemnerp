const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/components/ItemsPage.tsx');
const buf = fs.readFileSync(filePath);

// We know the first 800 lines are already saved in our context.
// Let's find a safe starting point (like index 20000) and decode everything from there to the end.
// We write it to scratch/tail.txt so it can be viewed safely.
const tailBuf = buf.slice(20000);
fs.writeFileSync(path.join(__dirname, 'tail.txt'), tailBuf.toString('utf8'));
console.log('Tail written to tail.txt');

const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'app', 'components', 'PeopleDebtPage.tsx');
const destPath = path.join(__dirname, '..', 'app', 'components', 'PeopleDebtDiscountPage.tsx');

let code = fs.readFileSync(srcPath, 'utf8');

// Replace component name
code = code.replace(/PeopleDebtPage/g, 'PeopleDebtDiscountPage');

// Replace page title / headers
code = code.replace(/\"قەرزم لای خەڵکە\"/g, '"داشکاندن لە قەرزی خەڵک"');
code = code.replace(/\>قەرزم لای خەڵکە\</g, '>داشکاندن لە قەرزی خەڵک<');

// Replace toast messages
code = code.replace(/پسوڵەی قەرزم لای خەڵکە/g, 'پسوڵەی داشکاندن لە قەرزی خەڵکە');

// Replace "بڕی قەرز" labels
code = code.replace(/\"بڕی قەرز\"/g, '"بڕی داشکاندن"');

// Replace "بڕی قەرز" inside validation toast
code = code.replace(/تکایە بڕی قەرز داغڵ بکە/g, 'تکایە بڕی داشکاندن داغڵ بکە');

fs.writeFileSync(destPath, code, 'utf8');
console.log('Restored and fixed PeopleDebtDiscountPage.tsx successfully!');

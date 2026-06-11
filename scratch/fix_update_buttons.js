const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it's one of the target pages
  if (!content.includes('editId?: string') && !content.includes('editId?: string;')) {
    return;
  }

  const isInvoice = file === 'InvoicePage.tsx';

  // Check if already modified
  if (content.includes('!!editId && isSaved') || content.includes('!!editId && isInvoiceSaved')) {
    console.log(`Skipping already modified update button in: ${file}`);
    return;
  }

  console.log(`Processing update button in: ${file}`);

  // 1. Inject the useEffect that syncs savedSnapshot after loading data
  const targetHookString = `  useEffect(() => {
    setIsEditLoading(!!editId);
  }, [editId]);`;

  if (content.includes(targetHookString)) {
    const syncEffectMarkup = isInvoice ? `
  useEffect(() => {
    if (editId && !isEditLoading) {
      setSavedInvoiceSnapshot(currentInvoiceSnapshot);
    }
  }, [editId, isEditLoading, currentInvoiceSnapshot]);` : `
  useEffect(() => {
    if (editId && !isEditLoading) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [editId, isEditLoading, currentSnapshot]);`;

    content = content.replace(targetHookString, targetHookString + '\n' + syncEffectMarkup);
  } else {
    console.warn(`Could not find expected hook insertion point in ${file}`);
  }

  // 2. Find and update the Save/Update button
  const buttonText = isInvoice ? '{isInvoiceLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}' : '{isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}';
  const textIdx = content.indexOf(buttonText);
  if (textIdx !== -1) {
    const btnStartIdx = content.lastIndexOf('<button', textIdx);
    if (btnStartIdx !== -1) {
      let buttonSubstring = content.substring(btnStartIdx, textIdx + buttonText.length + 9);
      
      buttonSubstring = buttonSubstring.replace(/disabled=\{(isLocked|isInvoiceLocked)\}/, (_, match) => 
        `disabled={${match} || (!!editId && ${isInvoice ? 'isInvoiceSaved' : 'isSaved'})}`
      );
      
      buttonSubstring = buttonSubstring.replace(/opacity:\s*(isLocked|isInvoiceLocked)\s*\?\s*0\.55\s*:\s*1/, (_, match) => 
        `opacity: (${match} || (!!editId && ${isInvoice ? 'isInvoiceSaved' : 'isSaved'})) ? 0.55 : 1`
      );
      
      buttonSubstring = buttonSubstring.replace(/cursor:\s*(isLocked|isInvoiceLocked)\s*\?\s*"not-allowed"\s*:\s*"pointer"/, (_, match) => 
        `cursor: (${match} || (!!editId && ${isInvoice ? 'isInvoiceSaved' : 'isSaved'})) ? "not-allowed" : "pointer"`
      );
      
      content = content.substring(0, btnStartIdx) + buttonSubstring + content.substring(btnStartIdx + buttonSubstring.length);
      console.log(`Successfully fixed update button in ${file}`);
    } else {
      console.warn(`Found button text but no starting <button in ${file}`);
    }
  } else {
    console.warn(`Could not find update button text in ${file}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

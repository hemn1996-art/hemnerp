const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Detect state name, setter name, and current snapshot name
  // Match: const [savedSnapshot, setSavedSnapshot] = useState("");
  // Match: const [savedInvoiceSnapshot, setSavedInvoiceSnapshot] = useState("");
  const stateMatch = content.match(/const\s+\[(savedSnapshot|savedInvoiceSnapshot),\s*(setSavedSnapshot|setSavedInvoiceSnapshot)\]\s*=\s*useState\(['"]['"]\);/);

  if (!stateMatch) return;

  const stateName = stateMatch[1];
  const setterName = stateMatch[2];
  const snapshotName = stateName === 'savedInvoiceSnapshot' ? 'currentInvoiceSnapshot' : 'currentSnapshot';

  console.log(`Processing file: ${file}`);
  console.log(`  stateName: ${stateName}, setterName: ${setterName}, snapshotName: ${snapshotName}`);

  let modified = false;

  // 1. Replace the editId useEffect
  // Find:
  // useEffect(() => {
  //   setIsEditLoading(!!editId);
  // }, [editId]);
  const editIdEffectPattern = /useEffect\(\(\)\s*=>\s*\{\s*setIsEditLoading\(!!editId\);\s*\}\s*,\s*\[editId\]\);/;
  if (editIdEffectPattern.test(content)) {
    const replacement = `useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      ${setterName}("");
    }
  }, [editId]);`;
    content = content.replace(editIdEffectPattern, replacement);
    console.log(`  Updated editId useEffect`);
    modified = true;
  }

  // 2. Replace the snapshot synchronization useEffect
  // Find:
  // useEffect(() => {
  //   if (editId && !isEditLoading) {
  //     setSavedSnapshot(currentSnapshot);
  //   }
  // }, [editId, isEditLoading, currentSnapshot]);
  // or variations with whitespaces/newlines/indentations
  const syncEffectPattern = new RegExp(
    `useEffect\\(\\(\\)\\s*=>\\s*\\{\\s*if\\s*\\(\\s*editId\\s*&&\\s*!isEditLoading\\s*\\)\\s*\\{\\s*${setterName}\\(\\s*${snapshotName}\\s*\\);\\s*\\}\\s*\\}\\s*,\\s*\\[\\s*editId\\s*,\\s*isEditLoading\\s*,\\s*${snapshotName}\\s*\\]\\s*\\);`
  );

  if (syncEffectPattern.test(content)) {
    const replacement = `useEffect(() => {
    if (editId && !isEditLoading && !${stateName}) {
      ${setterName}(${snapshotName});
    }
  }, [editId, isEditLoading, ${snapshotName}, ${stateName}]);`;
    content = content.replace(syncEffectPattern, replacement);
    console.log(`  Updated snapshot sync useEffect`);
    modified = true;
  } else {
    // Let's try matching with looser regex (e.g. without if statement on single line)
    console.log(`  WARNING: Did not find match for syncEffectPattern in ${file}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Successfully modified ${file}\n`);
  }
});

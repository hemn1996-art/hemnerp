const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/components');
const files = fs.readdirSync(dir);

const overlayMarkup = `
      {isEditLoading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(2px)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "all"
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "5px solid #e5e7eb",
            borderTop: "5px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "12px"
          }} />
          <style>{\`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          \`}</style>
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
            باردەکرێت...
          </span>
        </div>
      )}`;

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it's one of the target pages
  if (!content.includes('editId?: string') && !content.includes('editId?: string;')) {
    return;
  }

  // Skip if already modified
  if (content.includes('isEditLoading')) {
    console.log(`Skipping already modified: ${file}`);
    return;
  }

  console.log(`Processing: ${file}`);

  // 1. Inject state hook after component declaration opening brace
  // Match: export default function ComponentName(...) {
  const componentDeclRegex = /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/;
  if (!componentDeclRegex.test(content)) {
    console.warn(`Could not find component declaration in ${file}`);
    return;
  }

  const stateInjection = `
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
  }, [editId]);
`;

  content = content.replace(componentDeclRegex, `$1${stateInjection}`);

  // 2. Modify fetch catch to handle loading completed
  const catchRegex = /\.catch\(\(err\)\s*=>\s*console\.error\("[^"]*",\s*err\)\);?/g;
  if (catchRegex.test(content)) {
    content = content.replace(catchRegex, '.catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));');
  } else {
    // try fallback for any console.error inside catch
    const catchRegexMuted = /\.catch\(\(err\)\s*=>\s*\{?\s*console\.error\([^)]*\);?\s*\}?\);?/g;
    if (catchRegexMuted.test(content)) {
      content = content.replace(catchRegexMuted, '.catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));');
    } else {
      console.warn(`Could not find catch block pattern in ${file}`);
    }
  }

  // 3. Inject loading overlay inside the main return <div style={page}>
  const returnRegex = /(return\s*\(\r?\n\s*)<div\s+style=\{page\}>/;
  if (returnRegex.test(content)) {
    content = content.replace(returnRegex, `$1<div style={page}>${overlayMarkup}`);
  } else {
    console.warn(`Could not find return <div style={page}> in ${file}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully fixed ${file}`);
});

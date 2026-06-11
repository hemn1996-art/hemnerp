const fs = require('fs');
const path = 'app/reports/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace state definition
content = content.replace(
  'const [isScrolled, setIsScrolled] = useState(false);',
  'const [isScrolled, setIsScrolled] = useState(false);\n  const [lastScrollTop, setLastScrollTop] = useState(0);'
);

// Replace onScroll logic
const onScrollSearch = 'onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 50)}';
const onScrollReplacement = `onScroll={(e) => {
          const st = e.currentTarget.scrollTop;
          if (st > lastScrollTop && st > 50) {
             setIsScrolled(true);
          } else if (st < lastScrollTop) {
             setIsScrolled(false);
          }
          setLastScrollTop(st <= 0 ? 0 : st);
        }}`;
        
content = content.replace(onScrollSearch, onScrollReplacement);

fs.writeFileSync(path, content);
console.log("Updated InvoicesPage global search auto-hide behavior");

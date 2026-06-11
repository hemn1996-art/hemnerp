const fs = require('fs');

const filePath = 'app/components/InvoicePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  useEffect(() => {
    if (editId && !isEditLoading && !savedInvoiceSnapshot) {
      setSavedInvoiceSnapshot(currentInvoiceSnapshot);
    }
  }, [editId, isEditLoading, currentInvoiceSnapshot, savedInvoiceSnapshot]);`;

const replacement = `  useEffect(() => {
    if (editId && !isEditLoading && !savedInvoiceSnapshot) {
      setSavedInvoiceSnapshot(currentInvoiceSnapshot);
    }
  }, [editId, isEditLoading, currentInvoiceSnapshot, savedInvoiceSnapshot]);

  const isInvoiceSaved =
    rows.length > 0 && savedInvoiceSnapshot === currentInvoiceSnapshot;

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    const searched = q
      ? accounts.filter((account) => {
          const typeName = getAccountTypeName(account.accountTypeId);
          return (
            String(account.name || "").toLowerCase().includes(q) ||
            String(account.phone || "").toLowerCase().includes(q) ||
            String(account.city || "").toLowerCase().includes(q) ||
            typeName.toLowerCase().includes(q)
          );
        })
      : accounts;

    const seen = new Set();
    const unique = [];
    for (const acc of searched) {
      const normName = String(acc.name || "").trim().toLowerCase();
      const normPhone = String(acc.phone || "").replace(/[^0-9]/g, "");
      const key = \`\${normName}_\${normPhone}\`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(acc);
      }
    }
    return unique;
  }, [accountSearch, accounts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    let list = products;
    if (invoiceType === "فرۆشتن") {
      list = products.filter((product) => (product.stock || 0) > 0);
    }
    if (!q) return list;

    return list.filter((product) => {
      return (
        String(product.name || "").toLowerCase().includes(q) ||
        String(product.code || "").toLowerCase().includes(q) ||
        String(product.barcode || "").toLowerCase().includes(q) ||
        String(product.category || "").toLowerCase().includes(q) ||
        String(product.brand || "").toLowerCase().includes(q)
      );
    });
  }, [productSearch, products, invoiceType]);

  const paidConverted = getTotalPaidInInvoiceCurrency();
  const remaining = Math.max(total - paidConverted, 0);

  const oldDebt = Number(selectedAccount?.balance || 0);
  const newDebt = oldDebt + remaining;

  function showToast(message: string, type: ToastType = "error") {
    setToastMessage(message);
    setToastType(type);

    window.setTimeout(() => {
      setToastMessage("");
    }, 3500);
  }

  function blockIfLocked() {
    if (isInvoiceLocked) {
      showToast("ئەم پسوڵەیە خەزن کراوە و ئیتر ناتوانرێت گۆڕانکاری لەسەر بکرێت.");
      return true;
    }

    return false;
  }

  function onlyInteger(value: string) {
    return value.replace(/[^\\d]/g, "");
  }

  function onlyDecimal(value: string) {
    const cleaned = value.replace(/[^\\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;

    return (
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\\./g, "")
    );
  }

  function toNumber(value: string | number | undefined) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((c) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((c) => c.id === currencyId)?.code || "";
  }

  function convertCurrency(amount: number, fromId: number, toId: number) {
    if (fromId === toId) return amount;

    const from = currencies.find((c) => c.id === fromId);
    const to = currencies.find((c) => c.id === toId);
    const rate = toNumber(exchangeRate) || 1500;

    if (!from || !to) return amount;

    if (from.code === "IQD" && to.code === "USD") return amount / rate;
    if (from.code === "USD" && to.code === "IQD") return amount * rate;

    return amount;
  }

  function getPaidCurrencies() {
    return Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x) => x.amount > 0);
  }

  function isMixedCurrencyPaid() {
    return getPaidCurrencies().length > 1;
  }

  function getTotalPaidInInvoiceCurrency() {
    return getPaidCurrencies().reduce((sum, item) => {
      return (
        sum + convertCurrency(item.amount, item.currencyId, invoiceCurrencyId)
      );
    }, 0);
  }

  function getPaidSummaryText() {
    const paidList = getPaidCurrencies();

    if (paidList.length === 0) return "0";

    return paidList
      .map((item) => {
        const symbol = getCurrencySymbol(item.currencyId);
        const code = getCurrencyCode(item.currencyId);

        if (code === "IQD") {
          return \`\${Number(item.amount).toLocaleString("en-US")} دینار\`;
        }

        return \`\${symbol}\${Number(item.amount).toLocaleString("en-US")}\`;
      })
      .join(" + ");
  }

  function getDiscountAmount(
    base: number,
    mode: DiscountMode,
    valueText: string
  ) {
    const value = toNumber(valueText);
    if (mode === "percent") return (base * value) / 100;
    return value;
  }

  function getRowBaseTotal(row: InvoiceRow) {
    return toNumber(row.qty) * row.packageQuantity * toNumber(row.price);
  }

  function getRowDiscountAmount(row: InvoiceRow) {
    return getDiscountAmount(
      getRowBaseTotal(row),
      row.discountMode,
      row.discountValue
    );
  }

  function getRowNetTotalInRowCurrency(row: InvoiceRow) {
    return Math.max(getRowBaseTotal(row) - getRowDiscountAmount(row), 0);
  }

  function getRowTotal(row: InvoiceRow) {
    return convertCurrency(
      getRowNetTotalInRowCurrency(row),
      row.currencyId,
      invoiceCurrencyId
    );
  }

  function getAccountTypeName(accountTypeId?: number) {
    const type = accountTypesStore.find((x: any) => Number(x.id) === Number(accountTypeId)) || accountTypes.find((x) => Number(x.id) === Number(accountTypeId));
    return type?.name || "-";
  }

  function formatMoney(value: number, symbol = invoiceSymbol) {
    return \`\${Number(value || 0).toLocaleString("en-US")} \${symbol}\`;
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";
    const [year, month, day] = dateText.split("-");
    return \`\${day}/\${month}/\${year}\`;
  }

  function availableText(row: InvoiceRow) {
    const totalAvailable = row.availableQty || 0;
    const packageQty = row.packageQuantity || 1;`;

// Handle CRLF vs LF differences safely
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const normReplacement = replacement.replace(/\r\n/g, '\n');
  const index = normContent.indexOf(normTarget);
  
  // Need to also clean up the broken code that follows it in the file if present
  // Specifically: line 627 was "}" and line 628 was "if (packageQty > 1) {"
  // The normalized file has:
  // useEffect(...);
  // 
  // 
  //     if (packageQty > 1) {
  
  // Let's do a simple replace of useEffect + the broken remnants up to the start of "if (packageQty > 1) {"
  const brokenPartTarget = normTarget + '\n\n\n    if (packageQty > 1) {';
  const brokenPartReplacement = normReplacement + '\n    if (packageQty > 1) {';
  
  if (normContent.includes(brokenPartTarget)) {
    content = normContent.replace(brokenPartTarget, brokenPartReplacement);
    console.log("Restored successfully with broken remnants removed.");
  } else {
    content = normContent.replace(normTarget, normReplacement);
    console.log("Restored successfully.");
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
} else {
  console.log("Target not found!");
}

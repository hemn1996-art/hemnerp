const fs = require('fs');

const path = 'app/components/SalesReturnPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the top useEffect hooks
const target1 = `  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

      fetch(\`/api/vouchers/\${editId}\`)`;

const target1_crlf = target1.replace(/\n/g, '\r\n');

const replacement1 = `  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  useEffect(() => {
    if (!editId) {
      setInvoiceNumber(Date.now().toString().slice(-6));
      setCreatedTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setInvoiceDate(new Date().toISOString().slice(0, 10));
    }
  }, [editId]);

  useEffect(() => {
    if (editId) {
      fetch(\`/api/vouchers/\${editId}\`)`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("Replaced top hooks (LF)");
} else if (content.includes(target1_crlf)) {
  content = content.replace(target1_crlf, replacement1.replace(/\n/g, '\r\n'));
  console.log("Replaced top hooks (CRLF)");
} else {
  console.log("Top hooks match not found!");
}

// 2. Fix the resetInvoice and truncated helper functions block
const target2 = `  function resetInvoice() {
    setInvoiceNumber(Date.now().toString().slice(-6));
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setCustomerId(undefined);
    setCustomerSearch("");
    setShowCustomerInfo(false);
    setShowCustomerList(false);
    setRows([]);
    setOpenedDetailRowId(null);
    setPaidAmounts({});
          )}`;

const target2_crlf = target2.replace(/\n/g, '\r\n');

const replacement2 = `  function resetInvoice() {
    setInvoiceNumber(Date.now().toString().slice(-6));
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setCustomerId(undefined);
    setCustomerSearch("");
    setShowCustomerInfo(false);
    setShowCustomerList(false);
    setRows([]);
    setOpenedDetailRowId(null);
    setPaidAmounts({});
    setPaidCurrencyId(defaultCurrency.id);
    setExchangeRate("1500");
    setInternalNote("");
    setPrintNote("");
    setShowInvoiceNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
    setOriginalVoucher(null);
  }

  function hasUnsavedData() {
    const hasPaid = Object.values(paidAmounts).some((x) => x.trim() !== "");

    return (
      customerId !== undefined ||
      customerSearch.trim() !== "" ||
      rows.length > 0 ||
      hasPaid ||
      internalNote.trim() !== "" ||
      printNote.trim() !== ""
    );
  }

  function handleNewInvoice() {
    if (hasUnsavedData() && !isSaved && !isLocked) {
      setShowNewInvoiceConfirm(true);
      return;
    }

    resetInvoice();
  }

  function saveVoucher(action: "keep_credit" | "cross_deduct" | null) {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    setExcessModalConfig(null);

    const rate = toNumber(exchangeRate) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (customer ? getSingleAccountBalanceCurrencyId(customer) : 1);
    const before = accountBalanceBeforeByCurrency;

    const extraHandling = action === "cross_deduct"
      ? "convert_to_other_currency"
      : (action === "keep_credit" ? "keep_as_same_currency_balance" : null);

    const paidList = Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x) => x.amount > 0);

    const result = calculateLedgerEntries({
      type: "sales_return",
      netAmount: totalReturnInBase,
      currencyId: returnCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map(p => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: p.currencyId === 1 ? 1 : rate
      })),
      extraPaymentHandling: extraHandling,
      balanceBeforeByCurrency: before
    });

    const combineDateAndTime = (dateStr: string, timeStr: string) => {
      try {
        if (!dateStr) return new Date().toISOString();
        let cleanTime = (timeStr || "").trim();
        const ampmMatch = cleanTime.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\\s*(AM|PM)$/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const minutes = ampmMatch[2];
          const ampm = ampmMatch[3].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          cleanTime = hours.toString().padStart(2, "0") + ":" + minutes;
        }
        const hhmmMatch = cleanTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
        if (hhmmMatch) {
          const hours = hhmmMatch[1].padStart(2, "0");
          const minutes = hhmmMatch[2];
          return new Date(dateStr + "T" + hours + ":" + minutes + ":00Z").toISOString();
        }
        const fallback = new Date(dateStr + " " + cleanTime);
        if (!isNaN(fallback.getTime())) return fallback.toISOString();
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate.toISOString();
      } catch (e) {
        console.error("Error combining date and time:", e);
      }
      return new Date().toISOString();
    };

    const payload = {
      type: "sales_return",
      referenceNo: String(invoiceNumber),
      date: combineDateAndTime(invoiceDate, createdTime),
      accountId: customerId || null,
      cashboxId: cashboxId || null,
      currencyId: returnCurrencyId,
      exchangeRate: rate,
      totalAmount: totalReturnInBase,
      totalDiscount: 0,
      netAmount: totalReturnInBase,
      internalNote: internalNote,
      printNote: printNote,
      employeeName: employeeName,
      lines: rows.map((row) => ({
        productId: row.productId,
        qty: toNumber(row.qty) * row.packageQuantity,
        unitPrice: toNumber(row.returnPrice),
        discountPercent: 0,
        discountAmount: toNumber(row.discount),
        lineTotal: getRowTotal(row),
        note: row.note,
      })),
      paidAmounts: paidList.map(p => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: p.currencyId === 1 ? 1 : rate
      })),
      ledgerEntries: result.ledgerEntries,
      extraPaymentHandling: extraHandling
    };

    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise.then((res) => {
      if (res) {
        fetchProducts();
        setSavedSnapshot(currentSnapshot);
        if (editId) {
          showToast("پسوڵەکە نوێکرایەوە ✅", "success");
        } else {
          setIsLocked(true);
          showToast("پسوڵەی گەڕانەوەی فرۆشتن خەزن کرا ✅ ستۆک زیادکرا، قاسە کەمکرا، باڵانس و قازانج نوێکرایەوە.", "success");
        }
      } else {
        showToast("هەڵە لە خەزنکردن! تکایە دووبارە هەوڵ بدەوە.", "error");
      }
    }).catch((err) => {
      console.error("Save error:", err);
      showToast("هەڵەی نەتۆرک! تکایە دووبارە هەوڵ بدەوە.", "error");
    });
  }

  function handleSave() {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    if (!validateBeforeSave()) return;

    const rate = toNumber(exchangeRate) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (customer ? getSingleAccountBalanceCurrencyId(customer) : 1);
    const before = accountBalanceBeforeByCurrency;

    const paidList = Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x) => x.amount > 0);

    const result = calculateLedgerEntries({
      type: "sales_return",
      netAmount: totalReturnInBase,
      currencyId: returnCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map(p => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: p.currencyId === 1 ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    if (result.excess.exists) {
      setExcessModalConfig({
        isOpen: true,
        excessAmount: result.excess.amount,
        targetCurrencyId: result.excess.targetCurrencyId,
        otherCurrencyId: result.excess.otherCurrencyId
      });
    } else {
      saveVoucher(null);
    }
  }

  function handlePrint() {
    if (rows.length === 0) {
      showToast("هیچ کەرەستەیەک لە پسوڵەکەدا نییە.");
      return;
    }

    if (!isLocked && !isSaved) {
      showToast("پێش پرێنتکردن دەبێت پسوڵەکە خەزن بکەیت.");
      return;
    }

    setTimeout(() => window.print(), 100);
  }

  function toggleColumn(key: keyof TableColumns) {
    setTableColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function togglePrintOption(key: keyof PrintOptions) {
    setPrintOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const lockedFieldStyle: CSSProperties = isLocked
    ? { background: "#f3f4f6", cursor: "not-allowed" }
    : {};

  const currentUser =
    ((store as any).currentUser ||
      (store as any).loggedInUser ||
      (store as any).user ||
      {}) as any;

  const employeeName =
    currentUser.fullName || currentUser.name || "هێمن مەلا فەرهاد";

  return (
    <div style={page}>
      <style>{printCss}</style>

      {toastMessage && (
        <div
          style={{
            ...toastBar,
            ...(toastType === "success"
              ? toastSuccess
              : toastType === "info"
              ? toastInfo
              : toastError),
          }}
        >
          <button style={toastCloseBtn} onClick={() => setToastMessage("")}>
            ×
          </button>
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={pageGrid}>
        <aside style={leftPanel}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <label style={labelStyle}>کریار</label>

            <div style={customerInputWrap}>
              <input
                value={customerSearch}
                disabled={isLocked}
                onFocus={() => {
                  if (!isLocked) setShowCustomerList(true);
                }}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setCustomerSearch(e.target.value);
                  setCustomerId(undefined);
                  setShowCustomerList(true);
                  setShowCustomerInfo(false);
                }}
                placeholder="هەژمار / کریار"
                style={{
                  ...input,
                  ...lockedFieldStyle,
                  paddingLeft: customerId && !isLocked ? 44 : 14,
                }}
              />

              {customerId && !isLocked && (
                <button
                  type="button"
                  style={clearCustomerBtn}
                  onClick={() => {
                    if (blockIfLocked()) return;
                    setCustomerId(undefined);
                    setCustomerSearch("");
                    setShowCustomerInfo(false);
                  }}
                >
                  پاککردنەوە
                </button>
              )}

              {showCustomerList && !isLocked && (
                <div style={customerDropdown}>
                  {filteredCustomers.length === 0 ? (
                    <div style={emptyText}>هیچ هەژمارێک نەدۆزرایەوە</div>
                  ) : (
                    filteredCustomers.map((acc) => (
                      <button
                        key={acc.id}
                        style={customerDropdownItem}
                        onMouseDown={() => {
                          setCustomerId(acc.id);
                          setCustomerSearch(acc.name);
                          setShowCustomerList(false);
                          setShowCustomerInfo(true);
                        }}
                      >
                        <strong>{acc.name}</strong>
                        <span style={smallMuted}>
                          مۆبایل: {acc.phone || "-"} / باڵانس:{" "}
                          {formatCurrencyMap(getAccountBalanceBeforeMap(acc))}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {customer && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowCustomerInfo((prev) => !prev)}
              >
                {showCustomerInfo
                  ? "▲ شاردنەوەی زانیاری کریار"
                  : "▼ زانیاری کریار"}
              </button>
            </div>
          )}

          {customer && showCustomerInfo && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری کریار</div>

              <InfoRow label="ژمارەی تەلەفۆن">
                {customer.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{customer.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {customer.address || "-"}
              </InfoRow>

              <InfoRow label="باڵانس">
                {formatCurrencyMapWithColors(accountBalanceBeforeByCurrency)}
              </InfoRow>
            </div>
          )}`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log("Replaced resetInvoice functions (LF)");
} else if (content.includes(target2_crlf)) {
  content = content.replace(target2_crlf, replacement2.replace(/\n/g, '\r\n'));
  console.log("Replaced resetInvoice functions (CRLF)");
} else {
  console.log("resetInvoice match not found!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Patching completed.");

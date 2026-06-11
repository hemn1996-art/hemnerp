const fs = require('fs');

const path = 'app/components/PurchaseReturnPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = '  function handlePrint() {';
const endStr = '            <Field label="بەروار">';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error(`Start index: ${startIndex}, End index: ${endIndex}`);
  process.exit(1);
}

const replacement = `  function handlePrint() {
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
            <label style={labelStyle}>دابینکەر</label>

            <div style={supplierInputWrap}>
              <input
                value={supplierSearch}
                disabled={isLocked}
                onFocus={() => {
                  if (!isLocked) setShowSupplierList(true);
                }}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setSupplierSearch(e.target.value);
                  setSupplierId(undefined);
                  setShowSupplierList(true);
                  setShowSupplierInfo(false);
                }}
                placeholder="هەژمار / دابینکەر"
                style={{
                  ...input,
                  ...lockedFieldStyle,
                  paddingLeft: supplierId && !isLocked ? 44 : 14,
                }}
              />

              {supplierId && !isLocked && (
                <button
                  type="button"
                  style={supplierClearBtn}
                  onClick={() => {
                    setSupplierId(undefined);
                    setSupplierSearch("");
                    setShowSupplierInfo(false);
                    setShowSupplierList(false);
                  }}
                  title="لابردنی دابینکەر"
                >
                  ×
                </button>
              )}
            </div>

            {showSupplierList && !isLocked && (
              <div style={dropdownLarge}>
                {filteredSuppliers.length === 0 ? (
                  <div style={emptyText}>هیچ دابینکەرێک نەدۆزرایەوە</div>
                ) : (
                  filteredSuppliers.map((account) => (
                    <button
                      key={account.id}
                      style={dropdownItem}
                      onMouseDown={() => {
                        setSupplierId(account.id);
                        setSupplierSearch(account.name);
                        setShowSupplierList(false);
                        setShowSupplierInfo(false);
                      }}
                    >
                      <strong>{account.name}</strong>
                      <span style={smallMuted}>
                        {account.phone || "-"} / {account.city || "-"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {supplier && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowSupplierInfo((prev) => !prev)}
              >
                {showSupplierInfo
                  ? "▲ شاردنەوەی زانیاری دابینکەر"
                  : "▼ زانیاری دابینکەر"}
              </button>
            </div>
          )}

          {supplier && showSupplierInfo && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری دابینکەر</div>

              <InfoRow label="ژمارەی تەلەفۆن">
                {supplier.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{supplier.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {supplier.address || "-"}
              </InfoRow>

              <InfoRow label="باڵانس">
                <span
                  style={{
                    color:
                      Number(supplier.balance || 0) >= 0
                        ? "#16a34a"
                        : "#dc2626",
                    fontWeight: 900,
                  }}
                >
                  {formatCurrencyMap(accountBalanceBeforeByCurrency)}
                </span>
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="گشتی"
                value={formatCurrencyMap(returnTotalsByCurrency)}
                color="#16a34a"
              />
              <StatBox
                title="کۆی ماوەی ئەم پسووڵە"
                value={formatCurrencyMapWithColors(supplierBalanceReductionByCurrency)}
              />
            </div>

            <Field label="قاسە">
              <select
                value={cashboxId || ""}
                disabled={isLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setCashboxId(Number(e.target.value));
                }}
                style={{ ...input, ...lockedFieldStyle }}
              >
                {cashboxes.map((cashbox) => (
                  <option key={cashbox.id} value={cashbox.id}>
                    {cashbox.name}
                  </option>
                ))}
              </select>
            </Field>

`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(path, newContent, 'utf8');
console.log("Successfully fixed PurchaseReturnPage.tsx using index-based layout replacement!");

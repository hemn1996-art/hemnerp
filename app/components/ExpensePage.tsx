"use client";
import FormattedNumberInput from "./FormattedNumberInput";
import DateInput from "./DateInput";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store } from "../store/store";
import { saveInvoice } from "../utils/invoiceLogic";
import { currencies as mockCurrencies } from "../data/mockData";

type ToastType = "error" | "success" | "info";

type AccountLike = {
  id: number;
  name: string;
  accountTypeId?: number;
  phone?: string;
  city?: string;
  address?: string;
  balance?: number;
  balanceByCurrency?: Record<string, number>;
  creditLimitCurrencyId?: number;
  balanceCurrencyId?: number;
  isActive?: boolean;
};

type CashboxLike = {
  id: number;
  name: string;
  balance?: number;
  balances?: { currencyId: number; amount: number }[];
  balanceByCurrency?: Record<string, number>;
  isActive?: boolean;
};

type ProductLike = {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  isExpense?: boolean;
  isService?: boolean;
  isActive?: boolean;
};

type ExpenseRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  amount: string;
  currencyId: number;
  note: string;
};

type PaidAmounts = Record<string, string>;

type PrintOptions = {
  showReceiptInfo: boolean;
  showReceiptNumber: boolean;
  showReceiptDate: boolean;
  showCreatedTime: boolean;
  showCashbox: boolean;
  showAccountInfo: boolean;
  showAccountName: boolean;
  showAccountPhone: boolean;
  showAccountAddress: boolean;
  showExpenseRows: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function ExpensePage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const accounts = (store.accounts || []) as AccountLike[];
  const cashboxes = (store.cashboxes || []) as CashboxLike[];
  const products = (store.products || []) as ProductLike[];
  const storeCurrencies = (store as any).currencies || [];
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;

  const defaultCurrency =
    currencies[0] ||
    ({ id: 1, name: "دۆلار", code: "USD", symbol: "$" } as any);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const [receiptNumber, setReceiptNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [receiptDate, setReceiptDate] = useState("");

  useEffect(() => {
    if (!editId) {
      setReceiptNumber(Date.now().toString().slice(-6));
      setCreatedTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setReceiptDate(new Date().toISOString().slice(0, 10));
    }
  }, [editId]);

  useEffect(() => {
    if (editId) {
      fetch(`/api/vouchers/${editId}`)
        .then((res) => res.json())
        .then((voucher) => {
          if (voucher) {
            setReceiptNumber(String(voucher.id));
            setReceiptDate(voucher.date.slice(0, 10));
            const d = new Date(voucher.date);
            setCreatedTime(
              d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            if (voucher.accountId) {
              setAccountId(voucher.accountId);
              const acc = accounts.find((a: any) => a.id === voucher.accountId);
              if (acc) setAccountSearch(acc.name);
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);

            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                amount: String(line.unitPrice),
                currencyId: line.currencyId || voucher.currencyId || 1,
                note: line.note || "",
              }));
              setRows(mappedRows);
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            if (voucher.exchangeRate) {
              setExchangeRate(String(voucher.exchangeRate));
            }

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
    }
  }, [editId, accounts]);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>();
  const [showAccountList, setShowAccountList] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [exchangeRate, setExchangeRate] = useState("1500");

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [rows, setRows] = useState<ExpenseRow[]>([]);

  const [receiptNote, setReceiptNote] = useState("");
  const [printNote, setPrintNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNewReceiptConfirm, setShowNewReceiptConfirm] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    showReceiptInfo: true,
    showReceiptNumber: true,
    showReceiptDate: true,
    showCreatedTime: true,
    showCashbox: true,
    showAccountInfo: true,
    showAccountName: true,
    showAccountPhone: true,
    showAccountAddress: true,
    showExpenseRows: true,
  });

  const selectedAccount = accounts.find((a: any) => a.id === accountId);
  const selectedCashbox = cashboxes.find((c: any) => c.id === cashboxId);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    const activeAccounts = accounts.filter(
      (account: any) => account.isActive !== false
    );

    if (!q) return activeAccounts;

    return activeAccounts.filter((account: any) => {
      return (
        String(account.name || "").toLowerCase().includes(q) ||
        String(account.phone || "").toLowerCase().includes(q) ||
        String(account.city || "").toLowerCase().includes(q)
      );
    });
  }, [accountSearch, accounts]);

  const expenseProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    return products.filter((product: any) => {
      if (product.isActive === false) return false;
      if (!product.isExpense) return false;

      if (!q) return true;

      return (
        String(product.name || "").toLowerCase().includes(q) ||
        String(product.code || "").toLowerCase().includes(q) ||
        String(product.barcode || "").toLowerCase().includes(q) ||
        String(product.category || "").toLowerCase().includes(q) ||
        String(product.brand || "").toLowerCase().includes(q)
      );
    });
  }, [productSearch, products]);

  const hasIqdExpense = rows.some(
    (row: any) => getCurrencyCode(row.currencyId) === "IQD"
  );

  const expenseTotalsByCurrency = getExpenseTotalsByCurrency();
  const totalExpenseInDefaultCurrency = getTotalExpenseInDefaultCurrency();

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      accountId,
      accountSearch,
      receiptDate,
      createdTime,
      cashboxId,
      rows,
      exchangeRate,
      receiptNote,
      printNote,
    });
  }, [
    accountId,
    accountSearch,
    receiptDate,
    createdTime,
    cashboxId,
    rows,
    exchangeRate,
    receiptNote,
    printNote,
  ]);

  

  useEffect(() => {
    if (editId && !isEditLoading && !savedSnapshot) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [editId, isEditLoading, currentSnapshot, savedSnapshot]);

  const isSaved = savedSnapshot !== "" && savedSnapshot === currentSnapshot;

  function showToast(message: string, type: ToastType = "error") {
    setToastMessage(message);
    setToastType(type);

    window.setTimeout(() => {
      setToastMessage("");
    }, 3500);
  }

  function blockIfLocked() {
    if (isLocked) {
      showToast(
        "ئەم پسوڵەیە خەزن کراوە و ئیتر ناتوانرێت گۆڕانکاری لەسەر بکرێت."
      );
      return true;
    }

    return false;
  }

  function onlyInteger(value: string) {
    return value.replace(/[^\d]/g, "");
  }

  function onlyDecimal(value: string) {
    const cleaned = value.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");

    if (firstDot === -1) return cleaned;

    return (
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "")
    );
  }

  function toNumber(value: string | number | undefined) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function getCurrencyKey(currencyId: number) {
    return String(currencyId);
  }

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function isUsd(currencyId: number) {
    return getCurrencyCode(currencyId) === "USD";
  }

  function isIqd(currencyId: number) {
    return getCurrencyCode(currencyId) === "IQD";
  }

  function convertCurrency(amount: number, fromId: number, toId: number) {
    if (fromId === toId) return amount;

    const rate = toNumber(exchangeRate) || 1500;

    if (isIqd(fromId) && isUsd(toId)) return amount / rate;
    if (isUsd(fromId) && isIqd(toId)) return amount * rate;

    return amount;
  }

  function formatCurrencyAmount(value: number, currencyId: number) {
    const code = getCurrencyCode(currencyId);
    const symbol = getCurrencySymbol(currencyId);

    if (code === "IQD") {
      return `${Number(value || 0).toLocaleString("en-US")} دینار`;
    }

    return `${Number(value || 0).toLocaleString("en-US")} ${symbol}`;
  }

  function formatCurrencyMap(map: Record<string, number>) {
    const parts = Object.entries(map)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText, amount]) =>
        formatCurrencyAmount(amount, Number(currencyIdText))
      );

    return parts.length ? parts.join(" + ") : "0";
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";

    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  function getExpenseTotalsByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = getCurrencyKey(row.currencyId);
      map[key] = Number(map[key] || 0) + toNumber(row.amount);
    }

    return map;
  }

  function getTotalExpenseInDefaultCurrency() {
    return rows.reduce((sum, row) => {
      return (
        sum +
        convertCurrency(toNumber(row.amount), row.currencyId, defaultCurrency.id)
      );
    }, 0);
  }

  function getPaidAmountsFromRows() {
    return rows.reduce((acc, row) => {
      const key = String(row.currencyId);
      acc[key] = String(Number(acc[key] || 0) + toNumber(row.amount));
      return acc;
    }, {} as PaidAmounts);
  }

  function chooseExpenseProduct(product: ProductLike) {
    if (blockIfLocked()) return;

    const existing = rows.find((row: any) => row.productId === product.id);

    if (existing) {
      setProductSearch("");
      setShowProductList(false);
      showToast("ئەم خەرجییە پێشتر زیادکراوە.", "info");
      return;
    }

    const newRow: ExpenseRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      amount: "",
      currencyId: defaultCurrency.id,
      note: "",
    };

    setRows((prev) => [...prev, newRow]);
    setProductSearch("");
    setShowProductList(false);
  }

  function updateRow(rowId: number, patch: Partial<ExpenseRow>) {
    if (blockIfLocked()) return;

    setRows((prev) =>
      prev.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  function removeRow(rowId: number) {
    if (blockIfLocked()) return;

    setRows((prev) => prev.filter((row: any) => row.id !== rowId));
  }

  function validateBeforeSave() {
    if (!cashboxId) {
      showToast("تکایە قاسە هەڵبژێرە.");
      return false;
    }

    if (rows.length === 0) {
      showToast("تکایە لانیکەم یەک جۆری خەرجی زیاد بکە.");
      return false;
    }

    for (const row of rows) {
      if (toNumber(row.amount) <= 0) {
        showToast(`بڕی خەرجی "${row.productName}" دروست نییە.`);
        return false;
      }
    }

    const selectedCashbox = cashboxes.find((c: any) => c.id === cashboxId);
    if (selectedCashbox) {
      for (const [currencyIdText, amount] of Object.entries(expenseTotalsByCurrency)) {
        const currencyId = Number(currencyIdText);
        const bal = selectedCashbox.balances?.find((b: any) => b.currencyId === currencyId);
        const cashboxAmt = bal ? Number(bal.amount || 0) : 0;
        if (Number(amount) > cashboxAmt) {
          const sym = getCurrencySymbol(currencyId);
          showToast(`باڵانسی پێویست لە دراوی (${sym}) لە قاسەکەدا نییە.`);
          return false;
        }
      }
    }

    return true;
  }

  function applyCashboxDecrease() {
    const cashbox = cashboxes.find((c: any) => c.id === cashboxId);

    if (!cashbox) return;

    if (!cashbox.balances) cashbox.balances = [];

    for (const [currencyIdText, amount] of Object.entries(
      expenseTotalsByCurrency
    )) {
      const currencyId = Number(currencyIdText);
      const existing = cashbox.balances.find((b: any) => b.currencyId === currencyId);

      if (existing) {
        existing.amount = Number(existing.amount || 0) - Number(amount || 0);
      } else {
        cashbox.balances.push({
          currencyId,
          amount: -Number(amount || 0),
        });
      }
    }

    if (!cashbox.balanceByCurrency) cashbox.balanceByCurrency = {};

    for (const [currencyIdText, amount] of Object.entries(
      expenseTotalsByCurrency
    )) {
      cashbox.balanceByCurrency[currencyIdText] =
        Number(cashbox.balanceByCurrency[currencyIdText] || 0) -
        Number(amount || 0);
    }

    if (typeof cashbox.balance === "number") {
      cashbox.balance =
        Number(cashbox.balance || 0) - totalExpenseInDefaultCurrency;
    }
  }

  function resetReceipt() {
    setReceiptNumber(Date.now().toString().slice(-6));
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setAccountId(undefined);
    setAccountSearch("");
    setShowAccountInfo(false);
    setShowAccountList(false);
    setCashboxId(cashboxes[0]?.id);
    setRows([]);
    setProductSearch("");
    setShowProductList(false);
    setExchangeRate("1500");
    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
  }

  function hasUnsavedData() {
    return (
      accountId !== undefined ||
      accountSearch.trim() !== "" ||
      rows.length > 0 ||
      receiptNote.trim() !== "" ||
      printNote.trim() !== ""
    );
  }

  function handleNewReceipt() {
    if (hasUnsavedData() && !isSaved && !isLocked) {
      setShowNewReceiptConfirm(true);
      return;
    }

    resetReceipt();
  }

  function handleSave() {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    if (!validateBeforeSave()) return;

    const items = rows.map((row: any) => ({
      productId: row.productId,
      name: row.productName,
      code: row.code,
      amount: toNumber(row.amount),
      currencyId: row.currencyId,
      note: row.note,
      isExpense: true,
    }));

    saveInvoice({
      id: Number(receiptNumber || Date.now().toString().slice(-6)),
      type: "خەرجی",
      accountId,
      cashboxId,

      total: totalExpenseInDefaultCurrency,
      totalByCurrency: expenseTotalsByCurrency,

      paid: totalExpenseInDefaultCurrency,
      paidAmounts: getPaidAmountsFromRows(),
      paidByCurrency: expenseTotalsByCurrency,

      expenseByCurrency: expenseTotalsByCurrency,
      profitEffect: -totalExpenseInDefaultCurrency,

      items,
      note: receiptNote,
      printNote,

      createdAt: new Date().toISOString(),
      date: receiptDate,
      createdTime,
      exchangeRate,
    } as any);

    applyCashboxDecrease();

    setSavedSnapshot(currentSnapshot);
    setIsLocked(true);

    showToast("پسوڵەی خەرجی خەزن کرا ✅", "success");
  }

  function handlePrint() {
    if (!isLocked && !isSaved) {
      showToast("پێش پرێنتکردن دەبێت پسوڵەکە خەزن بکەیت.");
      return;
    }

    setTimeout(() => window.print(), 100);
  }

  function togglePrintOption(key: keyof PrintOptions) {
    setPrintOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const lockedFieldStyle: CSSProperties = isLocked
    ? { background: "#f3f4f6", cursor: "not-allowed" }
    : {};

  return (
    <div style={page}>
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
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
            باردەکرێت...
          </span>
        </div>
      )}
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
            <label style={labelStyle}>هەژمار ـ ئارەزوومەندانە</label>

            <div style={accountInputWrap}>
              <input
                value={accountSearch}
                disabled={isLocked}
                onFocus={() => {
                  if (!isLocked) setShowAccountList(true);
                }}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setAccountSearch(e.target.value);
                  setAccountId(undefined);
                  setShowAccountList(true);
                  setShowAccountInfo(false);
                }}
                placeholder="هەژمار، تەنها بۆ زانیاری"
                style={{
                  ...input,
                  ...lockedFieldStyle,
                  paddingLeft: accountId && !isLocked ? 44 : 14,
                }}
              />

              {accountId && !isLocked && (
                <button
                  type="button"
                  style={accountClearBtn}
                  onClick={() => {
                    setAccountId(undefined);
                    setAccountSearch("");
                    setShowAccountInfo(false);
                    setShowAccountList(false);
                  }}
                  title="لابردنی هەژمار"
                >
                  ×
                </button>
              )}
            </div>

            {showAccountList && !isLocked && (
              <div style={dropdownLarge}>
                {filteredAccounts.length === 0 ? (
                  <div style={emptyText}>هیچ هەژمارێک نەدۆزرایەوە</div>
                ) : (
                  filteredAccounts.map((account: any) => (
                    <button
                      key={account.id}
                      style={dropdownItem}
                      onMouseDown={() => {
                        setAccountId(account.id);
                        setAccountSearch(account.name);
                        setShowAccountList(false);
                        setShowAccountInfo(false);
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

          {selectedAccount && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowAccountInfo((prev) => !prev)}
              >
                {showAccountInfo
                  ? "▲ شاردنەوەی زانیاری هەژمار"
                  : "▼ زانیاری هەژمار"}
              </button>
            </div>
          )}

          {selectedAccount && showAccountInfo && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری هەژمار</div>

              <InfoRow label="ژمارەی تەلەفۆن">
                {selectedAccount.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{selectedAccount.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {selectedAccount.address || "-"}
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="کۆی خەرجی"
                value={formatCurrencyMap(expenseTotalsByCurrency)}
                color="#dc2626"
              />

              <StatBox
                title="ژمارەی خەرجییەکان"
                value={`${rows.length}`}
                color="#111827"
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
                {cashboxes.map((cashbox: any) => (
                  <option key={cashbox.id} value={cashbox.id}>
                    {cashbox.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="بەروار">
              <DateInput
                value={receiptDate}
                disabled={isLocked}
                onChange={(val) => {
                  if (blockIfLocked()) return;
                  setReceiptDate(val);
                }}
                style={{ ...input, ...lockedFieldStyle }}
              />
            </Field>

            <div style={noteToggleBox}>
              <button
                type="button"
                disabled={isLocked}
                style={{
                  ...noteToggleBtn,
                  opacity: isLocked ? 0.55 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  if (blockIfLocked()) return;
                  setShowNotes((prev) => !prev);
                }}
              >
                {showNotes ? "▲ شاردنەوەی تێبینی" : "▼ زیادکردنی تێبینی"}
              </button>

              {showNotes && (
                <div style={notesInsidePayment}>
                  <Field label="تێبینی ناوخۆیی">
                    <textarea
                      value={receiptNote}
                      disabled={isLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setReceiptNote(e.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>

                  <Field label="تێبینی چاپ">
                    <textarea
                      value={printNote}
                      disabled={isLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setPrintNote(e.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div style={sideActions}>
            <button style={outlineBlueBtn} onClick={handleNewReceipt}>
              پسوڵەی نوێ
            </button>

            <button
              style={{
                ...primaryBtn,
                opacity: (isLocked || (!!editId && isSaved)) ? 0.55 : 1,
                cursor: (isLocked || (!!editId && isSaved)) ? "not-allowed" : "pointer",
              }}
              onClick={handleSave}
              disabled={isLocked || (!!editId && isSaved)}
            >
              {isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}
            </button>

            <button style={outlineBlueBtn} onClick={() => setShowSettings(true)}>
              ڕێکخستن
            </button>

            <button style={printBtn} onClick={handlePrint}>
              پرێنتکردن
            </button>
          </div>

          {!isSaved && hasUnsavedData() && !isLocked && (
            <div style={unsavedNotice}>ئەم پسوڵەیە هێشتا خەزن نەکراوە.</div>
          )}

          {isLocked && (
            <div style={lockedNotice}>
              پسوڵەکە قوفڵ کراوە؛ تەنها پرێنت، ڕێکخستن و پسوڵەی نوێ کار دەکات.
            </div>
          )}
        </aside>

        <main style={mainContent}>
          <div style={headerCard}>
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>پسوڵەی خەرجی</h2>}
            
          </div>

          <div style={tableCard}>
            <div style={productSearchBox}>
              <input
                value={productSearch}
                disabled={isLocked}
                onFocus={() => {
                  if (!isLocked) setShowProductList(true);
                }}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setProductSearch(e.target.value);
                  setShowProductList(true);
                }}
                placeholder="جۆری خەرجی / کەرەستەی خەرجی..."
                style={{ ...input, ...lockedFieldStyle }}
              />

              {showProductList && !isLocked && (
                <div style={productDropdown}>
                  {expenseProducts.length === 0 ? (
                    <div style={emptyText}>هیچ خەرجییەک نەدۆزرایەوە</div>
                  ) : (
                    expenseProducts.map((product: any) => (
                      <button
                        key={product.id}
                        style={productDropdownItem}
                        onMouseDown={() => chooseExpenseProduct(product)}
                      >
                        <strong style={{ color: "#1d4ed8" }}>
                          {product.name}
                        </strong>
                        <span style={smallMuted}>
                          کۆد: {product.code || "-"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>جۆری خەرجی</th>
                    <th style={th}>کۆد</th>
                    <th style={th}>بڕی خەرجی</th>
                    <th style={th}>دراو</th>
                    <th style={th}>تێبینی</th>
                    <th style={th}>چالاکی</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={emptyTableCell}>
                        هیچ خەرجییەک زیاد نەکراوە
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td style={tdCenter}>{index + 1}</td>

                        <td style={tdWide}>
                          <strong>{row.productName}</strong>
                        </td>

                        <td style={tdCenter}>{row.code || "-"}</td>

                        <td style={tdCenter}>
                          <FormattedNumberInput
                            value={row.amount}
                            disabled={isLocked}
                            onChange={(val) =>
                              updateRow(row.id, {
                                amount: val,
                              })
                            }
                            placeholder="0"
                            style={{ ...smallInput, ...lockedFieldStyle }}
                          />
                        </td>

                        <td style={tdCenter}>
                          <select
                            value={row.currencyId}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateRow(row.id, {
                                currencyId: Number(e.target.value),
                              })
                            }
                            style={{ ...smallSelect, ...lockedFieldStyle, minWidth: "130px" }}
                          >
                            {currencies.map((currency: any) => (
                              <option key={currency.id} value={currency.id}>
                                {currency.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td style={tdCenter}>
                          <input
                            value={row.note}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateRow(row.id, { note: e.target.value })
                            }
                            placeholder="تێبینی"
                            style={{ ...noteInput, ...lockedFieldStyle }}
                          />
                        </td>

                        <td style={tdCenter}>
                          <button
                            style={{
                              ...deleteBtn,
                              opacity: isLocked ? 0.45 : 1,
                              cursor: isLocked ? "not-allowed" : "pointer",
                            }}
                            disabled={isLocked}
                            onClick={() => removeRow(row.id)}
                          >
                            سڕینەوە
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={summaryCard}>
            <SummaryItem
              label="کۆی خەرجی"
              value={formatCurrencyMap(expenseTotalsByCurrency)}
              strong
            />

            <SummaryItem label="ژمارەی خەرجییەکان" value={`${rows.length}`} />
          </div>
        </main>
      </div>

      <div id="expense-print-area" style={printArea}>
        <div style={printPage}>
          <div style={printHeaderBlankSpace}></div>

          <div style={printInfoGrid}>
            {printOptions.showAccountInfo && accountId && (
              <div style={printInfoBox}>
                {printOptions.showAccountName && (
                  <PrintInfoLine
                    label="هەژمار"
                    value={selectedAccount?.name || "-"}
                  />
                )}

                {printOptions.showAccountPhone && (
                  <PrintInfoLine
                    label="ژمارەی تەلەفۆن"
                    value={selectedAccount?.phone || "-"}
                  />
                )}

                {printOptions.showAccountAddress && (
                  <PrintInfoLine
                    label="ناونیشان"
                    value={
                      [selectedAccount?.city, selectedAccount?.address]
                        .filter(Boolean)
                        .join(" - ") || "-"
                    }
                  />
                )}
              </div>
            )}

            {printOptions.showReceiptInfo && (
              <div style={printInfoBox}>
                <PrintInfoLine label="جۆری پسوڵە" value="پسوڵەی خەرجی" />

                {printOptions.showReceiptNumber && (
                  <PrintInfoLine label="ژمارەی پسوڵە" value={receiptNumber} />
                )}

                {printOptions.showReceiptDate && (
                  <PrintInfoLine
                    label="بەروار"
                    value={formatDate(receiptDate)}
                  />
                )}

                {printOptions.showCreatedTime && (
                  <PrintInfoLine label="کاتژمێر" value={createdTime} />
                )}

                {printOptions.showCashbox && (
                  <PrintInfoLine
                    label="قاسە"
                    value={selectedCashbox?.name || "-"}
                  />
                )}
              </div>
            )}
          </div>

          {printOptions.showExpenseRows && (
            <table style={printTable}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>جۆری خەرجی</th>
                  <th style={printTh}>کۆد</th>
                  <th style={printTh}>بڕ</th>
                  <th style={printTh}>تێبینی</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td style={printTd}>{index + 1}</td>
                    <td style={printTdWide}>{row.productName}</td>
                    <td style={printTd}>{row.code || "-"}</td>
                    <td style={printTd}>
                      {formatCurrencyAmount(
                        toNumber(row.amount),
                        row.currencyId
                      )}
                    </td>
                    <td style={printTdWide}>{row.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="کۆی خەرجی"
                value={formatCurrencyMap(expenseTotalsByCurrency)}
                bold
              />
            </div>

            <div style={printSummaryBox}>
              {printNote.trim() !== "" && (
                <div style={printExpenseNoteBox}>
                  <b>تێبینی:</b> {printNote}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewReceiptConfirm && (
        <div style={modalOverlay}>
          <div style={confirmBox}>
            <h2 style={{ marginTop: 0 }}>پسوڵەکەت خەزن نەکراوە</h2>

            <p style={confirmText}>
              داتاکانی ئەم پسوڵەیە هێشتا خەزن نەکراوە. دەتەوێت بگەڕێیتەوە بۆ
              پسوڵە، یان پسوڵەیەکی نوێ بکەیتەوە؟
            </p>

            <div style={confirmActions}>
              <button
                style={outlineBlueBtn}
                onClick={() => setShowNewReceiptConfirm(false)}
              >
                گەڕانەوە بۆ پسوڵە
              </button>

              <button
                style={dangerBtn}
                onClick={() => {
                  setShowNewReceiptConfirm(false);
                  resetReceipt();
                }}
              >
                پسوڵەی نوێ
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>ڕێکخستنی پسوڵە</h2>

              <button
                style={modalCloseBtn}
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div style={settingsStack}>
              <div style={settingsSection}>
                <h3 style={settingsTitle}>زانیاریەکانی بەشی سەرەوە</h3>

                <div style={settingGrid2}>
                  <SettingCheck
                    label="زانیاری پسوڵە دەرکەوێت"
                    checked={printOptions.showReceiptInfo}
                    onChange={() => togglePrintOption("showReceiptInfo")}
                  />

                  <SettingCheck
                    label="ژمارەی پسوڵە"
                    checked={printOptions.showReceiptNumber}
                    onChange={() => togglePrintOption("showReceiptNumber")}
                  />

                  <SettingCheck
                    label="بەروار"
                    checked={printOptions.showReceiptDate}
                    onChange={() => togglePrintOption("showReceiptDate")}
                  />

                  <SettingCheck
                    label="کاتژمێری دروستکردن"
                    checked={printOptions.showCreatedTime}
                    onChange={() => togglePrintOption("showCreatedTime")}
                  />

                  <SettingCheck
                    label="قاسە"
                    checked={printOptions.showCashbox}
                    onChange={() => togglePrintOption("showCashbox")}
                  />

                  <SettingCheck
                    label="زانیاری هەژمار دەرکەوێت"
                    checked={printOptions.showAccountInfo}
                    onChange={() => togglePrintOption("showAccountInfo")}
                  />

                  <SettingCheck
                    label="ناوی هەژمار"
                    checked={printOptions.showAccountName}
                    onChange={() => togglePrintOption("showAccountName")}
                  />

                  <SettingCheck
                    label="ژمارەی هەژمار"
                    checked={printOptions.showAccountPhone}
                    onChange={() => togglePrintOption("showAccountPhone")}
                  />

                  <SettingCheck
                    label="ناونیشانی هەژمار"
                    checked={printOptions.showAccountAddress}
                    onChange={() => togglePrintOption("showAccountAddress")}
                  />
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>چاپ</h3>

                <SettingCheck
                  label="خشتەی خەرجییەکان چاپ بکرێت"
                  checked={printOptions.showExpenseRows}
                  onChange={() => togglePrintOption("showExpenseRows")}
                />
              </div>

              {hasIqdExpense && (
                <div style={settingsSection}>
                  <h3 style={settingsTitle}>نرخی گۆڕینەوە</h3>

                  <Field label="ڕەیتی 1 دۆلار بە دینار">
                    <FormattedNumberInput
                      value={exchangeRate}
                      disabled={isLocked}
                      onChange={(val) => {
                        if (blockIfLocked()) return;
                        setExchangeRate(val);
                      }}
                      style={{ ...input, ...lockedFieldStyle }}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div style={modalFooter}>
              <button style={primaryBtn} onClick={() => setShowSettings(false)}>
                تەواو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={infoRow}>
      <div style={infoKey}>{label}</div>
      <div style={infoVal}>{children}</div>
    </div>
  );
}

function StatBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div style={statBox}>
      <div style={{ color: "#374151", fontWeight: 700 }}>{title}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={summaryItem}>
      <div style={{ color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontWeight: strong ? 900 : 700,
          fontSize: strong ? 19 : 15,
          color: strong ? "#0f172a" : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PrintInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={printInfoRow}>
      <b>{label}:</b>
      <span>{value}</span>
    </div>
  );
}

function PrintSummaryLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div style={printSummaryLine}>
      <span style={{ fontWeight: bold ? 900 : 700 }}>{label}</span>
      <span style={{ fontWeight: bold ? 900 : 500 }}>{value}</span>
    </div>
  );
}

function SettingCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={settingCheck}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

const appFont = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

const printCss = `
@media print {
  @page { size: A4; margin: 0; }
  body * { visibility: hidden !important; }
  #expense-print-area, #expense-print-area * { visibility: visible !important; }
  #expense-print-area {
    display: block !important;
    position: absolute !important;
    inset: 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    background: white !important;
    z-index: 999999 !important;
  }
  button, input, select, textarea { display: none !important; }
}
`;

const page: CSSProperties = { direction: "rtl", fontFamily: appFont };
const toastBar: CSSProperties = {
  position: "fixed",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 99999,
  minWidth: 360,
  maxWidth: "80vw",
  padding: "12px 18px",
  borderRadius: 8,
  color: "white",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  boxShadow: "0 10px 30px rgba(15,23,42,0.25)",
  textAlign: "center",
};
const toastError: CSSProperties = { background: "#ef4444" };
const toastSuccess: CSSProperties = { background: "#16a34a" };
const toastInfo: CSSProperties = { background: "#2563eb" };
const toastCloseBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "white",
  fontSize: 26,
  lineHeight: 1,
  cursor: "pointer",
  fontWeight: 900,
};
const pageGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--page-grid-cols-no-items, 1000px 1fr)",
  gap: 18,
  alignItems: "stretch",
};
const leftPanel: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  position: "var(--left-panel-position, sticky)" as any,
  top: 16,
};
const mainContent: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
};
const input: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  outline: "none",
  background: "white",
  boxSizing: "border-box",
  fontFamily: appFont,
};
const textarea: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: appFont,
};
const labelStyle: CSSProperties = {
  marginBottom: 6,
  fontWeight: 700,
  color: "#374151",
};
const accountInputWrap: CSSProperties = {
  position: "relative",
  width: "100%",
};
const accountClearBtn: CSSProperties = {
  position: "absolute",
  left: 8,
  top: "50%",
  transform: "translateY(-50%)",
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#dc2626",
  fontSize: 20,
  fontWeight: 900,
  lineHeight: "24px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: appFont,
  zIndex: 5,
};
const dropdownLarge: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 6,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  boxShadow: "0 14px 35px rgba(15,23,42,0.12)",
  zIndex: 80,
  maxHeight: "70vh",
  overflowY: "auto",
};
const dropdownItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "right",
  border: 0,
  background: "white",
  padding: 12,
  cursor: "pointer",
  borderBottom: "1px solid #f1f5f9",
  fontFamily: appFont,
};
const emptyText: CSSProperties = {
  padding: 14,
  textAlign: "center",
  color: "#64748b",
};
const smallMuted: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};
const accountInfoToggleBox: CSSProperties = { marginBottom: 12 };
const accountCard: CSSProperties = {
  background: "#fafafa",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  marginBottom: 14,
};
const sectionTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 12,
};
const infoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "130px 1fr",
  gap: 8,
  padding: "7px 0",
  borderBottom: "1px solid #e5e7eb",
};
const infoKey: CSSProperties = { fontWeight: 700, color: "#374151" };
const infoVal: CSSProperties = { color: "#111827" };
const totalsCard: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const totalGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 10,
};
const statBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fbfbfb",
};
const noteToggleBox: CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: 10,
};
const noteToggleBtn: CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#374151",
  borderRadius: 12,
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "center",
  fontFamily: appFont,
};
const notesInsidePayment: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  marginTop: 12,
};
const sideActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 10,
  marginTop: 14,
};
const outlineBlueBtn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #2563eb",
  background: "white",
  color: "#2563eb",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
};
const primaryBtn: CSSProperties = {
  borderRadius: 12,
  border: 0,
  background: "#2563eb",
  color: "white",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
};
const printBtn: CSSProperties = {
  borderRadius: 12,
  border: 0,
  background: "#22c55e",
  color: "white",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
};
const dangerBtn: CSSProperties = {
  borderRadius: 12,
  border: 0,
  background: "#dc2626",
  color: "white",
  padding: "12px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};
const unsavedNotice: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
  fontWeight: 800,
  textAlign: "center",
};
const lockedNotice: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#e0f2fe",
  color: "#075985",
  border: "1px solid #bae6fd",
  fontWeight: 900,
  textAlign: "center",
};
const headerCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};
const currentBadge: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "7px 14px",
  fontWeight: 800,
};
const tableCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
};
const productSearchBox: CSSProperties = {
  position: "relative",
  marginBottom: 16,
};
const productDropdown: CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  left: 0,
  marginTop: 6,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  boxShadow: "0 14px 35px rgba(15,23,42,0.12)",
  zIndex: 70,
  maxHeight: "70vh",
  overflowY: "auto",
};
const productDropdownItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "right",
  border: 0,
  background: "white",
  padding: 12,
  cursor: "pointer",
  borderBottom: "1px solid #f1f5f9",
  fontFamily: appFont,
};
const table: CSSProperties = {
  width: "100%",
  minWidth: 800,
  borderCollapse: "collapse",
};
const th: CSSProperties = {
  background: "#f8fafc",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  textAlign: "center",
  fontWeight: 800,
};
const tdCenter: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  textAlign: "center",
  verticalAlign: "top",
};
const tdWide: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  minWidth: 240,
  verticalAlign: "top",
};
const smallInput: CSSProperties = {
  width: 110,
  padding: "10px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};
const smallSelect: CSSProperties = {
  width: 90,
  padding: "10px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};
const noteInput: CSSProperties = {
  width: 180,
  padding: "10px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};
const deleteBtn: CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  borderRadius: 10,
  padding: "9px 10px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: appFont,
};
const emptyTableCell: CSSProperties = {
  padding: 26,
  textAlign: "center",
  color: "#64748b",
  borderBottom: "1px solid #eef2f7",
  fontWeight: 700,
};
const summaryCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
};
const summaryItem: CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  borderRadius: 14,
  padding: 14,
};
const printArea: CSSProperties = { display: "none" };
const printPage: CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  background: "white",
  padding: "0 12mm 16mm 12mm",
  boxSizing: "border-box",
  direction: "rtl",
  fontFamily: appFont,
  color: "#111827",
  position: "relative",
};
const printHeaderBlankSpace: CSSProperties = {
  height: "60mm",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 8,
};
const printInfoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 8,
  marginBottom: 8,
};
const printInfoBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 11,
  minHeight: 54,
};
const printInfoRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  lineHeight: 1.8,
};
const printTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 10,
  marginTop: 6,
};
const printTh: CSSProperties = {
  border: "1px solid #0f172a",
  background: "#0f172a",
  color: "#ffffff",
  padding: "7px 5px",
  textAlign: "center",
  fontWeight: 900,
  fontSize: 10,
};
const printTd: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "6px 5px",
  textAlign: "center",
  verticalAlign: "top",
};
const printTdWide: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "6px 5px",
  textAlign: "right",
  verticalAlign: "top",
  minWidth: 120,
};
const printBottomGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 8,
  marginTop: 8,
};
const printSummaryBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  minHeight: 70,
  fontSize: 11,
};
const printSummaryLine: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid #f1f5f9",
  padding: "4px 0",
};
const printExpenseNoteBox: CSSProperties = {
  marginTop: 8,
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 10,
  lineHeight: 1.8,
  background: "#f8fafc",
};
const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};
const modalBox: CSSProperties = {
  width: 760,
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 25px 70px rgba(15,23,42,0.25)",
};
const confirmBox: CSSProperties = {
  width: 460,
  maxWidth: "92vw",
  background: "white",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 25px 70px rgba(15,23,42,0.28)",
};
const confirmText: CSSProperties = {
  color: "#374151",
  lineHeight: 1.9,
  fontWeight: 700,
  marginBottom: 18,
};
const confirmActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
};
const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 12,
  marginBottom: 14,
};
const modalCloseBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid #d1d5db",
  background: "white",
  fontSize: 20,
  cursor: "pointer",
};
const settingsStack: CSSProperties = {
  display: "grid",
  gap: 12,
};
const settingsSection: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#fafafa",
};
const settingsTitle: CSSProperties = {
  margin: "0 0 10px",
};
const settingGrid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 8,
};
const settingCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
  fontWeight: 700,
};
const modalFooter: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-start",
};
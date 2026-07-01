"use client";
import FormattedNumberInput from "./FormattedNumberInput";
import PrintHeader, { PrintWatermark } from "./PrintHeader";
import DateInput from "./DateInput";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store, useStore } from "../store/store";
import { convertCurrency } from "../utils/ledgerHelper";
import { currencies as mockCurrencies } from "../data/mockData";

type ToastType = "error" | "success" | "info";
type DiscountType = "amount" | "percent";

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

type UserLike = {
  id?: number;
  name?: string;
  fullName?: string;
  phone?: string;
  mobile?: string;
  mobileNumber?: string;
};

type QuotationRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  quantity: string;
  price: string;
  currencyId: number;
  discountValue: string;
  discountType: DiscountType;
  note: string;
};

type PrintOptions = {
  showReceiptInfo: boolean;
  showReceiptNumber: boolean;
  showReceiptDate: boolean;
  showCreatedTime: boolean;
  showQuotationNotice: boolean;
  showEmployeeInfo: boolean;
  showRows: boolean;
  showItemCode: boolean;
  showItemDiscount: boolean;
  showItemNote: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function QuotationPage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const products = useStore((s: any) => s.products || []) as ProductLike[];
  const storeCurrencies = useStore((s: any) => s.currencies || []);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const accounts = useStore((s: any) => s.accounts || []) as any[];

  const addVoucher = useStore((s: any) => s.addVoucher);
  const updateVoucher = useStore((s: any) => s.updateVoucher);
  const fetchInvoices = useStore((s: any) => s.fetchInvoices);

  const currentUser = useStore((s: any) => s.currentUser || {}) as UserLike;

  const employeeNameFromLogin =
    currentUser.fullName || currentUser.name || "کۆساری مەلا فەرهاد";

  const employeePhoneFromLogin =
    currentUser.mobileNumber || currentUser.mobile || currentUser.phone || "";

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
      setReceiptNumber("");
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

            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                quantity: String(line.qty / (line.packageQuantity || 1)),
                price: String(line.unitPrice),
                currencyId: line.currencyId || voucher.currencyId || 1,
                discountValue: String(line.discountAmount || ""),
                discountType: "amount",
                note: line.note || "",
              }));
              setRows(mappedRows);
            }

            if (voucher.invoiceDiscountValue) {
              setInvoiceDiscountValue(String(voucher.invoiceDiscountValue));
              if (voucher.invoiceDiscountType) {
                setInvoiceDiscountType(voucher.invoiceDiscountType);
              }
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err: any) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
    }
  }, [editId]);

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [rows, setRows] = useState<QuotationRow[]>([]);

  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState("");
  const [invoiceDiscountType, setInvoiceDiscountType] =
    useState<DiscountType>("amount");

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
    showQuotationNotice: true,
    showEmployeeInfo: false,
    showRows: true,
    showItemCode: true,
    showItemDiscount: true,
    showItemNote: true,
  });

  useEffect(() => {
    setReceiptNumber("");
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setReceiptDate(new Date().toISOString().slice(0, 10));
  }, []);

  const activeProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    return products.filter((product: any) => {
      if (product.isActive === false) return false;
      if (product.isExpense) return false;
      if (product.isService) return false;

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

  const subtotalByCurrency = getSubtotalByCurrency();
  const itemDiscountByCurrency = getItemDiscountByCurrency();
  const afterItemDiscountByCurrency = subtractMoneyMap(
    subtotalByCurrency,
    itemDiscountByCurrency
  );
  const invoiceDiscountByCurrency = getInvoiceDiscountByCurrency();
  const grandTotalByCurrency = subtractMoneyMap(
    afterItemDiscountByCurrency,
    invoiceDiscountByCurrency
  );

  const totalQuantity = rows.reduce(
    (sum, row) => sum + toNumber(row.quantity),
    0
  );

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      receiptDate,
      createdTime,
      rows,
      invoiceDiscountValue,
      invoiceDiscountType,
      receiptNote,
      printNote,
      printOptions,
    });
  }, [
    receiptDate,
    createdTime,
    rows,
    invoiceDiscountValue,
    invoiceDiscountType,
    receiptNote,
    printNote,
    printOptions,
  ]);

  

  useEffect(() => {
    if (editId && !isEditLoading && !savedSnapshot) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [editId, isEditLoading, currentSnapshot, savedSnapshot]);

  const isSaved = savedSnapshot !== "" && savedSnapshot === currentSnapshot;
  useEffect(() => {
    const checkFn = () => {
      const unsaved = !isSaved && !isLocked && hasUnsavedData();
      return { unsaved, isEdit: !!editId };
    };
    checkFn.owner = 'QuotationPage.tsx';
    (window as any).hasUnsavedChanges = checkFn;
    return () => {
      if ((window as any).hasUnsavedChanges && (window as any).hasUnsavedChanges.owner === 'QuotationPage.tsx') {
        delete (window as any).hasUnsavedChanges;
      }
    };
  }, [isSaved, isLocked, editId, currentSnapshot]);

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

  function getProduct(productId: number) {
    return products.find((product: any) => product.id === productId);
  }

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function formatCurrencyAmount(value: number, currencyId: number) {
    const code = getCurrencyCode(currencyId);
    const symbol = getCurrencySymbol(currencyId);
    if (code === "IQD") {
      return `دینار ${Number(value || 0).toLocaleString("en-US")}`;
    }
    return `${symbol} ${Number(value || 0).toLocaleString("en-US")}`;
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

  function addMoneyMap(
    baseMap: Record<string, number>,
    addMap: Record<string, number>
  ) {
    const result: Record<string, number> = { ...baseMap };

    for (const [currencyIdText, amount] of Object.entries(addMap)) {
      result[currencyIdText] =
        Number(result[currencyIdText] || 0) + Number(amount || 0);
    }

    return result;
  }

  function subtractMoneyMap(
    baseMap: Record<string, number>,
    subtractMap: Record<string, number>
  ) {
    const result: Record<string, number> = { ...baseMap };

    for (const [currencyIdText, amount] of Object.entries(subtractMap)) {
      result[currencyIdText] =
        Number(result[currencyIdText] || 0) - Number(amount || 0);
    }

    return result;
  }

  function getRowSubtotal(row: QuotationRow) {
    return toNumber(row.quantity) * toNumber(row.price);
  }

  function getRowDiscount(row: QuotationRow) {
    const subtotal = getRowSubtotal(row);
    const discount = toNumber(row.discountValue);

    if (discount <= 0) return 0;

    if (row.discountType === "percent") {
      return Math.min(subtotal, (subtotal * discount) / 100);
    }

    return Math.min(subtotal, discount);
  }

  function getRowTotal(row: QuotationRow) {
    return Math.max(0, getRowSubtotal(row) - getRowDiscount(row));
  }

  function getSubtotalByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = String(row.currencyId);
      map[key] = Number(map[key] || 0) + getRowSubtotal(row);
    }

    return map;
  }

  function getItemDiscountByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = String(row.currencyId);
      map[key] = Number(map[key] || 0) + getRowDiscount(row);
    }

    return map;
  }

  function getInvoiceDiscountByCurrency() {
    const discountValue = toNumber(invoiceDiscountValue);

    if (discountValue <= 0) return {};

    const result: Record<string, number> = {};

    for (const [currencyIdText, amount] of Object.entries(
      afterItemDiscountByCurrency
    )) {
      const n = Number(amount || 0);

      if (n <= 0) continue;

      if (invoiceDiscountType === "percent") {
        result[currencyIdText] = Math.min(n, (n * discountValue) / 100);
      } else {
        const activeCurrencyCount = Object.values(afterItemDiscountByCurrency)
          .filter((v) => Math.abs(Number(v || 0)) > 0.0001).length;

        if (activeCurrencyCount === 1) {
          result[currencyIdText] = Math.min(n, discountValue);
        } else {
          result[currencyIdText] = 0;
        }
      }
    }

    return result;
  }

  function chooseProduct(product: ProductLike) {
    if (blockIfLocked()) return;

    const newRow: QuotationRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      quantity: "1",
      price: String(Number(product.salePrice || 0)),
      currencyId: defaultCurrency.id,
      discountValue: "",
      discountType: "amount",
      note: "",
    };

    setRows((prev) => [newRow, ...prev]);
    setProductSearch("");
    setShowProductList(false);
  }

  function updateRow(rowId: number, patch: Partial<QuotationRow>) {
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
    if (rows.length === 0) {
      showToast("تکایە لانیکەم یەک کەرەستە زیاد بکە.");
      return false;
    }

    for (const row of rows) {
      if (toNumber(row.quantity) <= 0) {
        showToast(`بڕی "${row.productName}" دروست نییە.`);
        return false;
      }

      if (toNumber(row.price) <= 0) {
        showToast(`نرخی "${row.productName}" دروست نییە.`);
        return false;
      }
    }

    return true;
  }

  function resetReceipt() {
    setReceiptNumber("");
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setRows([]);
    setProductSearch("");
    setShowProductList(false);
    setInvoiceDiscountValue("");
    setInvoiceDiscountType("amount");
    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
  }

  function hasUnsavedData() {
    return (
      rows.length > 0 ||
      invoiceDiscountValue.trim() !== "" ||
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

    const iqd = currencies.find((c: any) => c.code === "IQD");
    const rate = iqd ? iqd.rate : 1500;

    const totalDiscountAmount = Object.entries(invoiceDiscountByCurrency || {}).reduce((sum, [currencyIdText, amount]) => {
      return sum + convertCurrency(Number(amount), Number(currencyIdText), defaultCurrency.id, rate, currencies);
    }, 0);

    const getGrandTotalInDefaultCurrency = () => {
      return Object.entries(grandTotalByCurrency).reduce((sum, [currencyIdText, amount]) => {
        return sum + convertCurrency(Number(amount), Number(currencyIdText), defaultCurrency.id, rate, currencies);
      }, 0);
    };

    const grandTotalInBase = getGrandTotalInDefaultCurrency();

    const combineDateAndTime = (dateStr: string, timeStr: string) => {
      try {
        if (!dateStr) return new Date().toISOString();
        let cleanTime = (timeStr || "").trim();
        const ampmMatch = cleanTime.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const minutes = ampmMatch[2];
          const ampm = ampmMatch[3].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          cleanTime = `${hours.toString().padStart(2, "0")}:${minutes}`;
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
      type: "quotation",
      referenceNo: String(receiptNumber),
      date: combineDateAndTime(receiptDate, createdTime),
      accountId: null,
      cashboxId: null,
      currencyId: defaultCurrency.id,
      exchangeRate: rate,
      totalAmount: grandTotalInBase + totalDiscountAmount,
      totalDiscount: totalDiscountAmount,
      netAmount: grandTotalInBase,
      internalNote: receiptNote,
      printNote: printNote,
      employeeName: employeeNameFromLogin,
      lines: rows.map((row: any) => ({
        productId: row.productId,
        qty: toNumber(row.quantity),
        unitPrice: toNumber(row.price),
        discountPercent: row.discountType === "percent" ? toNumber(row.discountValue) : 0,
        discountAmount: getRowDiscount(row),
        lineTotal: getRowTotal(row),
        note: row.note || "",
        currencyId: row.currencyId,
      })),
      paidAmounts: [],
      ledgerEntries: []
    };

    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise.then((res: any) => {
      if (res) {
        setSavedSnapshot(currentSnapshot);
        if (editId) {
          showToast("پسوڵەی نرخاندن نوێکرایەوە ✅", "success");
        } else {
          setIsLocked(true);
          showToast("پسوڵەی نرخاندن خەزن کرا ✅ ڕاپۆرتەکان نوێکرانەوە.", "success");
        }
      } else {
        showToast("هەڵە لە خەزنکردن! تکایە دووبارە هەوڵ بدەوە.", "error");
      }
    }).catch((err: any) => {
      console.error("Save error:", err);
      showToast("هەڵەی نەتۆرک! تکایە دووبارە هەوڵ بدەوە.", "error");
    });
  }

  function handlePrint() {
    if (!editId && !isLocked && !isSaved) {
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

      <div style={pageGrid} className="no-print">
        <aside style={leftPanel}>
          <div style={quotationNoticeBox}>
            ئەم پسوڵە تەنها بۆ نرخاندنە
          </div>

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

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="کۆی کەرەستەکان"
                value={`${totalQuantity.toLocaleString("en-US")} دانە`}
                color="#111827"
              />

              <StatBox
                title="کۆی گشتی"
                value={formatCurrencyMap(grandTotalByCurrency)}
                color="#111827"
              />
            </div>

            <div style={twoCol}>
              <Field label="داشکاندنی گشتی">
                <input
                  value={invoiceDiscountValue}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setInvoiceDiscountValue(onlyDecimal(e.target.value));
                  }}
                  inputMode="decimal"
                  lang="en"
                  dir="ltr"
                  placeholder="0"
                  style={{ ...input, ...lockedFieldStyle }}
                />
              </Field>

              <Field label="جۆر">
                <select
                  value={invoiceDiscountType}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setInvoiceDiscountType(e.target.value as DiscountType);
                  }}
                  style={{ ...input, ...lockedFieldStyle }}
                >
                  <option value="amount">بری دیاریکراو</option>
                  <option value="percent">لەسەدی</option>
                </select>
              </Field>
            </div>

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
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>نرخاندن</h2>}
            
          </div>

          <div style={tableCard}>
            <div style={searchGrid}>
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
                  placeholder="کەرەستە..."
                  style={{ ...input, ...lockedFieldStyle }}
                />

                {showProductList && !isLocked && (
                  <div style={productDropdown}>
                    {activeProducts.length === 0 ? (
                      <div style={emptyText}>هیچ کەرەستەیەک نەدۆزرایەوە</div>
                    ) : (
                      activeProducts.map((product: any) => (
                        <button
                          key={product.id}
                          style={productDropdownItem}
                          onMouseDown={() => chooseProduct(product)}
                        >
                          <strong style={{ color: "#1d4ed8" }}>
                            {product.name}
                          </strong>

                          <span style={smallMuted}>
                            کۆد: {product.code || "-"} / نرخی فرۆشتن:{" "}
                            {formatCurrencyAmount(
                              Number(product.salePrice || 0),
                              defaultCurrency.id
                            )}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <input
                value=""
                readOnly
                placeholder="کۆد"
                style={{ ...input, background: "#f8fafc" }}
              />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>کەرەستە</th>
                    <th style={th}>کۆد</th>
                    <th style={th}>عدد</th>
                    <th style={th}>نرخ</th>
                    <th style={th}>دراو</th>
                    <th style={th}>داشکاندن</th>
                    <th style={th}>کۆی گشتی</th>
                    <th style={th}>چالاکی</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={emptyTableCell}>
                        هیچ کەرەستەیەک زیاد نەکراوە
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td style={tdCenter}>{index + 1}</td>

                        <td style={tdWide}>
                          <strong style={{ color: "#1d4ed8" }}>
                            {row.productName}
                          </strong>

                          {row.note.trim() !== "" && (
                            <div style={rowNoteText}>{row.note}</div>
                          )}
                        </td>

                        <td style={tdCenter}>{row.code || "-"}</td>

                        <td style={tdCenter}>
                          <input
                            value={row.quantity}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateRow(row.id, {
                                quantity: onlyDecimal(e.target.value),
                              })
                            }
                            inputMode="decimal"
                            lang="en"
                            dir="ltr"
                            placeholder="0"
                            style={{ ...smallInput, ...lockedFieldStyle }}
                          />
                        </td>

                        <td style={tdCenter}>
                          <FormattedNumberInput
                            value={row.price}
                            disabled={isLocked}
                            onChange={(val) =>
                              updateRow(row.id, {
                                price: val,
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
                          <div style={discountCell}>
                            <FormattedNumberInput
                              value={row.discountValue}
                              disabled={isLocked}
                              onChange={(val) =>
                                updateRow(row.id, {
                                  discountValue: val,
                                })
                              }
                              placeholder="0"
                              style={{ ...tinyInput, ...lockedFieldStyle }}
                            />

                            <select
                              value={row.discountType}
                              disabled={isLocked}
                              onChange={(e) =>
                                updateRow(row.id, {
                                  discountType: e.target.value as DiscountType,
                                })
                              }
                              style={{ ...tinySelect, ...lockedFieldStyle }}
                            >
                              <option value="amount">$</option>
                              <option value="percent">%</option>
                            </select>
                          </div>
                        </td>

                        <td style={tdCenter}>
                          {formatCurrencyAmount(getRowTotal(row), row.currencyId)}
                        </td>

                        <td style={tdCenter}>
                          <button
                            style={{
                              ...noteSmallBtn,
                              opacity: isLocked ? 0.45 : 1,
                              cursor: isLocked ? "not-allowed" : "pointer",
                            }}
                            disabled={isLocked}
                            onClick={() => {
                              const note = window.prompt(
                                "تێبینی کەرەستە",
                                row.note
                              );

                              if (note !== null) {
                                updateRow(row.id, { note });
                              }
                            }}
                          >
                            تێبینی
                          </button>

                          <button
                            style={{
                              ...deleteBtn,
                              opacity: isLocked ? 0.45 : 1,
                              cursor: isLocked ? "not-allowed" : "pointer",
                              marginTop: 6,
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
              label="کۆی بەهای کاڵاکان"
              value={formatCurrencyMap(subtotalByCurrency)}
            />

            <SummaryItem
              label="داشکاندنی کاڵاکان"
              value={formatCurrencyMap(itemDiscountByCurrency)}
            />

            <SummaryItem
              label="داشکاندنی گشتی"
              value={formatCurrencyMap(invoiceDiscountByCurrency)}
            />

            <SummaryItem
              label="کۆی گشتی"
              value={formatCurrencyMap(grandTotalByCurrency)}
              strong
            />
          </div>
        </main>
      </div>

      <div id="quotation-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

                    {(printOptions.showReceiptInfo || printOptions.showQuotationNotice) && (
            <div style={printInfoGrid}>
              {/* Right Column: Invoice Info Box */}
              {printOptions.showReceiptInfo ? (
                <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                  <PrintInfoLine label="جۆری پسوڵە" value="نرخاندن" />
                  <PrintInfoLine label="ژمارەی پسوڵە" value={receiptNumber} />
                  <PrintInfoLine
                    label="بەروار"
                    value={formatDate(receiptDate)}
                  />
                  <PrintInfoLine label="کاتژمێر" value={createdTime} />
                </div>
              ) : (
                <div />
              )}

              {/* Left Column: Stack of Account Info & Employee Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {printOptions.showQuotationNotice && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                    
                  </div>
                )}

                {/* Employee Info Box */}
                {printOptions.showEmployeeInfo && (employeeNameFromLogin?.trim() !== "" || employeePhoneFromLogin?.trim() !== "") && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                                        {employeeNameFromLogin?.trim() !== "" && (
                      <PrintInfoLine
                        label="کارمەند"
                        value={employeeNameFromLogin}
                      />
                    )}
                    {employeePhoneFromLogin?.trim() !== "" && (
                      <PrintInfoLine
                        label="مۆبایل"
                        value={employeePhoneFromLogin}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          

          {printOptions.showRows && (
            <table style={printTable}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>کەرەستە</th>
                  {printOptions.showItemCode && (
                    <th style={printTh}>کۆد</th>
                  )}
                  <th style={printTh}>عدد</th>
                  <th style={printTh}>نرخ</th>
                  {printOptions.showItemDiscount && (
                    <th style={printTh}>داشکاندن</th>
                  )}
                  <th style={printTh}>کۆی گشتی</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td style={printTd}>{index + 1}</td>

                    <td style={printTdWide}>
                      {row.productName}

                      {printOptions.showItemNote && row.note.trim() !== "" && (
                        <div style={printRowNote}>{row.note}</div>
                      )}
                    </td>

                    {printOptions.showItemCode && (
                      <td style={printTd}>{row.code || "-"}</td>
                    )}

                    <td style={printTd}>
                      {toNumber(row.quantity).toLocaleString("en-US")}
                    </td>

                    <td style={printTd}>
                      {formatCurrencyAmount(toNumber(row.price), row.currencyId)}
                    </td>

                    {printOptions.showItemDiscount && (
                      <td style={printTd}>
                        {getRowDiscount(row) > 0
                          ? formatCurrencyAmount(getRowDiscount(row), row.currencyId)
                          : "-"}
                      </td>
                    )}

                    <td style={printTd}>
                      {formatCurrencyAmount(getRowTotal(row), row.currencyId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="کۆی کەرەستەکان"
                value={`${totalQuantity.toLocaleString("en-US")} دانە`}
                bold
              />
            </div>

            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="کۆی بەهای کاڵاکان"
                value={formatCurrencyMap(subtotalByCurrency)}
              />

              <PrintSummaryLine
                label="داشکاندن"
                value={formatCurrencyMap(
                  addMoneyMap(itemDiscountByCurrency, invoiceDiscountByCurrency)
                )}
              />

              <PrintSummaryLine
                label="کۆی گشتی"
                value={formatCurrencyMap(grandTotalByCurrency)}
                bold
              />
            </div>
          </div>

          {printNote && printNote.trim() !== "" && (
            <div style={{
              marginTop: 12,
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              background: "white",
              fontSize: "12px",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <b>تێبینی:</b>
              <div style={{ marginTop: 4, whiteSpace: "pre-line" }}>{printNote}</div>
            </div>
          )}

          
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
                            <div style={{ ...settingsSection, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری پسووڵە</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" }}>
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
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری هەژمار</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" }}>
                    <SettingCheck
                    label="نووسینی نرخاندن دەرکەوێت"
                    checked={printOptions.showQuotationNotice}
                    onChange={() => togglePrintOption("showQuotationNotice")}
                  />
                  </div>
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>خشتەی چاپ</h3>

                <div style={settingGrid2}>
                  <SettingCheck
                    label="خشتەی کەرەستەکان چاپ بکرێت"
                    checked={printOptions.showRows}
                    onChange={() => togglePrintOption("showRows")}
                  />

                  <SettingCheck
                    label="کۆدی کەرەستە"
                    checked={printOptions.showItemCode}
                    onChange={() => togglePrintOption("showItemCode")}
                  />

                  <SettingCheck
                    label="داشکاندنی کەرەستە"
                    checked={printOptions.showItemDiscount}
                    onChange={() => togglePrintOption("showItemDiscount")}
                  />

                  <SettingCheck
                    label="تێبینی کەرەستە"
                    checked={printOptions.showItemNote}
                    onChange={() => togglePrintOption("showItemNote")}
                  />
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>کارمەند / ئامادەکار</h3>

                <SettingCheck
                  label="زانیاری کارمەند لە چاپ دەرکەوێت"
                  checked={printOptions.showEmployeeInfo}
                  onChange={() => togglePrintOption("showEmployeeInfo")}
                />

                <div style={employeePreviewBox}>
                  <div>
                    <b>ناوی کارمەند:</b>{" "}
                    {employeeNameFromLogin.trim() ||
                      "لە ئەکاونتی کارمەنددا نییە"}
                  </div>
                  <div>
                    <b>مۆبایل:</b>{" "}
                    {employeePhoneFromLogin.trim() ||
                      "لە ئەکاونتی کارمەنددا نییە"}
                  </div>
                </div>
              </div>
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
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
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
  let hideZero = false;
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        hideZero = !!JSON.parse(saved).hideZeroBalance;
      } catch (e) {}
    }
  }

  if (hideZero) {
    const clean = (value || "").replace(/[$,\s\-\+]|دینار|د\.ع/g, "");
    if (clean === "0" || clean === "" || Number(clean) === 0) {
      return null;
    }
  }

  return (
    <div style={{ ...printSummaryLine, justifyContent: "flex-start", gap: "8px" }}>
      <span style={{ display: "inline-block", width: "135px", fontWeight: bold ? 900 : 700, textAlign: "right" }}>{label}</span>
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
  @page { size: auto; margin: 0 !important; }

  body * { visibility: hidden !important; }

  #quotation-print-area,
  #quotation-print-area * {
    visibility: visible !important;
  }

  #quotation-print-area {
    display: block !important;
    position: relative !important;
    width: 100% !important;
    min-height: auto !important;
    background: white !important;
    z-index: 999999 !important;
  }

  button,
  input,
  select,
  textarea {
    display: none !important;
  }
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
  gridTemplateColumns: "var(--page-grid-cols, 360px 1fr)",
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

const quotationNoticeBox: CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 14,
  padding: 14,
  fontWeight: 900,
  textAlign: "center",
  marginBottom: 14,
};

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

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
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

const searchGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 280px",
  gap: 12,
  marginBottom: 16,
};

const productSearchBox: CSSProperties = {
  position: "relative",
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
  verticalAlign: "middle",
};

const tdWide: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  minWidth: 240,
  verticalAlign: "middle",
};

const smallInput: CSSProperties = {
  width: 100,
  padding: "10px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};

const smallSelect: CSSProperties = {
  width: 80,
  padding: "10px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};

const tinyInput: CSSProperties = {
  width: 70,
  padding: "10px 6px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};

const tinySelect: CSSProperties = {
  width: 56,
  padding: "10px 4px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
  fontFamily: appFont,
};

const discountCell: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const rowNoteText: CSSProperties = {
  color: "#6b7280",
  fontSize: 12,
  marginTop: 6,
};

const noteSmallBtn: CSSProperties = {
  display: "block",
  width: "100%",
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#2563eb",
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: appFont,
};

const deleteBtn: CSSProperties = {
  display: "block",
  width: "100%",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  borderRadius: 10,
  padding: "8px 10px",
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
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

const summaryItem: CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  borderRadius: 14,
  padding: 14,
};

const printArea: CSSProperties = {
  display: "none",
};

const printPage: CSSProperties = {
  width: "100%",
  minHeight: "auto",
  background: "white",
  padding: "0 4mm 4mm 4mm",
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
  border: "1px solid #d1d5db",
  padding: 8,
  fontSize: 11,
  minHeight: 54,
  backgroundColor: "#f9fafb",
  borderRadius: 4,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const printNoticeText: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1d4ed8",
  lineHeight: 1.9,
};

const printEmployeeBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 11,
  marginBottom: 8,
  background: "#fafafa",
};

const printInfoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "75px 1fr",
  gap: 8,
  alignItems: "center",
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
  verticalAlign: "middle",
};

const printTdWide: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "6px 5px",
  textAlign: "right",
  verticalAlign: "middle",
  minWidth: 120,
};

const printRowNote: CSSProperties = {
  marginTop: 4,
  fontSize: 9,
  color: "#6b7280",
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
  display: "grid",
  gridTemplateColumns: "95px 1fr",
  gap: 8,
  alignItems: "center",
  borderBottom: "1px solid #f1f5f9",
  padding: "4px 0",
};

const printNoteBox: CSSProperties = {
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

const employeePreviewBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#ffffff",
  padding: 12,
  lineHeight: 2,
  color: "#374151",
};

const modalFooter: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-start",
};
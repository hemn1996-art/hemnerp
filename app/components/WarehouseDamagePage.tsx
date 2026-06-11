"use client";
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

type WarehouseLike = {
  id: number;
  name: string;
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
  warehouseStocks?: {
    warehouseId: number;
    quantity: number;
    cost?: number;
    currencyId?: number;
  }[];
};

type UserLike = {
  id?: number;
  name?: string;
  fullName?: string;
  phone?: string;
  mobile?: string;
  mobileNumber?: string;
};

type DamageRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  quantity: string;
  purchaseCost: string;
  currencyId: number;
  availableQty: number;
  note: string;
};

type PrintOptions = {
  showReceiptInfo: boolean;
  showReceiptNumber: boolean;
  showReceiptDate: boolean;
  showCreatedTime: boolean;
  showWarehouseInfo: boolean;
  showEmployeeInfo: boolean;
  showRows: boolean;
  showItemCode: boolean;
  showItemNote: boolean;
};

const fallbackWarehouses: WarehouseLike[] = [
  { id: 1, name: "کۆگای سەرەکی", isActive: true },
  { id: 2, name: "کۆگای دووەم", isActive: true },
];

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function WarehouseDamagePage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const products = (store.products || []) as ProductLike[];
  const storeCurrencies = (store as any).currencies || [];
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;

  const warehouses =
    (((store as any).warehouses || []) as WarehouseLike[]).length > 0
      ? (((store as any).warehouses || []) as WarehouseLike[])
      : fallbackWarehouses;

  const currentUser =
    ((store as any).currentUser ||
      (store as any).loggedInUser ||
      (store as any).user ||
      {}) as UserLike;

  const employeeNameFromLogin = currentUser.fullName || currentUser.name || "";
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
            if (voucher.warehouseId) setWarehouseId(voucher.warehouseId);

            if (voucher.items && voucher.items.length > 0) {
              const mappedRows: DamageRow[] = voucher.items.map((i: any) => ({
                id: Math.random(),
                productId: i.productId,
                productName: i.name,
                code: i.code || "",
                quantity: String(i.quantity),
                purchaseCost: String(i.purchaseCost || i.unitCost || 0),
                currencyId: i.currencyId || defaultCurrency.id,
                availableQty: 999999, // Bypass validation
                note: i.note || "",
              }));
              setRows(mappedRows);
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
    }
  }, [editId, warehouses]);

  const [warehouseId, setWarehouseId] = useState<number | undefined>(
    warehouses[0]?.id
  );

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [rows, setRows] = useState<DamageRow[]>([]);
  const [openDetailRowId, setOpenDetailRowId] = useState<number | null>(null);

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
    showWarehouseInfo: true,
    showEmployeeInfo: false,
    showRows: true,
    showItemCode: true,
    showItemNote: true,
  });

  useEffect(() => {
    setReceiptNumber(Date.now().toString().slice(-6));

    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    setReceiptDate(new Date().toISOString().slice(0, 10));
  }, []);

  const selectedWarehouse = warehouses.find(
    (warehouse: any) => warehouse.id === warehouseId
  );

  const activeProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    return products.filter((product: any) => {
      if (product.isActive === false) return false;
      if (product.isExpense) return false;
      if (product.isService) return false;

      const available = getAvailableQty(product);
      if (available <= 0) return false;

      if (!q) return true;

      return (
        String(product.name || "").toLowerCase().includes(q) ||
        String(product.code || "").toLowerCase().includes(q) ||
        String(product.barcode || "").toLowerCase().includes(q) ||
        String(product.category || "").toLowerCase().includes(q) ||
        String(product.brand || "").toLowerCase().includes(q)
      );
    });
  }, [productSearch, products, warehouseId]);

  const totalQuantity = rows.reduce(
    (sum, row) => sum + toNumber(row.quantity),
    0
  );

  const totalLossByCurrency = getTotalLossByCurrency();

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      warehouseId,
      receiptDate,
      createdTime,
      rows,
      receiptNote,
      printNote,
      printOptions,
    });
  }, [
    warehouseId,
    receiptDate,
    createdTime,
    rows,
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

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((currency: any) => currency.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((currency: any) => currency.id === currencyId)?.code || "";
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
        formatCurrencyAmount(Number(amount || 0), Number(currencyIdText))
      );

    return parts.length ? parts.join(" + ") : "0";
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";

    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  function getProduct(productId: number) {
    return products.find((product: any) => product.id === productId);
  }

  function getAvailableQty(product: ProductLike | undefined) {
    if (!product || !warehouseId) return 0;

    if (product.warehouseStocks && product.warehouseStocks.length > 0) {
      const stock = product.warehouseStocks.find(
        (item: any) => item.warehouseId === warehouseId
      );

      return Number(stock?.quantity || 0);
    }

    if (warehouseId === warehouses[0]?.id) {
      return Number(product.stock || 0);
    }

    return 0;
  }

  function getWarehouseCost(product: ProductLike | undefined) {
    if (!product || !warehouseId) return 0;

    if (product.warehouseStocks && product.warehouseStocks.length > 0) {
      const stock = product.warehouseStocks.find(
        (item: any) => item.warehouseId === warehouseId
      );

      if (stock?.cost !== undefined) return Number(stock.cost || 0);
    }

    return Number(product.costPrice || 0);
  }

  function getWarehouseCurrencyId(product: ProductLike | undefined) {
    if (!product || !warehouseId) return defaultCurrency.id;

    if (product.warehouseStocks && product.warehouseStocks.length > 0) {
      const stock = product.warehouseStocks.find(
        (item: any) => item.warehouseId === warehouseId
      );

      if (stock?.currencyId !== undefined) return Number(stock.currencyId);
    }

    return defaultCurrency.id;
  }

  function getTotalLossByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = String(row.currencyId);
      const rowLoss = toNumber(row.quantity) * toNumber(row.purchaseCost);

      map[key] = Number(map[key] || 0) + rowLoss;
    }

    return map;
  }

  function chooseProduct(product: ProductLike) {
    if (blockIfLocked()) return;

    if (!warehouseId) {
      showToast("تکایە کۆگا دیاری بکە.");
      return;
    }

    const existing = rows.find((row: any) => row.productId === product.id);

    if (existing) {
      setProductSearch("");
      setShowProductList(false);
      showToast("ئەم کەرەستەیە پێشتر زیادکراوە.", "info");
      return;
    }

    const available = getAvailableQty(product);

    if (available <= 0) {
      showToast("ئەم کەرەستەیە لەم کۆگایەدا بەردەست نییە.");
      return;
    }

    const newRow: DamageRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      quantity: "1",
      purchaseCost: String(getWarehouseCost(product)),
      currencyId: getWarehouseCurrencyId(product),
      availableQty: available,
      note: "",
    };

    setRows((prev) => [...prev, newRow]);

    // گرنگ: وردەکاری کەرەستە یەکسەر دەرناکەوێت
    setOpenDetailRowId(null);

    setProductSearch("");
    setShowProductList(false);
  }

  function updateRow(rowId: number, patch: Partial<DamageRow>) {
    if (blockIfLocked()) return;

    setRows((prev) =>
      prev.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  function removeRow(rowId: number) {
    if (blockIfLocked()) return;

    setRows((prev) => prev.filter((row: any) => row.id !== rowId));

    if (openDetailRowId === rowId) {
      setOpenDetailRowId(null);
    }
  }

  function validateBeforeSave() {
    if (!warehouseId) {
      showToast("تکایە کۆگا دیاری بکە.");
      return false;
    }

    if (rows.length === 0) {
      showToast("تکایە لانیکەم یەک کەرەستە زیاد بکە.");
      return false;
    }

    for (const row of rows) {
      const product = getProduct(row.productId);
      const quantity = toNumber(row.quantity);
      const available = getAvailableQty(product);

      if (!product) {
        showToast(`کەرەستەی "${row.productName}" نەدۆزرایەوە.`);
        return false;
      }

      if (quantity <= 0) {
        showToast(`بڕی "${row.productName}" دروست نییە.`);
        return false;
      }

      if (quantity > available) {
        showToast(
          `بڕی "${row.productName}" زیاترە لە دانەی بەردەست. بەردەست: ${available}`
        );
        return false;
      }

      if (toNumber(row.purchaseCost) < 0) {
        showToast(`نرخی کڕینی "${row.productName}" دروست نییە.`);
        return false;
      }
    }

    return true;
  }

  function ensureWarehouseStocks(product: ProductLike) {
    if (!product.warehouseStocks) {
      product.warehouseStocks = [
        {
          warehouseId: warehouses[0]?.id || 1,
          quantity: Number(product.stock || 0),
          cost: Number(product.costPrice || 0),
          currencyId: defaultCurrency.id,
        },
      ];
    }

    return product.warehouseStocks;
  }

  function applyWarehouseDamage() {
    if (!warehouseId) return;

    for (const row of rows) {
      const product = getProduct(row.productId);
      if (!product) continue;

      const quantity = toNumber(row.quantity);
      const stocks = ensureWarehouseStocks(product);

      let stock = stocks.find((item: any) => item.warehouseId === warehouseId);

      if (!stock) {
        stock = {
          warehouseId,
          quantity: 0,
          cost: toNumber(row.purchaseCost),
          currencyId: row.currencyId,
        };
        stocks.push(stock);
      }

      stock.quantity = Number(stock.quantity || 0) - quantity;
      stock.cost = toNumber(row.purchaseCost);
      stock.currencyId = row.currencyId;

      product.stock = stocks.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
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

    setWarehouseId(warehouses[0]?.id);
    setRows([]);
    setProductSearch("");
    setShowProductList(false);
    setOpenDetailRowId(null);

    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);

    setSavedSnapshot("");
    setIsLocked(false);
  }

  function hasUnsavedData() {
    return (
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

    const totalLossNumber = Object.values(totalLossByCurrency).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

    const items = rows.map((row: any) => ({
      productId: row.productId,
      name: row.productName,
      code: row.code,
      quantity: toNumber(row.quantity),
      purchaseCost: toNumber(row.purchaseCost),
      currencyId: row.currencyId,
      totalLoss: toNumber(row.quantity) * toNumber(row.purchaseCost),
      warehouseId,
      warehouseName: selectedWarehouse?.name || "",
      note: row.note,
    }));

    saveInvoice({
      id: Number(receiptNumber || Date.now().toString().slice(-6)),
      type: "خەسارەی کۆگا",

      warehouseId,
      warehouseName: selectedWarehouse?.name || "",

      items,
      totalQuantity,
      totalLossByCurrency,

      cashboxEffect: 0,
      cashboxEffectByCurrency: {},

      accountEffect: 0,
      accountBalanceEffect: 0,

      profitEffect: -totalLossNumber,
      profitEffectByCurrency: Object.fromEntries(
        Object.entries(totalLossByCurrency).map(([currencyIdText, value]) => [
          currencyIdText,
          -Number(value || 0),
        ])
      ),

      warehouseEffect: "decrease-stock-damage-loss",

      reportScope: "warehouse-damage-loss",
      affectsCashbox: false,
      affectsDebtReport: false,
      affectsAccountBalance: false,
      affectsProfitReport: true,
      affectsWarehouse: true,
      affectsSalesReport: false,
      affectsPurchaseReport: false,

      note: receiptNote,
      printNote,

      employeeName: employeeNameFromLogin,
      employeePhone: employeePhoneFromLogin,
      showEmployeeInfo: printOptions.showEmployeeInfo,

      createdAt: new Date().toISOString(),
      date: receiptDate,
      createdTime,
    } as any);

    applyWarehouseDamage();

    setSavedSnapshot(currentSnapshot);
    setIsLocked(true);
    setOpenDetailRowId(null);

    showToast("پسوڵەی خەسارەی کۆگا خەزن کرا ✅", "success");
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
          <Field label="کۆگا">
            <select
              value={warehouseId || ""}
              disabled={isLocked}
              onChange={(event) => {
                if (blockIfLocked()) return;
                setWarehouseId(Number(event.target.value));
                setRows([]);
                setOpenDetailRowId(null);
              }}
              style={{ ...input, ...lockedFieldStyle }}
            >
              <option value="">کۆگا دیاری بکە</option>
              {warehouses
                .filter((warehouse: any) => warehouse.isActive !== false)
                .map((warehouse: any) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
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

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="کۆی بڕ"
                value={`${totalQuantity.toLocaleString("en-US")} دانە`}
                color="#111827"
              />

              <StatBox
                title="کۆی زەرەر"
                value={formatCurrencyMap(totalLossByCurrency)}
                color="#dc2626"
              />
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
                      onChange={(event) => {
                        if (blockIfLocked()) return;
                        setReceiptNote(event.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>

                  <Field label="تێبینی چاپ">
                    <textarea
                      value={printNote}
                      disabled={isLocked}
                      onChange={(event) => {
                        if (blockIfLocked()) return;
                        setPrintNote(event.target.value);
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
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>خەسارەی کۆگا</h2>}

            
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
                  onChange={(event) => {
                    if (blockIfLocked()) return;
                    setProductSearch(event.target.value);
                    setShowProductList(true);
                  }}
                  placeholder="کەرەستە..."
                  style={{ ...input, ...lockedFieldStyle }}
                />

                {showProductList && !isLocked && activeProducts.length > 0 && (
                  <div style={productDropdown}>
                    {activeProducts.map((product: any) => (
                      <button
                        key={product.id}
                        style={productDropdownItem}
                        onMouseDown={() => chooseProduct(product)}
                      >
                        <strong style={{ color: "#1d4ed8" }}>
                          {product.name}
                        </strong>

                        <span style={smallMuted}>
                          کۆد: {product.code || "-"} / بەردەست:{" "}
                          {getAvailableQty(product)} / نرخی کڕین:{" "}
                          {formatCurrencyAmount(
                            getWarehouseCost(product),
                            getWarehouseCurrencyId(product)
                          )}
                        </span>
                      </button>
                    ))}
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
                    <th style={th}>بڕ</th>
                    <th style={th}>نرخی کڕین</th>
                    <th style={th}>دراو</th>
                    <th style={th}>کۆی زەرەر</th>
                    <th style={th}>چالاکی</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={emptyTableCell}>
                        هیچ کەرەستەیەک زیاد نەکراوە
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const rowTotal =
                        toNumber(row.quantity) * toNumber(row.purchaseCost);
                      const isOpen = openDetailRowId === row.id;

                      return (
                        <tr key={row.id}>
                          <td style={tdCenter}>{index + 1}</td>

                          <td style={tdWide}>
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => {
                                if (isLocked) return;
                                setOpenDetailRowId(isOpen ? null : row.id);
                              }}
                              style={itemNameButton}
                            >
                              {row.productName}
                            </button>

                            <div style={smallMuted}>
                              بەردەست: {row.availableQty}
                            </div>

                            {row.note.trim() !== "" && (
                              <div style={rowNoteText}>{row.note}</div>
                            )}

                            {isOpen && !isLocked && (
                              <div style={itemDetailPopover}>
                                <div style={detailHeader}>
                                  <strong>وردەکاری کەرەستە</strong>

                                  <button
                                    type="button"
                                    style={detailCloseBtn}
                                    onClick={() => setOpenDetailRowId(null)}
                                  >
                                    ×
                                  </button>
                                </div>

                                <div style={detailInfoLine}>
                                  <span>بەردەست</span>
                                  <b>{row.availableQty.toLocaleString("en-US")} دانە</b>
                                </div>

                                <div style={detailGridCompact}>
                                  <Field label="بڕ">
                                    <input
                                      value={row.quantity}
                                      onChange={(event) => {
                                        const value = onlyDecimal(
                                          event.target.value
                                        );
                                        const n = toNumber(value);

                                        if (n > row.availableQty) {
                                          showToast(
                                            `بڕی "${row.productName}" نابێت زیاتر بێت لە ${row.availableQty}`
                                          );
                                          return;
                                        }

                                        updateRow(row.id, { quantity: value });
                                      }}
                                      inputMode="decimal"
                                      lang="en"
                                      dir="ltr"
                                      placeholder="0"
                                      style={detailInput}
                                    />
                                  </Field>

                                  <Field label="نرخی کڕین">
                                    <input
                                      value={row.purchaseCost}
                                      onChange={(event) =>
                                        updateRow(row.id, {
                                          purchaseCost: onlyDecimal(
                                            event.target.value
                                          ),
                                        })
                                      }
                                      inputMode="decimal"
                                      lang="en"
                                      dir="ltr"
                                      placeholder="0"
                                      style={detailInput}
                                    />
                                  </Field>

                                  <Field label="دراو">
                                    <select 
                                      value={row.currencyId}
                                      onChange={(event) =>
                                        updateRow(row.id, {
                                          currencyId: Number(event.target.value),
                                        })
                                      }
                                      style={{ ...detailInput, minWidth: "130px" }}
                                    >
                                      {currencies.map((currency: any) => (
                                        <option
                                          key={currency.id}
                                          value={currency.id}
                                        >
                                          {currency.name}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>

                                  <Field label="کۆی زەرەر">
                                    <input
                                      value={formatCurrencyAmount(
                                        toNumber(row.quantity) *
                                          toNumber(row.purchaseCost),
                                        row.currencyId
                                      )}
                                      readOnly
                                      style={{
                                        ...detailInput,
                                        background: "#f8fafc",
                                        fontWeight: 900,
                                        color: "#dc2626",
                                      }}
                                    />
                                  </Field>
                                </div>

                                <Field label="تێبینی کەرەستە">
                                  <textarea
                                    value={row.note}
                                    onChange={(event) =>
                                      updateRow(row.id, {
                                        note: event.target.value,
                                      })
                                    }
                                    rows={2}
                                    style={detailTextarea}
                                    placeholder="تێبینی بۆ ئەم کەرەستەیە..."
                                  />
                                </Field>

                                <div style={detailFooter}>
                                  <button
                                    type="button"
                                    style={detailDoneBtn}
                                    onClick={() => setOpenDetailRowId(null)}
                                  >
                                    خەزنکردن / تەواو
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          <td style={tdCenter}>{row.code || "-"}</td>

                          <td style={tdCenter}>
                            {toNumber(row.quantity).toLocaleString("en-US")}
                          </td>

                          <td style={tdCenter}>
                            {formatCurrencyAmount(
                              toNumber(row.purchaseCost),
                              row.currencyId
                            )}
                          </td>

                          <td style={tdCenter}>
                            {getCurrencySymbol(row.currencyId)}
                          </td>

                          <td style={tdCenter}>
                            {formatCurrencyAmount(rowTotal, row.currencyId)}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <div id="warehouse-damage-print-area" style={printArea}>
        <div style={printPage}>
          <div style={printHeaderBlankSpace}></div>

          <div style={printInfoGrid}>
            {printOptions.showWarehouseInfo && (
              <div style={printInfoBox}>
                <PrintInfoLine
                  label="کۆگا"
                  value={selectedWarehouse?.name || "-"}
                />
              </div>
            )}

            {printOptions.showReceiptInfo && (
              <div style={printInfoBox}>
                <PrintInfoLine label="جۆری پسوڵە" value="خەسارەی کۆگا" />

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
              </div>
            )}
          </div>

          {printOptions.showEmployeeInfo &&
            (employeeNameFromLogin.trim() !== "" ||
              employeePhoneFromLogin.trim() !== "") && (
              <div style={printEmployeeBox}>
                {employeeNameFromLogin.trim() !== "" && (
                  <PrintInfoLine
                    label="کارمەند"
                    value={employeeNameFromLogin}
                  />
                )}

                {employeePhoneFromLogin.trim() !== "" && (
                  <PrintInfoLine
                    label="مۆبایل"
                    value={employeePhoneFromLogin}
                  />
                )}
              </div>
            )}

          {printOptions.showRows && (
            <table style={printTable}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>کەرەستە</th>
                  {printOptions.showItemCode && <th style={printTh}>کۆد</th>}
                  <th style={printTh}>بڕ</th>
                  <th style={printTh}>نرخی کڕین</th>
                  <th style={printTh}>کۆی زەرەر</th>
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
                      {toNumber(row.quantity).toLocaleString("en-US")} دانە
                    </td>

                    <td style={printTd}>
                      {formatCurrencyAmount(
                        toNumber(row.purchaseCost),
                        row.currencyId
                      )}
                    </td>

                    <td style={printTd}>
                      {formatCurrencyAmount(
                        toNumber(row.quantity) * toNumber(row.purchaseCost),
                        row.currencyId
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="کۆی بڕ"
                value={`${totalQuantity.toLocaleString("en-US")} دانە`}
                bold
              />
            </div>

            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="کۆی زەرەر"
                value={formatCurrencyMap(totalLossByCurrency)}
                bold
              />

              {printNote.trim() !== "" && (
                <div style={printNoteBox}>
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
                <h3 style={settingsTitle}>زانیاریەکانی سەرەوە</h3>

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
                    label="کاتژمێر"
                    checked={printOptions.showCreatedTime}
                    onChange={() => togglePrintOption("showCreatedTime")}
                  />

                  <SettingCheck
                    label="زانیاری کۆگا"
                    checked={printOptions.showWarehouseInfo}
                    onChange={() => togglePrintOption("showWarehouseInfo")}
                  />
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

  #warehouse-damage-print-area,
  #warehouse-damage-print-area * {
    visibility: visible !important;
  }

  #warehouse-damage-print-area {
    display: block !important;
    position: absolute !important;
    inset: 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
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
  verticalAlign: "top",
};

const tdWide: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  minWidth: 260,
  verticalAlign: "top",
};

const itemNameButton: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "#1d4ed8",
  fontWeight: 900,
  cursor: "pointer",
  padding: 0,
  fontFamily: appFont,
  fontSize: 15,
  textAlign: "right",
};

const itemDetailPopover: CSSProperties = {
  marginTop: 10,
  width: 420,
  maxWidth: "100%",
  padding: 12,
  border: "1px solid #bfdbfe",
  borderRadius: 16,
  background: "#ffffff",
  boxShadow: "0 18px 45px rgba(15,23,42,0.16)",
  position: "relative",
  zIndex: 20,
};

const detailHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 8,
  marginBottom: 10,
  color: "#1d4ed8",
};

const detailCloseBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: "22px",
};

const detailInfoLine: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "8px 10px",
  marginBottom: 10,
  color: "#374151",
};

const detailGridCompact: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 10,
};

const detailInput: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  background: "white",
  boxSizing: "border-box",
  fontFamily: appFont,
};

const detailTextarea: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: appFont,
};

const detailFooter: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  marginTop: 10,
};

const detailDoneBtn: CSSProperties = {
  borderRadius: 10,
  border: 0,
  background: "#2563eb",
  color: "white",
  padding: "10px 18px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};

const rowNoteText: CSSProperties = {
  color: "#6b7280",
  fontSize: 12,
  marginTop: 6,
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

const printArea: CSSProperties = {
  display: "none",
};

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

const printEmployeeBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 11,
  marginBottom: 8,
  background: "#fafafa",
};

const printInfoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "85px 1fr",
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
  verticalAlign: "top",
};

const printTdWide: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "6px 5px",
  textAlign: "right",
  verticalAlign: "top",
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
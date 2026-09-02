"use client";
import { openPrintWindow } from "@/app/utils/printWindow";
﻿import DateInput from "./DateInput";
import FormattedNumberInput from "./FormattedNumberInput";
import PrintHeader, { PrintWatermark } from "./PrintHeader";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store, useStore } from "../store/store";
import { saveInvoice } from "../utils/invoiceLogic";
import { normalizeKurdishSearchText } from "../utils/digits";
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

type StockRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  quantity: string;
  unitCost: string;
  currencyId: number;
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

export default function WarehouseStockPage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);
  const addVoucher = useStore((s) => s.addVoucher);
  const updateVoucher = useStore((s) => s.updateVoucher);
  const fetchProducts = useStore((s) => s.fetchProducts);

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
            const wId = voucher.warehouseId || voucher.inventoryTransactions?.[0]?.warehouseId;
            if (wId) setWarehouseId(wId);

            const dbLines = voucher.lines || [];
            const mockItems = voucher.items || [];

            if (dbLines.length > 0) {
              const mappedRows: StockRow[] = dbLines.map((l: any) => ({
                id: Math.random(),
                productId: l.productId,
                productName: l.product?.name || "",
                code: l.product?.code || "",
                quantity: String(l.qty),
                unitCost: String(l.unitPrice || 0),
                currencyId: l.currencyId || defaultCurrency.id,
                note: l.note || "",
              }));
              setRows(mappedRows);
            } else if (mockItems.length > 0) {
              const mappedRows: StockRow[] = mockItems.map((i: any) => ({
                id: Math.random(),
                productId: i.productId,
                productName: i.name,
                code: i.code || "",
                quantity: String(i.quantity),
                unitCost: String(i.unitCost || 0),
                currencyId: i.currencyId || defaultCurrency.id,
                note: i.note || "",
              }));
              setRows(mappedRows);
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            let versionData: any = {};
            if (voucher.versions && voucher.versions.length > 0) {
              const sortedVers = [...voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
              const lastVersion = sortedVers[sortedVers.length - 1];
              try { versionData = JSON.parse(lastVersion.data); } catch(e){}
            }
            const loadedRateType = voucher.exchangeRateType || versionData.exchangeRateType || "DAILY_MARKET";
            const loadedCustomRate = String(voucher.customExchangeRate || versionData.customExchangeRate || "132000");

            setExchangeRateType(loadedRateType);
            setCustomExchangeRate(loadedCustomRate);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
    }
  }, [editId]);

  const [warehouseId, setWarehouseId] = useState<number | undefined>(
    warehouses[0]?.id
  );

  const [exchangeRateType, setExchangeRateType] = useState<"DAILY_MARKET" | "FIXED">("DAILY_MARKET");
  const [customExchangeRate, setCustomExchangeRate] = useState<string>("132000");
  const [printPaperSize, setPrintPaperSize] = useState<"A4" | "A5">("A4");

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [rows, setRows] = useState<StockRow[]>([]);

  const [receiptNote, setReceiptNote] = useState("");
  const [printNote, setPrintNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [invoiceTemplates, setInvoiceTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string>("");

  useEffect(() => {
    fetch("/api/invoice-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setInvoiceTemplates(data);
          const savedId = localStorage.getItem("selected_invoice_template_id");
          if (savedId && data.some((t: any) => String(t.id) === savedId)) {
            setSelectedTemplateId(Number(savedId));
          } else {
            const main = data.find((t: any) => t.isMain && t.isActive) || data[0];
            if (main) setSelectedTemplateId(main.id);
          }
        }
      })
      .catch((err) => console.error("Error loading invoice templates:", err));
  }, []);
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
    setReceiptNumber("");
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
    const q = normalizeKurdishSearchText(productSearch).trim();

    return products.filter((product: any) => {
      if (product.isActive === false) return false;
      if (product.isExpense) return false;
      if (product.isService) return false;

      if (!q) return true;

      return (
        normalizeKurdishSearchText(product.name || "").includes(q) ||
        normalizeKurdishSearchText(product.code || "").includes(q) ||
        normalizeKurdishSearchText(product.barcode || "").includes(q) ||
        normalizeKurdishSearchText(product.category || "").includes(q) ||
        normalizeKurdishSearchText(product.brand || "").includes(q)
      );
    });
  }, [productSearch, products]);

  const totalQuantity = rows.reduce(
    (sum, row) => sum + toNumber(row.quantity),
    0
  );

  const totalCostByCurrency = getTotalCostByCurrency();

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      warehouseId,
      receiptDate,
      createdTime,
      rows,
      exchangeRateType,
      customExchangeRate,
      receiptNote,
      printNote,
      printOptions,
    });
  }, [
    warehouseId,
    receiptDate,
    createdTime,
    rows,
    exchangeRateType,
    customExchangeRate,
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
    checkFn.owner = 'WarehouseStockPage.tsx';
    (window as any).hasUnsavedChanges = checkFn;
    return () => {
      if ((window as any).hasUnsavedChanges && (window as any).hasUnsavedChanges.owner === 'WarehouseStockPage.tsx') {
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

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function formatCurrencyAmount(value: number, currencyId: number) {
    const code = getCurrencyCode(currencyId);
    const absVal = Math.abs(Number(value || 0));
    if (code === "IQD" || Number(currencyId) === 2) {
      return `دینار ${Math.round(absVal).toLocaleString("en-US")}`;
    }
    return `$ ${absVal.toLocaleString("en-US")}`;
  }

  function formatCurrencyMap(map: Record<string, number>) {
    const parts = Object.entries(map)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText, amount]) =>
        formatCurrencyAmount(amount, Number(currencyIdText))
      );

    return parts.length ? parts.join(" و ") : "0";
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";

    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  function getProduct(productId: number) {
    return products.find((product: any) => product.id === productId);
  }

  function getTotalCostByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = String(row.currencyId);
      const rowTotal = toNumber(row.quantity) * toNumber(row.unitCost);

      map[key] = Number(map[key] || 0) + rowTotal;
    }

    return map;
  }

  function getAvailableQty(product: ProductLike | undefined) {
    if (!product || !warehouseId) return 0;

    if (product.warehouseStocks && product.warehouseStocks.length > 0) {
      const found = product.warehouseStocks.find(
        (stock) => stock.warehouseId === warehouseId
      );

      return Number(found?.quantity || 0);
    }

    return Number(product.stock || 0);
  }

  function getCurrentWarehouseCost(product: ProductLike | undefined) {
    if (!product || !warehouseId) return 0;

    if (product.warehouseStocks && product.warehouseStocks.length > 0) {
      const found = product.warehouseStocks.find(
        (stock) => stock.warehouseId === warehouseId
      );

      if (found?.cost !== undefined) return Number(found.cost || 0);
    }

    return Number(product.costPrice || 0);
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

    const costPrice = Number(product.costPrice || 0);

    const newRow: StockRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      quantity: "1",
      unitCost: String(costPrice),
      currencyId: defaultCurrency.id,
      note: "",
    };

    setRows((prev) => [newRow, ...prev]);
    setProductSearch("");
    setShowProductList(false);
  }

  function updateRow(rowId: number, patch: Partial<StockRow>) {
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
    if (!warehouseId) {
      showToast("تکایە کۆگا دیاری بکە.");
      return false;
    }

    if (rows.length === 0) {
      showToast("تکایە لانیکەم یەک کەرەستە زیاد بکە.");
      return false;
    }

    for (const row of rows) {
      if (!getProduct(row.productId)) {
        showToast(`کەرەستەی "${row.productName}" نەدۆزرایەوە.`);
        return false;
      }

      if (toNumber(row.quantity) <= 0) {
        showToast(`بڕی "${row.productName}" دروست نییە.`);
        return false;
      }

      if (toNumber(row.unitCost) < 0) {
        showToast(`کۆستی "${row.productName}" دروست نییە.`);
        return false;
      }
    }

    return true;
  }

  function applyWarehouseStockEntry() {
    if (!warehouseId) return;

    for (const row of rows) {
      const product = getProduct(row.productId);
      if (!product) continue;

      const quantity = toNumber(row.quantity);
      const unitCost = toNumber(row.unitCost);

      const stocks = ensureWarehouseStocks(product);

      let warehouseStock = stocks.find(
        (stock) => stock.warehouseId === warehouseId
      );

      if (!warehouseStock) {
        warehouseStock = {
          warehouseId,
          quantity: 0,
          cost: unitCost,
          currencyId: row.currencyId,
        };
        stocks.push(warehouseStock);
      }

      warehouseStock.quantity = Number(warehouseStock.quantity || 0) + quantity;
      warehouseStock.cost = unitCost;
      warehouseStock.currencyId = row.currencyId;

      product.costPrice = unitCost;
      product.stock = stocks.reduce(
        (sum, stock) => sum + Number(stock.quantity || 0),
        0
      );
    }
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

    setWarehouseId(warehouses[0]?.id);
    setRows([]);
    setProductSearch("");
    setShowProductList(false);

    setExchangeRateType("DAILY_MARKET");
    setCustomExchangeRate("132000");

    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);

    setSavedSnapshot("");
    setIsLocked(false);
  }

  function hasUnsavedData() {
    return rows.length > 0 || receiptNote.trim() !== "" || printNote.trim() !== "";
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

    const iqdCurrencyObj = currencies.find((c: any) => c.code === "IQD" || Number(c.id) === 2);
    const usdCurrencyObj = currencies.find((c: any) => c.code === "USD" || Number(c.id) === 1);

    const isAllIqd = rows.length > 0 && rows.every((r: any) => {
      const cid = Number(r.currencyId);
      return cid === 2 || (currencies.find((c: any) => Number(c.id) === cid)?.code === "IQD");
    });
    const isAllUsd = rows.length > 0 && rows.every((r: any) => {
      const cid = Number(r.currencyId);
      return cid === 1 || (currencies.find((c: any) => Number(c.id) === cid)?.code === "USD") || (!r.currencyId && currencies.find((c: any) => Number(c.id) === cid)?.code !== "IQD");
    });

    const iqdRate = ((iqdCurrencyObj?.exchangeRate || 152000) / 100) || 1520;

    let voucherHeaderCurrencyId = defaultCurrency.id;
    let finalTotalAmount = 0;

    if (isAllIqd) {
      voucherHeaderCurrencyId = iqdCurrencyObj?.id || 2;
      finalTotalAmount = rows.reduce((sum: number, r: any) => sum + (toNumber(r.quantity) * toNumber(r.unitCost)), 0);
    } else if (isAllUsd) {
      voucherHeaderCurrencyId = usdCurrencyObj?.id || 1;
      finalTotalAmount = rows.reduce((sum: number, r: any) => sum + (toNumber(r.quantity) * toNumber(r.unitCost)), 0);
    } else {
      voucherHeaderCurrencyId = usdCurrencyObj?.id || 1;
      finalTotalAmount = rows.reduce((sum: number, r: any) => {
        const qty = toNumber(r.quantity);
        const cost = toNumber(r.unitCost);
        const lineTot = qty * cost;
        const isIqdRow = Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD");
        return sum + (isIqdRow ? (lineTot / iqdRate) : lineTot);
      }, 0);
      finalTotalAmount = Math.round(finalTotalAmount * 100) / 100;
    }

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
          const d = new Date(`${dateStr}T${hours}:${minutes}:00`);
          if (!isNaN(d.getTime())) return d.toISOString();
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
      type: "warehouse_stock",
      referenceNo: String(receiptNumber),
      date: combineDateAndTime(receiptDate, createdTime),
      accountId: null,
      warehouseId: warehouseId || null,
      currencyId: voucherHeaderCurrencyId,
      exchangeRate: 1.0,
      exchangeRateType,
      customExchangeRate: toNumber(customExchangeRate) || 132000,
      totalAmount: finalTotalAmount,
      totalDiscount: 0,
      netAmount: finalTotalAmount,
      internalNote: receiptNote,
      printNote: printNote,
      employeeName: employeeNameFromLogin,
      lines: rows.map((row: any) => {
        const cost = toNumber(row.unitCost);
        const isIqdRow = Number(row.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(row.currencyId))?.code === "IQD");
        return {
          productId: row.productId,
          qty: toNumber(row.quantity),
          unitPrice: cost,
          lineTotal: toNumber(row.quantity) * cost,
          note: row.note || "",
          currencyId: isIqdRow ? (iqdCurrencyObj?.id || 2) : (row.currencyId || defaultCurrency.id),
          warehouseId,
        };
      }),
      paidAmounts: [],
      ledgerEntries: [],
    };

    const effectiveEditId = editId || (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('editId') || new URLSearchParams(window.location.search).get('edit')) : null);
    const isEditMode = Boolean(effectiveEditId && !isNaN(Number(effectiveEditId)) && Number(effectiveEditId) > 0);
    const savePromise = isEditMode
      ? updateVoucher(Number(effectiveEditId), payload)
      : addVoucher(payload);

    savePromise.then((res: any) => {
      if (res) {
        setSavedSnapshot(currentSnapshot);
        if (editId) {
          showToast("پسوڵەی جەردی کۆگا نوێکرایەوە ✅", "success");
        } else {
          setIsLocked(true);
          showToast("پسوڵەی جەردی کۆگا خەزن کرا ✅", "success");
        }
        fetchProducts();
      } else {
        showToast("هەڵە لە خەزنکردن! تکایە دووبارە هەوڵ بدەوە.", "error");
      }
    }).catch((err: any) => {
      console.error("Save error:", err);
      showToast("هەڵەی نەتۆرک! تکایە دووبارە هەوڵ بدەوە.", "error");
    });
  }

  function handlePrint(size: "A4" | "A5" = "A4") {
    if (!editId && !isLocked && !isSaved) {
      showToast("پێش پرێنتکردن دەبێت پسوڵەکە خەزن بکەیت.");
      return;
    }

    openPrintWindow("warehouse-stock-print-area");
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
          <Field label="کۆگا">
            <select
              value={warehouseId || ""}
              disabled={isLocked}
              onChange={(event) => {
                if (blockIfLocked()) return;
                setWarehouseId(Number(event.target.value));
                setRows([]);
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

              {(() => {
                const iqdRateCalc = ((currencies.find((c: any) => c.code === "IQD" || Number(c.id) === 2)?.exchangeRate || 152000) / 100) || 1520;
                const currencyKeys = Object.keys(totalCostByCurrency).filter(k => Math.abs(totalCostByCurrency[k] || 0) > 0.001);
                const isMultiCurrency = currencyKeys.length > 1;
                const convertedUsd = rows.reduce((sum: number, r: any) => {
                  const qty = toNumber(r.quantity);
                  const cost = toNumber(r.unitCost);
                  const lineTot = qty * cost;
                  const isIqdRow = Number(r.currencyId) === 2 || (currencies.find((c: any) => Number(c.id) === Number(r.currencyId))?.code === "IQD");
                  return sum + (isIqdRow ? (lineTot / iqdRateCalc) : lineTot);
                }, 0);

                const fixedRate100Val = Number(customExchangeRate || 132000) > 10000 ? Number(customExchangeRate || 132000) : Number(customExchangeRate || 132000) * 100;
                let subText = exchangeRateType === "FIXED" ? `📌 جێگیر: 100$ = ${fixedRate100Val.toLocaleString("en-US")} دینار` : undefined;
                if (isMultiCurrency) {
                  subText = `≈ $ ${Math.round(convertedUsd * 100) / 100} (دەبێت بە گەڵای ڕۆژ)` + (subText ? ` | ${subText}` : "");
                }

                return (
                  <StatBox
                    title="کۆی بەهای کۆگا"
                    value={formatCurrencyMap(totalCostByCurrency)}
                    color={exchangeRateType === "FIXED" ? "#7c3aed" : "#111827"}
                    subtitle={subText}
                  />
                );
              })()}
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

            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  borderRadius: 10,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontFamily: '"Segoe UI", Arial, sans-serif',
                  fontWeight: 800,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 2px 5px rgba(37, 99, 235, 0.25)"
                }}
                onClick={() => handlePrint("A4")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                A4
              </button>

              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  borderRadius: 10,
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontFamily: '"Segoe UI", Arial, sans-serif',
                  fontWeight: 800,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 2px 5px rgba(22, 163, 74, 0.25)"
                }}
                onClick={() => handlePrint("A5")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                A5
              </button>
            </div>

            <button style={outlineBlueBtn} onClick={() => setShowSettings(true)}>
              ڕێکخستن
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
          <div style={{
            ...headerCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>جەردی کۆگا</h2>}

            {/* Rate mode controls for USD items */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: exchangeRateType === "FIXED" ? "#f5f3ff" : "#f8fafc",
              border: exchangeRateType === "FIXED" ? "1px solid #ddd6fe" : "1px solid #e2e8f0",
              padding: "6px 14px",
              borderRadius: "10px",
              transition: "all 0.2s ease"
            }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: exchangeRateType === "FIXED" ? "#6b21a8" : "#475569" }}>
                💱 نرخی دۆلار:
              </span>

              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: isLocked ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                <input
                  type="radio"
                  name="stockExchangeRateType"
                  value="DAILY_MARKET"
                  disabled={isLocked}
                  checked={exchangeRateType === "DAILY_MARKET"}
                  onChange={() => {
                    if (blockIfLocked()) return;
                    setExchangeRateType("DAILY_MARKET");
                  }}
                />
                <span>دۆلاری ڕۆژ</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: isLocked ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, color: "#6b21a8" }}>
                <input
                  type="radio"
                  name="stockExchangeRateType"
                  value="FIXED"
                  disabled={isLocked}
                  checked={exchangeRateType === "FIXED"}
                  onChange={() => {
                    if (blockIfLocked()) return;
                    setExchangeRateType("FIXED");
                  }}
                />
                <span>نرخی دۆلار جێگیر</span>
              </label>

              {exchangeRateType === "FIXED" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#6b21a8" }}>100$ =</span>
                  <div style={{ width: "110px" }}>
                    <FormattedNumberInput
                      value={Number(customExchangeRate) || 0}
                      disabled={isLocked}
                      onChange={(val) => {
                        if (blockIfLocked()) return;
                        setCustomExchangeRate(String(val));
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "2px solid #8b5cf6",
                        background: "#ffffff",
                        fontWeight: "800",
                        fontSize: "13px",
                        color: "#6b21a8",
                        textAlign: "center"
                      }}
                      placeholder="١٣٢٠٠٠"
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b21a8" }}>د.ع</span>
                </div>
              )}
            </div>
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
                          {getAvailableQty(product)} / کۆستی ئێستا:{" "}
                          {formatCurrencyAmount(
                            getCurrentWarehouseCost(product),
                            defaultCurrency.id
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
                    <th style={th}>کۆست</th>
                    <th style={th}>دراو</th>
                    <th style={th}>کۆی بەهای کۆگا</th>
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
                        toNumber(row.quantity) * toNumber(row.unitCost);

                      return (
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
                            <FormattedNumberInput
                              value={row.quantity}
                              disabled={isLocked}
                              onChange={(val) =>
                                updateRow(row.id, {
                                  quantity: val,
                                })
                              }
                              placeholder="0"
                              style={{ ...smallInput, ...lockedFieldStyle }}
                            />
                          </td>


                          <td style={tdCenter}>
                            <FormattedNumberInput
                              value={row.unitCost}
                              disabled={isLocked}
                              onChange={(val) =>
                                updateRow(row.id, {
                                  unitCost: val,
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
                              onChange={(event) =>
                                updateRow(row.id, {
                                  currencyId: Number(event.target.value),
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
                            {(() => {
                              const isIQD = getCurrencyCode(row.currencyId) === "IQD" || Number(row.currencyId) === 2;
                              const isFixed = exchangeRateType === "FIXED" && !isIQD;
                              const rawVal = Number(rowTotal || 0);
                              const whole = isIQD ? Math.round(rawVal).toLocaleString("en-US") : Math.floor(Math.abs(rawVal)).toLocaleString("en-US");
                              const dec = isIQD ? "" : ((Math.abs(rawVal) % 1) > 0.001 ? (Math.abs(rawVal) % 1).toFixed(2).slice(1) : "");

                              const numDisplay = (
                                <span dir="ltr" style={{ display: "inline-flex", alignItems: "baseline", gap: "1px" }}>
                                  {rawVal < 0 && <span>-</span>}
                                  {!isIQD && <span style={{ fontSize: "0.82em", opacity: 0.85, fontWeight: 800 }}>$</span>}
                                  <span style={{ fontWeight: 900 }}>{whole}</span>
                                  {dec !== ".00" && <span style={{ fontSize: "0.72em", opacity: 0.75, fontWeight: 700 }}>{dec}</span>}
                                  {isIQD && <span style={{ fontSize: "0.82em", opacity: 0.85, fontWeight: 800, marginInlineStart: "2px" }}>دینار</span>}
                                </span>
                              );

                              if (isIQD) {
                                return (
                                  <span style={{
                                    display: "inline-flex", alignItems: "center",
                                    background: "#fff7ed", border: "1.5px solid #fb923c",
                                    borderRadius: "8px", padding: "2px 8px",
                                    color: "#9a3412", fontWeight: 900,
                                  }}>
                                    {numDisplay}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  title={isFixed ? `📌 جێگیر: 100$ = ${(Number(customExchangeRate || 132000) > 10000 ? Number(customExchangeRate || 132000) : Number(customExchangeRate || 132000) * 100).toLocaleString("en-US")} دینار` : undefined}
                                  style={{ fontWeight: 800, color: isFixed ? "#7c3aed" : "#111827", cursor: isFixed ? "help" : "default" }}
                                >
                                  {numDisplay}
                                </span>
                              );
                            })()}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <div id="warehouse-stock-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

                    {(printOptions.showReceiptInfo || printOptions.showWarehouseInfo) && (
            <div style={printInfoGrid}>
              {/* Right Column: Invoice Info Box */}
              {printOptions.showReceiptInfo ? (
                <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                  <PrintInfoLine label="جۆری پسوڵە" value="جەردی کۆگا" />
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
                {printOptions.showWarehouseInfo && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                    <PrintInfoLine
                  label="کۆگا"
                  value={selectedWarehouse?.name || "-"}
                />
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
                  <th style={printTh}>بڕ</th>
                  <th style={printTh}>کۆست</th>
                  <th style={printTh}>کۆی بەهای کۆگا</th>
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
                        toNumber(row.unitCost),
                        row.currencyId
                      )}
                    </td>

                    <td style={printTd}>
                      {formatCurrencyAmount(
                        toNumber(row.quantity) * toNumber(row.unitCost),
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
                label="کۆی بەهای کۆگا"
                value={formatCurrencyMap(totalCostByCurrency)}
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
              <div style={settingsSection}>
                <h3 style={settingsTitle}>کڵێشەی پسووڵە</h3>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedTemplateId(id);
                    localStorage.setItem("selected_invoice_template_id", String(id));
                    window.dispatchEvent(new Event("invoice-template-changed"));
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  {invoiceTemplates.length === 0 ? (
                    <option value="">کڵێشەی سەرەکی</option>
                  ) : (
                    invoiceTemplates.map((tmpl: any) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}{tmpl.isMain ? " (سەرەکی)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ ...settingsSection, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", marginBottom: 4 }}>ڕێکخستنی زانیاری پسووڵە</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#ffffff" }}>
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
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", marginBottom: 4 }}>ڕێکخستنی زانیاری کۆگا</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#ffffff" }}>
                    <SettingCheck
                    label="زانیاری کۆگا"
                    checked={printOptions.showWarehouseInfo}
                    onChange={() => togglePrintOption("showWarehouseInfo")}
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
  subtitle,
}: {
  title: string;
  value: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div style={statBox}>
      <div style={{ color: "#374151", fontWeight: 700 }}>{title}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, marginTop: 6 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ color: "#7c3aed", fontWeight: 800, fontSize: 12, marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function PrintInfoLine({ label, value }: { label: string; value: React.ReactNode }) {
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
  value: React.ReactNode;
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

  if (hideZero && typeof value === "string") {
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
@page { size: auto; margin: 0; }
@media print {

  body * { visibility: hidden !important; }

  #warehouse-stock-print-area,
  #warehouse-stock-print-area * {
    visibility: visible !important;
  }

  #warehouse-stock-print-area {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    padding: 2mm 6mm 6mm 6mm !important;
    margin: 0 !important;
    box-sizing: border-box !important;
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
  gap: 14,
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
  gap: 14,
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
  verticalAlign: "middle",
};

const tdWide: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  minWidth: 240,
  verticalAlign: "middle",
};

const smallInput: CSSProperties = {
  width: 105,
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

const printArea: CSSProperties = {
  display: "none",
};

const printPage: CSSProperties = {
  width: "100%",
  minHeight: "auto",
  background: "white",
  padding: 0,
  margin: 0,
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
  gap: 0,
  marginTop: 8,
};

const printSummaryBox: CSSProperties = {
  border: "1px solid #cbd5e1",
  padding: "4px 10px",
  minHeight: 40,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const printSummaryLine: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
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
  width: 860,
  maxWidth: "96vw",
  maxHeight: "92vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 16,
  padding: 16,
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
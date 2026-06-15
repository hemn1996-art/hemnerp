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
import { calculateLedgerEntries } from "../utils/ledgerHelper";
import { currencies as mockCurrencies } from "../data/mockData";

type ToastType = "error" | "success" | "info";
type PaidAmounts = Record<number, string>;

type ProductLike = {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  stock?: number;
  costPrice?: number;
  costCurrencyId?: number;
  salePrice?: number;
  saleCurrencyId?: number;
  packages?: { name: string; quantity: number }[];
};

type AccountLike = {
  id: number;
  name: string;
  phone?: string;
  city?: string;
  address?: string;
  balance?: number;
  balanceByCurrency?: Record<string, number>;
  showInSales?: boolean;
};

type ReturnRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  qty: string;
  returnPrice: string;
  discount: string;
  note: string;
  packageName: string;
  packageQuantity: number;
  warehouseName: string;
  currencyId: number;
  availableStock: number;
  costPrice: number;
  costCurrencyId: number;
};

type TableColumns = {
  product: boolean;
  code: boolean;
  qty: boolean;
  returnPrice: boolean;
  discount: boolean;
  total: boolean;
  action: boolean;
};

type PrintOptions = {
  showInvoiceInfo: boolean;
  showInvoiceNumber: boolean;
  showInvoiceDate: boolean;
  showCreatedTime: boolean;
  showCashbox: boolean;
  showCustomerInfo: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showBalance: boolean;
};

const fallbackWarehouses = [
  { id: 1, name: "کۆگای سەرەکی" },
  { id: 2, name: "کۆگای دووکان" },
];

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function SalesReturnPage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const accounts = useStore((s) => s.accounts) || [];
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const cashboxes = useStore((s) => s.cashboxes) || [];
  const products = useStore((s) => s.products) || [];
  const addVoucher = useStore((s) => s.addVoucher);
  const updateVoucher = useStore((s) => s.updateVoucher);
  const fetchProducts = useStore((s) => s.fetchProducts);
  const warehousesFromStore = (useStore((s) => (s as any).warehouses) || []) as any[];
  const fetchWarehouses = useStore((s: any) => s.fetchWarehouses);

  const warehouses = useMemo(() => {
    return warehousesFromStore.length > 0
      ? warehousesFromStore
      : fallbackWarehouses;
  }, [warehousesFromStore]);

  useEffect(() => {
    if (warehousesFromStore.length === 0) fetchWarehouses();
  }, []);

  const loggedInUser =
    (store as any).currentUser ||
    (store as any).user ||
    (store as any).authUser ||
    {};
  const employeeName = loggedInUser.fullName || loggedInUser.name || loggedInUser.username || "کۆساری مەلا فەرهاد";

  const defaultCurrency =
    currencies[0] ||
    ({
      id: 1,
      name: "دۆلار",
      code: "USD",
      symbol: "$",
    } as any);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const [invoiceNumber, setInvoiceNumber] = useState("");
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
      fetch(`/api/vouchers/${editId}`)
        .then((res) => res.json())
        .then((voucher) => {
          if (voucher) {
            setInvoiceNumber(voucher.referenceNo || String(voucher.id));
            setInvoiceDate(voucher.date.slice(0, 10));
            const d = new Date(voucher.date);
            setCreatedTime(
              d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            if (voucher.accountId) {
              setCustomerId(voucher.accountId);
              const acc = accounts.find((a: any) => a.id === voucher.accountId);
              if (acc) setCustomerSearch(acc.name);
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);

            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                qty: String(line.qty / (line.packageQuantity || 1)),
                returnPrice: String(line.unitPrice),
                discount: String(line.discountAmount || ""),
                note: line.note || "",
                packageName: line.packageName || "دانە",
                packageQuantity: line.packageQuantity || 1,
                warehouseName: (() => {
                  const tx = voucher.inventoryTransactions?.find((t: any) => t.productId === line.productId);
                  return tx?.warehouse?.name || "کۆگای سەرەکی";
                })(),
                currencyId: line.currencyId || voucher.currencyId || 1,
                availableStock: line.product?.stock || 0,
                costPrice: (() => {
                  const tx = voucher.inventoryTransactions?.find((t: any) => t.productId === line.productId);
                  return tx ? tx.unitCost : (line.product?.costPrice || 0);
                })(),
                costCurrencyId: line.product?.costCurrencyId || voucher.currencyId || 1,
              }));
              setRows(mappedRows);
            }

            const initialPaid: PaidAmounts = {};
            if (voucher.paidAmounts && Array.isArray(voucher.paidAmounts)) {
              voucher.paidAmounts.forEach((pa: any) => {
                initialPaid[pa.currencyId] = String(pa.amount);
              });
            }
            setPaidAmounts(initialPaid);

            setInternalNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowInvoiceNotes(true);

            if (voucher.exchangeRate) {
              setExchangeRate(String(voucher.exchangeRate * 100));
            }
            setOriginalVoucher(voucher);
            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
    }
  }, [editId, accounts]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [returnCurrencyId] = useState<number>(defaultCurrency.id);

  const [paidCurrencyId, setPaidCurrencyId] = useState<number>(
    defaultCurrency.id
  );
  const [paidAmounts, setPaidAmounts] = useState<PaidAmounts>({});
  const [exchangeRate, setExchangeRate] = useState("150000");

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);

  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [openedDetailRowId, setOpenedDetailRowId] = useState<number | null>(
    null
  );

  const [showInvoiceNotes, setShowInvoiceNotes] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [printNote, setPrintNote] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [showNewInvoiceConfirm, setShowNewInvoiceConfirm] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [originalVoucher, setOriginalVoucher] = useState<any>(null);
  const [excessModalConfig, setExcessModalConfig] = useState<{
    isOpen: boolean;
    excessAmount: number;
    targetCurrencyId: number;
    otherCurrencyId: number;
  } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const lockedFieldStyle: CSSProperties = isLocked ? { background: "#f3f4f6", cursor: "not-allowed" } : {};

  const [tableColumns, setTableColumns] = useState<TableColumns>({
    product: true,
    code: true,
    qty: true,
    returnPrice: true,
    discount: true,
    total: true,
    action: true,
  });

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    showInvoiceInfo: true,
    showInvoiceNumber: true,
    showInvoiceDate: true,
    showCreatedTime: true,
    showCashbox: true,
    showCustomerInfo: true,
    showCustomerName: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showBalance: true,
  });

  const salesAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      const show = account.accountType?.showsInSales ?? account.showInSales;
      if (typeof show === "boolean") {
        return show;
      }
      return true;
    });
  }, [accounts]);

  const customer = accounts.find((a: any) => a.id === customerId);
  const selectedCashbox = cashboxes.find((c: any) => c.id === cashboxId);

  function getAccountBalanceBeforeMap(account?: AccountLike) {
    const map: Record<string, number> = {};
    if (!account) return map;
    if (account.balanceByCurrency) {
      for (const [currencyIdText, amount] of Object.entries(account.balanceByCurrency)) {
        const n = Number(amount || 0);
        if (Math.abs(n) > 0.0001) {
          map[currencyIdText] = n;
        }
      }
    }
    if (Object.keys(map).length === 0 && typeof account.balance === "number") {
      const balanceCurrencyId = defaultCurrency.id || 1;
      map[String(balanceCurrencyId)] = Number(account.balance || 0);
    }
    return map;
  }

  function getSingleAccountBalanceCurrencyId(account?: AccountLike): number {
    if (!account?.balanceByCurrency) {
      return defaultCurrency.id || 1;
    }
    const activeCurrencies = Object.entries(account.balanceByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText]) => Number(currencyIdText));
    if (activeCurrencies.length === 1) return activeCurrencies[0];
    return defaultCurrency.id || 1;
  }

  function formatCurrencyAmount(value: number, currencyId: number) {
    const code = currencies.find((c: any) => c.id === currencyId)?.code || "";
    const symbol = currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
    if (code === "IQD") {
      return `${Number(value || 0).toLocaleString("en-US")} دینار`;
    }
    return `${Number(value || 0).toLocaleString("en-US")} ${symbol}`;
  }

  function formatCurrencyMapWithColors(map: Record<string, number>) {
    const activeEntries = Object.entries(map).filter(([_, val]) => Math.abs(val) > 0.01);
    if (activeEntries.length === 0) {
      return <span style={{ color: "#9ca3af", fontWeight: 900 }}>0</span>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        {activeEntries.map(([curIdText, val]) => {
          const isNegative = val < -0.01;
          const color = isNegative ? "#dc2626" : "#16a34a";
          const symbol = currencies.find((c: any) => c.id === Number(curIdText))?.symbol || "$";
          const formatted = Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
          return (
            <span key={curIdText} style={{ color, fontWeight: 900, fontSize: 14 }} dir="ltr">
              {isNegative ? "-" : ""}{symbol}{formatted}
            </span>
          );
        })}
      </div>
    );
  }

  function formatCurrencyMap(map: Record<string, number>) {
    const parts = Object.entries(map)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText, amount]) =>
        formatCurrencyAmount(amount, Number(currencyIdText))
      );
    return parts.length ? parts.join(" + ") : "0";
  }

  const accountBalanceBeforeByCurrency = useMemo(() => {
    const currentBalMap = getAccountBalanceBeforeMap(customer);
    if (!editId) {
      return currentBalMap;
    }
    if (!originalVoucher || !customer) {
      return currentBalMap;
    }
    if (Number(customerId) !== originalVoucher.accountId) {
      return currentBalMap;
    }
    if (originalVoucher.historicalBalanceBefore) {
      return originalVoucher.historicalBalanceBefore;
    }
    const computedBefore = { ...currentBalMap };
    if (originalVoucher.ledgerEntries) {
      originalVoucher.ledgerEntries.forEach((le: any) => {
        if (le.accountId === Number(customerId)) {
          const curIdText = String(le.currencyId);
          const change = le.debit - le.credit;
          computedBefore[curIdText] = (computedBefore[curIdText] || 0) - change;
        }
      });
    }
    return computedBefore;
  }, [customer, editId, originalVoucher, customerId]);

  const activeBalances = useMemo(() => {
    return Object.entries(accountBalanceBeforeByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount)) > 0.01);
  }, [accountBalanceBeforeByCurrency]);

  const [targetCurrencyId, setTargetCurrencyId] = useState<number | undefined>();

  useEffect(() => {
    if (customer) {
      if (activeBalances.length > 1) {
        const hasPaidCur = activeBalances.some(([id]) => Number(id) === paidCurrencyId);
        setTargetCurrencyId(hasPaidCur ? paidCurrencyId : Number(activeBalances[0][0]));
      } else {
        setTargetCurrencyId(undefined);
      }
    } else {
      setTargetCurrencyId(undefined);
    }
  }, [customerId, paidCurrencyId, activeBalances, customer]);

  const totalReturnInBase = rows.reduce((sum, row) => sum + getRowTotal(row), 0);

  const accountBalanceAfterByCurrency = useMemo(() => {
    if (!customer) return {};
    const before = accountBalanceBeforeByCurrency;
    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(customer);
    const rate = toNumber(exchangeRate) / 100;

    const result = calculateLedgerEntries({
      type: "sales_return",
      netAmount: totalReturnInBase,
      currencyId: returnCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === returnCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    return result.balanceAfterByCurrency;
  }, [customer, paidAmounts, targetCurrencyId, exchangeRate, accountBalanceBeforeByCurrency, totalReturnInBase, returnCurrencyId]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();

    const searched = q
      ? salesAccounts.filter((account: any) => {
          return (
            String(account.name || "").toLowerCase().includes(q) ||
            String(account.phone || "").toLowerCase().includes(q) ||
            String(account.city || "").toLowerCase().includes(q)
          );
        })
      : salesAccounts;

    const seen = new Set();
    const unique = [];
    for (const acc of searched) {
      const normName = String(acc.name || "").trim().toLowerCase();
      const normPhone = String(acc.phone || "").replace(/[^0-9]/g, "");
      const key = `${normName}_${normPhone}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(acc);
      }
    }
    return unique;
  }, [customerSearch, salesAccounts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    if (!q) return products;

    return products.filter((product: any) => {
      return (
        String(product.name || "").toLowerCase().includes(q) ||
        String(product.code || "").toLowerCase().includes(q) ||
        String(product.barcode || "").toLowerCase().includes(q) ||
        String(product.category || "").toLowerCase().includes(q) ||
        String(product.brand || "").toLowerCase().includes(q)
      );
    });
  }, [productSearch, products]);

  const paidCurrencies = getPaidCurrencies();

  const hasMixedPaidCurrency =
    new Set(paidCurrencies.map((x: any) => x.currencyId)).size > 1;

  const usedCurrencyIds = getUsedCurrencyIds();
  const shouldShowExchangeRate = usedCurrencyIds.length > 1;
  const showRate = shouldShowExchangeRate || paidCurrencyId !== returnCurrencyId;

  const itemCount = rows.reduce((sum, row) => sum + toNumber(row.qty), 0);
  const totalUnits = rows.reduce((sum, row) => sum + getRowUnits(row), 0);

  const returnTotalsByCurrency = getReturnTotalsByCurrency();
  const paidBackByCurrency = getPaidAmountsByCurrency();
  const customerBalanceReductionByCurrency = getCustomerBalanceReductionByCurrency();




  const totalPaidBackInBase = getTotalPaidBackInReturnCurrency();

  const profitReductionByCurrency = getProfitReductionByCurrency();
  const profitReductionInBase = Object.entries(profitReductionByCurrency).reduce(
    (sum, [currencyIdText, amount]) =>
      sum + convertCurrency(amount, Number(currencyIdText), returnCurrencyId),
    0
  );

  const visibleColumnCount =
    1 + Object.values(tableColumns).filter(Boolean).length;

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      customerId,
      invoiceDate,
      createdTime,
      cashboxId,
      rows,
      paidAmounts,
      paidCurrencyId,
      exchangeRate,
      internalNote,
      printNote,
    });
  }, [
    customerId,
    invoiceDate,
    createdTime,
    cashboxId,
    rows,
    paidAmounts,
    paidCurrencyId,
    exchangeRate,
    internalNote,
    printNote,
  ]);

  

  useEffect(() => {
    if (editId && !isEditLoading && !savedSnapshot) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [editId, isEditLoading, currentSnapshot, savedSnapshot]);

  const isSaved = rows.length > 0 && savedSnapshot === currentSnapshot;

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

  // Currency helpers
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

    const rate = (toNumber(exchangeRate) / 100) || 1500;

    if (isIqd(fromId) && isUsd(toId)) return amount / rate;
    if (isUsd(fromId) && isIqd(toId)) return amount * rate;

    return amount;
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";
    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  

  function normalizeMoneyMapToSingleCurrency(
    map: Record<string, number>,
    targetCurrencyId?: number
  ) {
    if (!targetCurrencyId) return map;

    const result: Record<string, number> = {
      [String(targetCurrencyId)]: 0,
    };

    for (const [currencyIdText, amount] of Object.entries(map)) {
      const fromCurrencyId = Number(currencyIdText);

      result[String(targetCurrencyId)] += convertCurrency(
        Number(amount || 0),
        fromCurrencyId,
        targetCurrencyId
      );
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

  function getProductPackages(product?: ProductLike) {
    if (product?.packages && product.packages.length > 0) {
      return product.packages;
    }

    return [{ name: "دانە", quantity: 1 }];
  }

  function getRowUnits(row: ReturnRow) {
    return toNumber(row.qty) * row.packageQuantity;
  }

  function getRowRawTotalInOwnCurrency(row: ReturnRow) {
    return getRowUnits(row) * toNumber(row.returnPrice);
  }

  function getRowTotalInOwnCurrency(row: ReturnRow) {
    return Math.max(
      getRowRawTotalInOwnCurrency(row) - toNumber(row.discount),
      0
    );
  }

  function getRowTotal(row: ReturnRow) {
    return convertCurrency(
      getRowTotalInOwnCurrency(row),
      row.currencyId,
      returnCurrencyId
    );
  }

  function getRowCostInRowCurrency(row: ReturnRow) {
    return convertCurrency(row.costPrice, row.costCurrencyId, row.currencyId);
  }

  function getRowProfitReductionInRowCurrency(row: ReturnRow) {
    const cost = getRowCostInRowCurrency(row);
    const returnPrice = toNumber(row.returnPrice);
    return (returnPrice - cost) * getRowUnits(row);
  }

  function getReturnTotalsByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = getCurrencyKey(row.currencyId);
      map[key] = (map[key] || 0) + getRowTotalInOwnCurrency(row);
    }

    return map;
  }

  function getPaidAmountsByCurrency() {
    const map: Record<string, number> = {};

    for (const item of getPaidCurrencies()) {
      const key = getCurrencyKey(item.currencyId);
      map[key] = (map[key] || 0) + item.amount;
    }

    return map;
  }

  function getCustomerBalanceReductionByCurrency() {
    const balanceCurrencyId = getSingleAccountBalanceCurrencyId(customer);

    const totals = normalizeMoneyMapToSingleCurrency(
      getReturnTotalsByCurrency(),
      balanceCurrencyId
    );

    const paidBack = normalizeMoneyMapToSingleCurrency(
      getPaidAmountsByCurrency(),
      balanceCurrencyId
    );

    const result: Record<string, number> = {};

    const currencyIds = Array.from(
      new Set([...Object.keys(totals), ...Object.keys(paidBack)])
    ).map(Number);

    for (const currencyId of currencyIds) {
      const key = getCurrencyKey(currencyId);
      result[key] = Number(totals[key] || 0) - Number(paidBack[key] || 0);
    }

    return result;
  }

  function getProfitReductionByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = getCurrencyKey(row.currencyId);
      map[key] = (map[key] || 0) + getRowProfitReductionInRowCurrency(row);
    }

    return map;
  }

  function getPaidCurrencies() {
    return Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x: any) => x.amount > 0);
  }

  function getPaidBackSummaryText() {
    const list = getPaidCurrencies();

    if (list.length === 0) return "0";

    return list
      .map((item: any) => formatCurrencyAmount(item.amount, item.currencyId))
      .join(" + ");
  }

  function getTotalPaidBackInReturnCurrency() {
    return getPaidCurrencies().reduce((sum, item) => {
      return (
        sum + convertCurrency(item.amount, item.currencyId, returnCurrencyId)
      );
    }, 0);
  }

  function getUsedCurrencyIds() {
    const ids = new Set<number>();

    rows.forEach((row: any) => {
      ids.add(row.currencyId);
      ids.add(row.costCurrencyId);
    });

    getPaidCurrencies().forEach((paid) => ids.add(paid.currencyId));

    return Array.from(ids);
  }

  function chooseProduct(product: ProductLike) {
    if (blockIfLocked()) return;

    const packages = getProductPackages(product);
    const firstPackage = packages[0];

    const existing = rows.find((row: any) => row.productId === product.id);

    if (existing) {
      updateRow(existing.id, {
        qty: String(toNumber(existing.qty) + 1),
      });

      setProductSearch("");
      setShowProductList(false);
      return;
    }

    const rowCurrencyId = product.saleCurrencyId || returnCurrencyId;
    const costCurrencyId = product.costCurrencyId || rowCurrencyId;

    const newRow: ReturnRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      qty: "1",
      returnPrice: String(product.salePrice || 0),
      discount: "",
      note: "",
      packageName: firstPackage.name,
      packageQuantity: firstPackage.quantity || 1,
      warehouseName: warehouses[0]?.name || "کۆگای سەرەکی",
      currencyId: rowCurrencyId,
      availableStock: product.stock || 0,
      costPrice: Number(product.costPrice || 0),
      costCurrencyId,
    };

    setRows((prev) => [...prev, newRow]);
    setProductSearch("");
    setShowProductList(false);
    setOpenedDetailRowId(null);
  }

  function updateRow(rowId: number, patch: Partial<ReturnRow>) {
    if (blockIfLocked()) return;

    setRows((prev) =>
      prev.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  function removeRow(rowId: number) {
    if (blockIfLocked()) return;

    setRows((prev) => prev.filter((row: any) => row.id !== rowId));

    if (openedDetailRowId === rowId) {
      setOpenedDetailRowId(null);
    }
  }

  function changeRowPackage(row: ReturnRow, packageName: string) {
    if (blockIfLocked()) return;

    const product = products.find((p: any) => p.id === row.productId);
    const selectedPackage = getProductPackages(product).find(
      (pkg) => pkg.name === packageName
    );

    updateRow(row.id, {
      packageName,
      packageQuantity: selectedPackage?.quantity || 1,
    });
  }

  function updatePaidAmount(currencyId: number, value: string) {
    if (blockIfLocked()) return;

    setPaidAmounts((prev) => ({
      ...prev,
      [currencyId]: onlyDecimal(value),
    }));
  }

  function validateBeforeSave() {
    if (!customerId) {
      showToast("پسوڵەی گەڕانەوەی فرۆشتن نابێت بێ کریار خەزن بکرێت.");
      return false;
    }

    if (rows.length === 0) {
      showToast("تکایە لانیکەم یەک کەرەستە زیاد بکە.");
      return false;
    }

    for (const row of rows) {
      if (toNumber(row.qty) <= 0) {
        showToast(`عەددی "${row.productName}" دروست نییە.`);
        return false;
      }

      if (toNumber(row.returnPrice) <= 0) {
        showToast(`نرخی گەڕانەوەی "${row.productName}" دروست نییە.`);
        return false;
      }

      if (row.costPrice <= 0) {
        showToast(
          `کۆستی "${row.productName}" نەدۆزرایەوە. پێویستە کۆست هەبێت بۆ حسابی قازانج.`
        );
        return false;
      }
    }

    if (selectedCashbox) {
      for (const paid of getPaidCurrencies()) {
        let cashboxAmt = 0;
        if (Array.isArray(selectedCashbox.balances)) {
          const bal = selectedCashbox.balances.find((b: any) => b.currencyId === paid.currencyId);
          cashboxAmt = bal ? Number(bal.amount || 0) : 0;
        } else if (selectedCashbox.balanceByCurrency) {
          cashboxAmt = Number(selectedCashbox.balanceByCurrency[String(paid.currencyId)] || 0);
        }
        if (paid.amount > cashboxAmt) {
          const sym = getCurrencySymbol(paid.currencyId);
          showToast(`باڵانسی پێویست لە دراوی (${sym}) لە قاسەکەدا نییە.`);
          return false;
        }
      }
    }

    return true;
  }

  function applyStockIncrease() {
    for (const row of rows) {
      const product = products.find((p: any) => p.id === row.productId);
      if (!product) continue;

      product.stock = Number(product.stock || 0) + getRowUnits(row);
    }
  }

  function applyCashboxDecrease() {
    const cashbox = cashboxes.find((c: any) => c.id === cashboxId);
    if (!cashbox) return;

    if (!cashbox.balanceByCurrency) {
      cashbox.balanceByCurrency = {};
    }

    for (const paid of getPaidCurrencies()) {
      const key = getCurrencyKey(paid.currencyId);

      cashbox.balanceByCurrency[key] =
        Number(cashbox.balanceByCurrency[key] || 0) - paid.amount;
    }

    const paidInBase = getTotalPaidBackInReturnCurrency();

    if (typeof cashbox.balance === "number") {
      cashbox.balance = Number(cashbox.balance || 0) - paidInBase;
    }
  }

  function applyCustomerBalanceReduction() {
    if (!customerId) return;

    const account = accounts.find((a: any) => a.id === customerId);
    if (!account) return;

    if (!account.balanceByCurrency) {
      account.balanceByCurrency = {};
    }

    const balanceCurrencyId = getSingleAccountBalanceCurrencyId(account);

    const normalizedReduction = normalizeMoneyMapToSingleCurrency(
      customerBalanceReductionByCurrency,
      balanceCurrencyId
    );

    for (const [currencyIdText, amount] of Object.entries(normalizedReduction)) {
      const currencyId = Number(currencyIdText);
      const key = getCurrencyKey(currencyId);

      account.balanceByCurrency[key] =
        Number(account.balanceByCurrency[key] || 0) -
        Math.max(Number(amount || 0), 0);
    }

    const baseCurrencyForAccount = balanceCurrencyId || returnCurrencyId;

    const totalReductionInBase = Object.entries(normalizedReduction).reduce(
      (sum, [currencyIdText, amount]) => {
        return (
          sum +
          convertCurrency(
            Math.max(Number(amount || 0), 0),
            Number(currencyIdText),
            baseCurrencyForAccount
          )
        );
      },
      0
    );

    account.balance = Number(account.balance || 0) - totalReductionInBase;
  }

  function resetInvoice() {
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
    setExchangeRate("150000");
    setInternalNote("");
    setPrintNote("");
    setShowInvoiceNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
    setOriginalVoucher(null);
  }

  function hasUnsavedData() {
    const hasPaid = Object.values(paidAmounts).some((x: any) => x.trim() !== "");

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

  function handlePrint() {
    if (rows.length === 0) {
      showToast("هیچ کەرەستەیەک لە پسوڵەکەدا نییە.");
      return;
    }

    if (!isLocked && !isSaved) {
      showToast("پێش پرێنتکردن دەبێت پسوڵەکە خەزن بکەیت.");
      return;
    }

    window.print();
  }

  function togglePrintOption(key: keyof PrintOptions) {
    setPrintOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function toggleColumn(key: keyof TableColumns) {
    setTableColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function saveVoucher(action: "keep_credit" | "cross_deduct" | null) {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    setExcessModalConfig(null);

    const rate = (toNumber(exchangeRate) / 100) || 1500;
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
      .filter((x: any) => x.amount > 0);

    const result = calculateLedgerEntries({
      type: "sales_return",
      netAmount: totalReturnInBase,
      currencyId: returnCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === returnCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: extraHandling,
      balanceBeforeByCurrency: before
    });

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
      lines: rows.map((row: any) => {
        const warehouseId = warehouses.find((w: any) => w.name === row.warehouseName)?.id || warehouses[0]?.id || 1;
        return {
          productId: row.productId,
          qty: toNumber(row.qty) * row.packageQuantity,
          unitPrice: toNumber(row.returnPrice),
          discountPercent: 0,
          discountAmount: toNumber(row.discount),
          lineTotal: getRowTotal(row),
          note: row.note,
          warehouseId,
          unitCost: toNumber(row.costPrice || 0),
        };
      }),
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === returnCurrencyId) ? 1 : rate
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

    const rate = (toNumber(exchangeRate) / 100) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (customer ? getSingleAccountBalanceCurrencyId(customer) : 1);
    const before = accountBalanceBeforeByCurrency;

    const paidList = Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x: any) => x.amount > 0);

    const result = calculateLedgerEntries({
      type: "sales_return",
      netAmount: totalReturnInBase,
      currencyId: returnCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === returnCurrencyId) ? 1 : rate
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
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={pageGrid}>
        <aside style={leftPanel}>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={customerInputWrap}>
              <label style={labelStyle}>کریار</label>
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
                placeholder="کریار"
                style={{
                  ...input,
                  ...lockedFieldStyle,
                  paddingLeft: customerId ? 36 : 14,
                }}
              />

              {customerId && !isLocked && (
                <button
                  type="button"
                  style={customerClearBtn}
                  onClick={() => {
                    if (blockIfLocked()) return;
                    setCustomerId(undefined);
                    setCustomerSearch("");
                    setShowCustomerInfo(false);
                  }}
                >
                  ×
                </button>
              )}

              {showCustomerList && !isLocked && (
                <div style={dropdownLarge}>
                  {filteredCustomers.length === 0 ? (
                    <div style={emptyText}>هیچ هەژمارێک نەدۆزرایەوە</div>
                  ) : (
                    filteredCustomers.map((acc: any) => (
                      <button
                        key={acc.id}
                        style={dropdownItem}
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
                value={formatCurrencyMap(customerBalanceReductionByCurrency)}
                color="#dc2626"
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
                value={invoiceDate}
                disabled={isLocked}
                onChange={(val) => {
                  if (blockIfLocked()) return;
                  setInvoiceDate(val);
                }}
                style={{ ...input, ...lockedFieldStyle }}
              />
            </Field>

            
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {currencies.filter((c: any) => c.id === paidCurrencyId || (paidAmounts[c.id] && paidAmounts[c.id].trim() !== "" && parseFloat(paidAmounts[c.id]) !== 0)).map((currency: any) => {
                const isCurrent = currency.id === paidCurrencyId;
                return (
                  <Field key={currency.id} label={isCurrent ? "پارەی گەڕاوە بۆ کریار" : `${currency.name} (${currency.symbol})`}>
                    <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", width: "100%" }}>
                      <select
                        value={currency.id}
                        disabled={isLocked}
                        onChange={(e) => setPaidCurrencyId(Number(e.target.value))}
                        style={{ border: "none", borderLeft: "1px solid #d1d5db", background: "#f8fafc", padding: "0 12px", outline: "none", fontWeight: "bold", color: "#1e293b", cursor: isLocked ? "not-allowed" : "pointer", minWidth: "90px" }}
                      >
                        {currencies.map((curr: any) => (
                          <option key={curr.id} value={curr.id}>
                            {curr.name}
                          </option>
                        ))}
                      </select>

                      <FormattedNumberInput
                        value={paidAmounts[currency.id] || ""}
                        disabled={isLocked}
                        onChange={(val) => updatePaidAmount(currency.id, val)}
                        placeholder="0"
                        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 12px", background: isLocked ? "#f3f4f6" : "#fff", cursor: isLocked ? "not-allowed" : "text", textAlign: "right" }}
                      />

                      <span style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#475569", fontSize: "13px" }}>
                        {currency.symbol || getCurrencySymbol(currency.id)}
                      </span>
                    </div>
                  </Field>
                );
              })}
            </div>


            {paidCurrencies.length > 0 && (
              <div style={paidSummaryBox}>
                <strong>پارەی گەڕاوە:</strong>
                <span>{getPaidBackSummaryText()}</span>
              </div>
            )}

            {showRate && (
              <Field label="ڕەیتی 100 دۆلار بۆ پارەی گەڕاوە">
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
            )}

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
                  setShowInvoiceNotes((prev) => !prev);
                }}
              >
                {showInvoiceNotes ? "▲ شاردنەوەی تێبینی" : "▼ زیادکردنی تێبینی"}
              </button>

              {showInvoiceNotes && (
                <div style={notesInsidePayment}>
                  <Field label="تێبینی ناوخۆیی">
                    <textarea
                      value={internalNote}
                      disabled={isLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setInternalNote(e.target.value);
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
            <button style={outlineBlueBtn} onClick={handleNewInvoice}>
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

            <button style={outlineBlueBtn} onClick={handlePrint}>
              پرێنتکردن
            </button>

            <button style={outlineBlueBtn} onClick={() => setShowSettings(true)}>
              ڕێکخستن
            </button>
          </div>

          {!isSaved && rows.length > 0 && !isLocked && (
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
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>گەڕانەوەی فرۆشتن</h2>}
            
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
                placeholder="کەرەستە / ناو، کۆد، بارکۆد تایپ بکە..."
                style={{ ...input, ...lockedFieldStyle }}
              />

              {showProductList && !isLocked && (
                <div style={productDropdown}>
                  {filteredProducts.length === 0 ? (
                    <div style={emptyText}>هیچ کەرەستەیەک نەدۆزرایەوە</div>
                  ) : (
                    filteredProducts.map((product: any) => (
                      <button
                        key={product.id}
                        style={productDropdownItem}
                        onMouseDown={() => chooseProduct(product)}
                      >
                        <strong style={{ color: "#1d4ed8" }}>
                          {product.name}
                        </strong>
                        <span style={smallMuted}>
                          کۆد: {product.code || "-"} / دانەی بەردەست:{" "}
                          {product.stock || 0}
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
                    {tableColumns.product && <th style={th}>کەرەستە</th>}
                    {tableColumns.code && <th style={th}>کۆد</th>}
                    {tableColumns.qty && <th style={th}>عەدد</th>}
                    {tableColumns.returnPrice && (
                      <th style={th}>نرخی گەڕانەوە</th>
                    )}
                    {tableColumns.discount && <th style={th}>داشکاندن</th>}
                    {tableColumns.total && <th style={th}>گشتی</th>}
                    {tableColumns.action && <th style={th}>چالاکی</th>}
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount} style={emptyTableCell}>
                        هیچ کەرەستەیەک زیاد نەکراوە
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td style={tdCenter}>{index + 1}</td>

                        {tableColumns.product && (
                          <td style={tdWide}>
                            <div
                              onClick={() =>
                                setOpenedDetailRowId(
                                  openedDetailRowId === row.id ? null : row.id
                                )
                              }
                              style={productNameBlock}
                            >
                              <strong>{row.productName}</strong>
                              <div style={smallMuted}>
                                {row.packageName} / {row.warehouseName} /{" "}
                                {getCurrencySymbol(row.currencyId)}
                              </div>

                              {row.note && (
                                <div style={itemNote}>{row.note}</div>
                              )}
                            </div>

                            {openedDetailRowId === row.id && (
                              <div style={detailPanel}>
                                <div style={detailTitle}>{row.productName}</div>

                                <div style={detailGrid}>
                                  <Field label="پێچانەوە">
                                    <select
                                      value={row.packageName}
                                      disabled={isLocked}
                                      onChange={(e) =>
                                        changeRowPackage(row, e.target.value)
                                      }
                                      style={{
                                        ...compactInput,
                                        ...lockedFieldStyle,
                                      }}
                                    >
                                      {getProductPackages(
                                        products.find(
                                          (p: any) => p.id === row.productId
                                        )
                                      ).map((pkg) => (
                                        <option key={pkg.name} value={pkg.name}>
                                          {pkg.name}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>

                                  <Field label="کۆگا">
                                    <select
                                      value={row.warehouseName}
                                      disabled={isLocked}
                                      onChange={(e) =>
                                        updateRow(row.id, {
                                          warehouseName: e.target.value,
                                        })
                                      }
                                      style={{
                                        ...compactInput,
                                        ...lockedFieldStyle,
                                      }}
                                    >
                                      {warehouses.map((warehouse: any) => (
                                        <option
                                          key={warehouse.id}
                                          value={warehouse.name}
                                        >
                                          {warehouse.name}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>

                                  <Field label="دانەی بەردەست">
                                    <div style={compactReadonlyBox}>
                                      {row.availableStock} دانە
                                    </div>
                                  </Field>

                                  <Field label="دوای گەڕانەوە">
                                    <div style={compactReadonlyBox}>
                                      {row.availableStock + getRowUnits(row)} دانە
                                    </div>
                                  </Field>

                                  <Field label="دراوی گەڕانەوە">
                                    <select
                                      value={row.currencyId}
                                      disabled={isLocked}
                                      onChange={(e) =>
                                        updateRow(row.id, {
                                          currencyId: Number(e.target.value),
                                        })
                                      }
                                      style={{
                                        ...compactInput,
                                        ...lockedFieldStyle,
                                      }}
                                    >
                                      {currencies.map((currency: any) => (
                                        <option key={currency.id} value={currency.id}>
                                          {currency.name} ({currency.symbol})
                                        </option>
                                      ))}
                                    </select>
                                  </Field>
                                </div>

                                <div style={{ marginTop: 8 }}>
                                  <Field label="تێبینی">
                                    <textarea
                                      value={row.note}
                                      disabled={isLocked}
                                      onChange={(e) =>
                                        updateRow(row.id, {
                                          note: e.target.value,
                                        })
                                      }
                                      rows={2}
                                      style={{
                                        ...compactTextarea,
                                        ...lockedFieldStyle,
                                      }}
                                    />
                                  </Field>
                                </div>

                                <div style={detailFooter}>
                                  <button
                                    style={blueSaveBtn}
                                    onClick={() => setOpenedDetailRowId(null)}
                                  >
                                    تەواو
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        )}

                        {tableColumns.code && (
                          <td style={tdCenter}>{row.code || "-"}</td>
                        )}

                        {tableColumns.qty && (
                          <td style={tdCenter}>
                            <input
                              value={row.qty}
                              disabled={isLocked}
                              onChange={(e) =>
                                updateRow(row.id, {
                                  qty: onlyDecimal(e.target.value),
                                })
                              }
                              inputMode="decimal"
                              lang="en"
                              dir="ltr"
                              style={{ ...smallInput, ...lockedFieldStyle }}
                            />
                          </td>
                        )}

                        {tableColumns.returnPrice && (
                          <td style={tdCenter}>
                            <FormattedNumberInput
                              value={row.returnPrice}
                              disabled={isLocked}
                              onChange={(val) =>
                                updateRow(row.id, {
                                  returnPrice: val,
                                })
                              }
                              style={{ ...smallInput, ...lockedFieldStyle }}
                            />
                          </td>
                        )}

                        {tableColumns.discount && (
                          <td style={tdCenter}>
                            <FormattedNumberInput
                              value={row.discount}
                              disabled={isLocked}
                              onChange={(val) =>
                                updateRow(row.id, {
                                  discount: val,
                                })
                              }
                              style={{ ...smallInput, ...lockedFieldStyle }}
                            />
                          </td>
                        )}

                        {tableColumns.total && (
                          <td style={tdCenter}>
                            <strong>
                              {formatCurrencyAmount(
                                getRowTotalInOwnCurrency(row),
                                row.currencyId
                              )}
                            </strong>
                          </td>
                        )}

                        {tableColumns.action && (
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
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={summaryCard}>
            <SummaryItem label="کۆی کەرەستەکان" value={`${itemCount}`} />
            <SummaryItem
              label="گشتی"
              value={formatCurrencyMap(returnTotalsByCurrency)}
            />
            <SummaryItem
              label="پارەی گەڕاوە بۆ کریار"
              value={getPaidBackSummaryText()}
            />
            <SummaryItem
              label="ماوە"
              value={formatCurrencyMap(customerBalanceReductionByCurrency)}
              strong
            />
            <SummaryItem label="کۆی دانە" value={`${totalUnits}`} />
          </div>
        </main>
      </div>

      <div id="sales-return-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

          {(printOptions.showInvoiceInfo || printOptions.showCustomerInfo) && (
            <div style={printInfoGrid}>
              {printOptions.showInvoiceInfo && (
                <div style={printInfoBox}>
                  <PrintInfoLine
                    label="جۆری پسوڵە"
                    value="گەڕانەوەی فرۆشتن"
                  />
                  {printOptions.showInvoiceNumber && (
                    <PrintInfoLine label="ژمارەی پسوڵە" value={invoiceNumber} />
                  )}
                  {printOptions.showInvoiceDate && (
                    <PrintInfoLine
                      label="بەروار"
                      value={formatDate(invoiceDate)}
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

              {printOptions.showCustomerInfo && (
                <div style={printInfoBox}>
                  {printOptions.showCustomerName && (
                    <PrintInfoLine label="کریار" value={customer?.name || "-"} />
                  )}
                  {printOptions.showCustomerPhone && (
                    <PrintInfoLine label="ژمارە" value={customer?.phone || "-"} />
                  )}
                  {printOptions.showCustomerAddress && (
                    <PrintInfoLine
                      label="ناونیشان"
                      value={
                        [customer?.city, customer?.address]
                          .filter(Boolean)
                          .join(" - ") || "-"
                      }
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <table style={printTable}>
            <thead>
              <tr>
                <th style={printTh}>#</th>
                {tableColumns.product && <th style={printTh}>کەرەستە</th>}
                {tableColumns.code && <th style={printTh}>کۆد</th>}
                {tableColumns.qty && <th style={printTh}>عەدد</th>}
                {tableColumns.returnPrice && (
                  <th style={printTh}>نرخی گەڕانەوە</th>
                )}
                {tableColumns.discount &&
                  rows.some((row: any) => toNumber(row.discount) > 0) && (
                    <th style={printTh}>داشکاندن</th>
                  )}
                {tableColumns.total && <th style={printTh}>گشتی</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td style={printTd}>{index + 1}</td>

                  {tableColumns.product && (
                    <td style={printTdWide}>
                      <div>{row.productName}</div>
                      {row.note && <div style={printSmallNote}>{row.note}</div>}
                    </td>
                  )}

                  {tableColumns.code && (
                    <td style={printTd}>{row.code || "-"}</td>
                  )}

                  {tableColumns.qty && (
                    <td style={printTd}>
                      {row.qty} {row.packageName}
                    </td>
                  )}

                  {tableColumns.returnPrice && (
                    <td style={printTd}>
                      {formatCurrencyAmount(
                        toNumber(row.returnPrice),
                        row.currencyId
                      )}
                    </td>
                  )}

                  {tableColumns.discount &&
                    rows.some((r) => toNumber(r.discount) > 0) && (
                      <td style={printTd}>
                        {toNumber(row.discount) > 0
                          ? formatCurrencyAmount(
                              toNumber(row.discount),
                              row.currencyId
                            )
                          : ""}
                      </td>
                    )}

                  {tableColumns.total && (
                    <td style={printTd}>
                      {formatCurrencyAmount(
                        getRowTotalInOwnCurrency(row),
                        row.currencyId
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine label="کۆی کەرەستەکان" value={`${itemCount}`} />

              {printOptions.showBalance && (
                <>
                  <PrintSummaryLine
                    label="کۆی گشتی"
                    value={formatCurrencyMap(returnTotalsByCurrency)}
                    bold
                  />
                  <PrintSummaryLine
                    label="پارەی گەڕاوە"
                    value={getPaidBackSummaryText()}
                  />
                  <PrintSummaryLine
                    label="ماوە"
                    value={formatCurrencyMap(customerBalanceReductionByCurrency)}
                  />
                </>
              )}
            </div>

            <div style={printSummaryBox}>
              {shouldShowExchangeRate && (
                <PrintSummaryLine
                  label="ڕەیتی 100 دۆلار"
                  value={`${Number(exchangeRate || 0).toLocaleString(
                    "en-US"
                  )} دینار`}
                />
              )}

              
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

      {excessModalConfig?.isOpen && (
        <div style={modalOverlay}>
          <div style={{ ...confirmBox, width: 500 }}>
            <h2 style={{ marginTop: 0, color: "#dc2626", fontWeight: 900 }}>پارەی زیادە داغڵکراوە</h2>
            <p style={{ ...confirmText, color: "#374151", fontSize: 15, fontWeight: 700, lineHeight: 1.8 }}>
              بڕی پارەی دراو لە باڵانسی دراوی هەڵبژێردراو زیاترە بە بڕی:
              <br />
              <span style={{ color: "#2563eb", fontWeight: 900, fontSize: 18 }}>
                {formatCurrencyAmount(excessModalConfig.excessAmount, excessModalConfig.targetCurrencyId)}
              </span>
              <br />
              چۆن دەتەوێت مامەڵە لەگەڵ پارە زیادەکەدا بکەیت؟
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button
                style={{
                  ...primaryBtn,
                  background: "#2563eb",
                  color: "white",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius: 12,
                  border: 0,
                  cursor: "pointer"
                }}
                onClick={() => saveVoucher("keep_credit")}
              >
                وەک باڵانس (قەرزاربوون) لەم دراوەدا بمێنێتەوە
              </button>
              <button
                style={{
                  ...primaryBtn,
                  background: "#16a34a",
                  color: "white",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius: 12,
                  border: 0,
                  cursor: "pointer"
                }}
                onClick={() => saveVoucher("cross_deduct")}
              >
                لە قەرزی دراوەکەی تر دەرکرێت ({formatCurrencyAmount(convertCurrency(excessModalConfig.excessAmount, excessModalConfig.targetCurrencyId, excessModalConfig.otherCurrencyId), excessModalConfig.otherCurrencyId)})
              </button>
              <button
                style={{
                  ...outlineBlueBtn,
                  background: "white",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  padding: "10px",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 12,
                  cursor: "pointer"
                }}
                onClick={() => setExcessModalConfig(null)}
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewInvoiceConfirm && (
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
                onClick={() => setShowNewInvoiceConfirm(false)}
              >
                گەڕانەوە بۆ پسوڵە
              </button>

              <button
                style={dangerBtn}
                onClick={() => {
                  setShowNewInvoiceConfirm(false);
                  resetInvoice();
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
                    checked={printOptions.showInvoiceInfo}
                    onChange={() => togglePrintOption("showInvoiceInfo")}
                  />
                  <SettingCheck
                    label="ژمارەی پسوڵە"
                    checked={printOptions.showInvoiceNumber}
                    onChange={() => togglePrintOption("showInvoiceNumber")}
                  />
                  <SettingCheck
                    label="بەروار"
                    checked={printOptions.showInvoiceDate}
                    onChange={() => togglePrintOption("showInvoiceDate")}
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
                    label="زانیاری کریار دەرکەوێت"
                    checked={printOptions.showCustomerInfo}
                    onChange={() => togglePrintOption("showCustomerInfo")}
                  />
                  <SettingCheck
                    label="ناوی کریار"
                    checked={printOptions.showCustomerName}
                    onChange={() => togglePrintOption("showCustomerName")}
                  />
                  <SettingCheck
                    label="ژمارەی کریار"
                    checked={printOptions.showCustomerPhone}
                    onChange={() => togglePrintOption("showCustomerPhone")}
                  />
                  <SettingCheck
                    label="ناونیشانی کریار"
                    checked={printOptions.showCustomerAddress}
                    onChange={() => togglePrintOption("showCustomerAddress")}
                  />
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>کۆڵۆمەکان</h3>

                <div style={settingGrid2}>
                  <SettingCheck
                    label="کەرەستە"
                    checked={tableColumns.product}
                    onChange={() => toggleColumn("product")}
                  />
                  <SettingCheck
                    label="کۆد"
                    checked={tableColumns.code}
                    onChange={() => toggleColumn("code")}
                  />
                  <SettingCheck
                    label="عەدد"
                    checked={tableColumns.qty}
                    onChange={() => toggleColumn("qty")}
                  />
                  <SettingCheck
                    label="نرخی گەڕانەوە"
                    checked={tableColumns.returnPrice}
                    onChange={() => toggleColumn("returnPrice")}
                  />
                  <SettingCheck
                    label="داشکاندن"
                    checked={tableColumns.discount}
                    onChange={() => toggleColumn("discount")}
                  />
                  <SettingCheck
                    label="گشتی"
                    checked={tableColumns.total}
                    onChange={() => toggleColumn("total")}
                  />
                  <SettingCheck
                    label="چالاکی"
                    checked={tableColumns.action}
                    onChange={() => toggleColumn("action")}
                  />
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>چاپ</h3>

                <div style={settingGrid2}>
                  <SettingCheck
                    label="باڵانسی پسوڵە پیشان بدرێت"
                    checked={printOptions.showBalance}
                    onChange={() => togglePrintOption("showBalance")}
                  />
                </div>
              </div>

              {shouldShowExchangeRate && (
                <div style={settingsSection}>
                  <h3 style={settingsTitle}>نرخی گۆڕینەوە</h3>

                  <Field label="ڕەیتی 100 دۆلار بە دینار">
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

/* Components */

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

/* Styles */

const appFont = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

const printCss = `
@media print {
  @page {
    size: auto; margin: 8mm;
  }

  body * {
    visibility: hidden !important;
  }

  #sales-return-print-area,
  #sales-return-print-area * {
    visibility: visible !important;
  }

  #sales-return-print-area {
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

const page: CSSProperties = {
  direction: "rtl",
  fontFamily: appFont,
};

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

const compactInput: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 7,
  border: "1px solid #d1d5db",
  fontSize: 12,
  outline: "none",
  background: "white",
  boxSizing: "border-box",
  fontFamily: appFont,
};

const smallInput: CSSProperties = {
  width: 90,
  padding: "10px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
  outline: "none",
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

const compactTextarea: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 7,
  border: "1px solid #d1d5db",
  fontSize: 12,
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

const customerInputWrap: CSSProperties = {
  position: "relative",
  width: "100%",
};

const customerClearBtn: CSSProperties = {
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

const emptyText: CSSProperties = {
  padding: 14,
  textAlign: "center",
  color: "#64748b",
};

const emptyTableCell: CSSProperties = {
  padding: 26,
  textAlign: "center",
  color: "#64748b",
  borderBottom: "1px solid #eef2f7",
  fontWeight: 700,
};

const smallMuted: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const accountInfoToggleBox: CSSProperties = {
  marginBottom: 12,
};

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

const infoKey: CSSProperties = {
  fontWeight: 700,
  color: "#374151",
};

const infoVal: CSSProperties = {
  color: "#111827",
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

const paidSummaryBox: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#111827",
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
  minWidth: 280,
  verticalAlign: "top",
  position: "relative",
};

const productNameBlock: CSSProperties = {
  cursor: "pointer",
  color: "#2563eb",
};

const itemNote: CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 3,
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

const detailPanel: CSSProperties = {
  marginTop: 8,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  maxWidth: 360,
  boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
};

const detailTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  marginBottom: 8,
  color: "#1d4ed8",
  textAlign: "center",
};

const detailGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 6,
};

const compactReadonlyBox: CSSProperties = {
  padding: "6px 8px",
  borderRadius: 7,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  fontWeight: 700,
  fontSize: 12,
  minHeight: 30,
};

const detailFooter: CSSProperties = {
  marginTop: 10,
  display: "flex",
  justifyContent: "flex-start",
};

const blueSaveBtn: CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: 0,
  borderRadius: 8,
  padding: "8px 18px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
  width: "100%",
};

const summaryCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
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
  letterSpacing: "0.2px",
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
  minWidth: 150,
};

const printSmallNote: CSSProperties = {
  color: "#6b7280",
  fontSize: 9,
  marginTop: 3,
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
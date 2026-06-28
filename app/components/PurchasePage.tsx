"use client";
import FormattedNumberInput from "./FormattedNumberInput";
import PrintHeader, { PrintWatermark } from "./PrintHeader";
import DateInput from "./DateInput";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  Fragment,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store, useStore } from "../store/store";
import { calculateLedgerEntries } from "../utils/ledgerHelper";
import { accountTypes, currencies as mockCurrencies } from "../data/mockData";

type Props = {
  headerSelector?: ReactNode;
  invoiceType?: string;
  editId?: string;
};

type ToastType = "error" | "success" | "info";
type ExpenseAllocationMode = "quantity" | "value" | "manual";

type PaidAmounts = Record<number, string>;

type PurchaseRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  qty: string;
  purchasePrice: string;
  discount: string;
  note: string;
  packageName: string;
  packageQuantity: number;
  warehouseName: string;
  currencyId: number;
  oldStock: number;
  manualExpensePerUnit: string;
};

type ExpenseRow = {
  id: number;
  amount: string;
  currencyId: number;
  accountId?: number;
  note: string;
  addAsDebt: boolean;
};

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
  purchasePrice?: number;
  purchaseCurrencyId?: number;
  salePrice?: number;
  packages?: { name: string; quantity: number }[];
};

type AccountLike = {
  id: number;
  name: string;
  accountTypeId?: number;
  phone?: string;
  city?: string;
  address?: string;
  balance?: number;
  balanceByCurrency?: Record<string, number>;
  showInPurchase?: boolean;
  showInSales?: boolean;
};

type TableColumns = {
  product: boolean;
  code: boolean;
  qty: boolean;
  purchasePrice: boolean;
  expense: boolean;
  cost: boolean;
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
  showSupplierInfo: boolean;
  showSupplierName: boolean;
  showSupplierPhone: boolean;
  showSupplierAddress: boolean;
  showEmployeeInfo: boolean;
  showEmployeeName: boolean;
  showEmployeePhone: boolean;
  showNotes: boolean;
  showBalance: boolean;
  showPaymentStatus: boolean;
};



export default function PurchasePage({headerSelector,  invoiceType = "کڕین", editId }: Props) {
  const router = useRouter();
  const accounts = useStore((s) => s.accounts) || [];
  const cashboxes = useStore((s) => s.cashboxes) || [];
  const products = useStore((s) => s.products) || [];
  const invoices = useStore((s) => s.invoices) || [];
  const fetchInvoices = useStore((s) => s.fetchInvoices);
  const addVoucher = useStore((s) => s.addVoucher);
  const updateVoucher = useStore((s) => s.updateVoucher);
  const fetchProducts = useStore((s) => s.fetchProducts);
  const fetchAccounts = useStore((s) => s.fetchAccounts);
  const fetchCashboxes = useStore((s) => s.fetchCashboxes);
  const warehousesFromStore = useStore((s) => s.warehouses) || [];
  const fetchWarehouses = useStore((s: any) => s.fetchWarehouses);
  const accountTypesStore = useStore((s) => s.accountTypes) || [];
  const fetchAccountTypes = useStore((s) => s.fetchAccountTypes);
  const storeCurrencies = useStore((s) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currentUser = useStore((s) => s.currentUser);

  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;

  const warehouses = useMemo(() => {
    return warehousesFromStore.length > 0
      ? warehousesFromStore
      : [
          { id: 1, name: "کۆگای سەرەکی" },
          { id: 2, name: "کۆگای دووکان" },
        ];
  }, [warehousesFromStore]);

  const loggedInUser =
    (store as any).currentUser ||
    (store as any).user ||
    (store as any).authUser ||
    {};

  // Determine default currency safely; fallback to first currency if available
  const defaultCurrency = useMemo(() => {
    // Prefer the first active currency; if none, fallback to the first in the list
    const active = currencies.find((c: any) => c.isActive);
    if (active) return active;
    if (currencies.length > 0) return currencies[0];
    // No currencies loaded yet; return undefined
    return undefined as any;
  }, [currencies]);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  useEffect(() => {
    if (accounts.length === 0) fetchAccounts();
    if (cashboxes.length === 0) fetchCashboxes();
    if (products.length === 0) fetchProducts();
    if (warehousesFromStore.length === 0) fetchWarehouses();
    if (accountTypesStore.length === 0) fetchAccountTypes();
    if (storeCurrencies.length === 0) fetchCurrencies();
    if (invoices.length === 0) fetchInvoices();
  }, []);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  useEffect(() => {
    if (!editId) {
      setInvoiceNumber("");
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
    if (currentUser) {
      setEmployeeName(currentUser.name || currentUser.username || "");
      setEmployeePhone(currentUser.phone || "");
    } else if (loggedInUser) {
      setEmployeeName(
        loggedInUser.name || loggedInUser.fullName || loggedInUser.username || ""
      );
      setEmployeePhone(
        loggedInUser.phone || loggedInUser.mobile || loggedInUser.phoneNumber || ""
      );
    }
  }, [currentUser, loggedInUser]);

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
              setSupplierId(voucher.accountId);
              const acc = accounts.find((a: any) => a.id === voucher.accountId);
              if (acc) setSupplierSearch(acc.name);
            }
            
            setCashboxId(voucher.cashboxId || undefined);
            
            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => {
                const invTx = voucher.inventoryTransactions?.find(
                  (tx: any) => tx.productId === line.productId
                );
                return {
                  id: line.id,
                  productId: line.productId,
                  productName: line.product?.name || "نەناسراو",
                  code: line.product?.code || "",
                  qty: String(line.qty / (line.packageQuantity || 1)),
                  purchasePrice: String(line.unitPrice),
                  discount: String(line.discountAmount || ""),
                  note: line.note || "",
                  packageName: line.packageName || "دانە",
                  packageQuantity: line.packageQuantity || 1,
                  warehouseName: invTx?.warehouse?.name || line.warehouseName || "کۆگای سەرەکی",
                  currencyId: line.currencyId || voucher.currencyId || 1,
                  oldStock: line.product?.stock || 0,
                  manualExpensePerUnit: "",
                };
              });
              setRows(mappedRows);
            }
            
            if (voucher.expenses && Array.isArray(voucher.expenses)) {
              const mappedExpenses = voucher.expenses.map((exp: any) => ({
                id: exp.id,
                amount: String(exp.amount),
                currencyId: exp.currencyId || voucher.currencyId || 1,
                accountId: exp.accountId || undefined,
                note: exp.note || "",
                addAsDebt: !!exp.accountId,
              }));
              setExpenses(mappedExpenses);
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
            if (voucher.internalNote || voucher.printNote) {
              setShowInvoiceNotes(true);
            }
            
            if (voucher.exchangeRate) {
              setExchangeRate(String(voucher.exchangeRate * 100));
            }
            if (voucher.employeeName) {
              setEmployeeName(voucher.employeeName);
            }
            if (voucher.employeePhone) {
              setEmployeePhone(voucher.employeePhone);
            }
            if (voucher.currencyId) {
              setPurchaseCurrencyId(voucher.currencyId);
              setPaidCurrencyId(voucher.currencyId);
              setExpenseTotalCurrencyId(voucher.currencyId);
            }
            setOriginalVoucher(voucher);
            setIsLocked(false);
          }
          setIsEditLoading(false);
        })
        .catch((err) => {
          console.error("Error loading edit voucher:", err);
          setIsEditLoading(false);
        });
    }
  }, [editId, accounts]);

  useEffect(() => {
    if (!editId && currencies && currencies.length > 0) {
      const iqd = currencies.find((c: any) => c.code === "IQD");
      if (iqd && iqd.rate) {
        setExchangeRate(String(iqd.rate * 100));
      }
    }
  }, [currencies, editId]);

  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [showSupplierList, setShowSupplierList] = useState(false);
  const [showSupplierInfo, setShowSupplierInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [purchaseCurrencyId, setPurchaseCurrencyId] = useState<number | null>(null);
  const [paidCurrencyId, setPaidCurrencyId] = useState<number | null>(null);
  const [expenseTotalCurrencyId, setExpenseTotalCurrencyId] = useState<number | null>(null);

  // Sync currency IDs when defaultCurrency becomes available
  useEffect(() => {
    if (defaultCurrency && defaultCurrency.id) {
      setPurchaseCurrencyId(defaultCurrency.id);
      setPaidCurrencyId(defaultCurrency.id);
      setExpenseTotalCurrencyId(defaultCurrency.id);
    }
  }, [defaultCurrency]);

  const [paidAmounts, setPaidAmounts] = useState<PaidAmounts>({});

  const [exchangeRate, setExchangeRate] = useState("150000");

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);

  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [openedDetailRowId, setOpenedDetailRowId] = useState<number | null>(
    null
  );
  const [detailSupplierId, setDetailSupplierId] = useState<number | undefined>();
  const [showPrevPrice, setShowPrevPrice] = useState(false);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expenseSearches, setExpenseSearches] = useState<Record<number, string>>({});
  const [showExpenseList, setShowExpenseList] = useState<Record<number, boolean>>({});
  const [expenseAllocationMode, setExpenseAllocationMode] =
    useState<ExpenseAllocationMode>("quantity");

  const [manualExpenseTotal, setManualExpenseTotal] = useState("");
  const [isExpenseTotalManual, setIsExpenseTotalManual] = useState(false);
  const [expenseGeneralNote, setExpenseGeneralNote] = useState("");

  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");

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

  const [tableColumns, setTableColumns] = useState<TableColumns>({
    product: true,
    code: true,
    qty: true,
    purchasePrice: true,
    expense: true,
    cost: true,
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
    showSupplierInfo: true,
    showSupplierName: true,
    showSupplierPhone: true,
    showSupplierAddress: true,
    showEmployeeInfo: true,
    showEmployeeName: true,
    showEmployeePhone: true,
    showNotes: true,
    showBalance: true,
    showPaymentStatus: true,
  });

  const purchaseAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      if (account.isShareholder === true) return false;
      const show = account.accountType?.showsInPurch ?? account.showInPurchase;
      if (typeof show === "boolean") {
        return show;
      }
      return true;
    });
  }, [accounts]);

  const supplier = accounts.find((a: any) => a.id === supplierId);

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
      return `دینار ${Number(value || 0).toLocaleString("en-US")}`;
    }
    return `${symbol} ${Number(value || 0).toLocaleString("en-US")}`;
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
          const curObj = currencies.find((c: any) => c.id === Number(curIdText));
          const code = curObj?.code || "";
          const symbol = curObj?.symbol || "$";
          const displaySymbol = code === "IQD" ? "دینار" : symbol;
          const formatted = Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
          return (
            <span key={curIdText} style={{ color, fontWeight: 900, fontSize: 14 }} dir="ltr">
              {isNegative ? "-" : ""}{displaySymbol} {formatted}
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

  function formatCurrencyAmountJSX(value: number, currencyId: number) {
    const code = currencies.find((c: any) => c.id === currencyId)?.code || "";
    const symbol = currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
    const isRounding = currencies.find((c: any) => c.id === currencyId)?.rounding || false;
    const isInteger = value % 1 === 0;
    const formatted = Math.abs(value).toLocaleString("en-US", { 
      minimumFractionDigits: isInteger ? 0 : 2, 
      maximumFractionDigits: isRounding ? 0 : 2 
    });

    const parts = formatted.split('.');
    const whole = parts[0];
    const decimal = parts[1];

    const displaySymbol = code === "IQD" ? "دینار" : symbol;
    const isNegative = value < 0;

    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: 2 }} dir="ltr">
        {isNegative && <span>-</span>}
        <span style={{ fontSize: "0.85em", opacity: 0.8 }}>{displaySymbol}</span>
        <span>
          <span>{whole}</span>
          {decimal !== undefined && (
            <span style={{ fontSize: "0.82em", opacity: 0.85 }}>.{decimal}</span>
          )}
        </span>
      </span>
    );
  }

  function formatCurrencyMapJSX(map: Record<string, number>) {
    const activeEntries = Object.entries(map).filter(([_, val]) => Math.abs(val) > 0.01);
    if (activeEntries.length === 0) {
      return <span style={{ color: "#9ca3af", fontWeight: 900 }}>0</span>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        {activeEntries.map(([curIdText, val]) => (
          <div key={curIdText} style={{ fontWeight: 900, fontSize: 14 }}>
            {formatCurrencyAmountJSX(val, Number(curIdText))}
          </div>
        ))}
      </div>
    );
  }

  const accountBalanceBeforeByCurrency = useMemo(() => {
    const currentBalMap = getAccountBalanceBeforeMap(supplier);
    if (!editId) {
      return currentBalMap;
    }
    if (!originalVoucher || !supplier) {
      return currentBalMap;
    }
    if (Number(supplierId) !== originalVoucher.accountId) {
      return currentBalMap;
    }
    if (originalVoucher.historicalBalanceBefore) {
      return originalVoucher.historicalBalanceBefore;
    }
    const computedBefore = { ...currentBalMap };
    if (originalVoucher.ledgerEntries) {
      originalVoucher.ledgerEntries.forEach((le: any) => {
        if (le.accountId === Number(supplierId)) {
          const curIdText = String(le.currencyId);
          const change = le.debit - le.credit;
          computedBefore[curIdText] = (computedBefore[curIdText] || 0) - change;
        }
      });
    }
    return computedBefore;
  }, [supplier, editId, originalVoucher, supplierId]);

  const screenAccountBalanceBeforeByCurrency = useMemo(() => {
    const currentBalMap = getAccountBalanceBeforeMap(supplier);
    if (!editId || !originalVoucher || !supplier) {
      return currentBalMap;
    }
    if (Number(supplierId) !== originalVoucher.accountId) {
      return currentBalMap;
    }
    const computedBefore = { ...currentBalMap };
    if (originalVoucher.ledgerEntries) {
      originalVoucher.ledgerEntries.forEach((le: any) => {
        if (le.accountId === Number(supplierId)) {
          const curIdText = String(le.currencyId);
          const change = le.debit - le.credit;
          computedBefore[curIdText] = (computedBefore[curIdText] || 0) - change;
        }
      });
    }
    return computedBefore;
  }, [supplier, editId, originalVoucher, supplierId]);

  const activeBalances = useMemo(() => {
    return Object.entries(accountBalanceBeforeByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount)) > 0.01);
  }, [accountBalanceBeforeByCurrency]);

  const [targetCurrencyId, setTargetCurrencyId] = useState<number | undefined>();

  useEffect(() => {
    if (supplier) {
      if (activeBalances.length > 1) {
        const hasPaidCur = activeBalances.some(([id]) => Number(id) === paidCurrencyId);
        setTargetCurrencyId(hasPaidCur ? (paidCurrencyId ?? undefined) : Number(activeBalances[0][0]));
      } else {
        setTargetCurrencyId(undefined);
      }
    }
  }, [supplierId, paidCurrencyId, activeBalances, supplier]);

  useEffect(() => {
    if (supplier) {
      const balanceMap = getAccountBalanceBeforeMap(supplier);
      const activeCurKeys = Object.keys(balanceMap).filter(key => Math.abs(balanceMap[key]) > 0.01);
      if (activeCurKeys.length === 1) {
        setPaidCurrencyId(Number(activeCurKeys[0]));
      }
    }
  }, [supplierId, supplier]);

  const itemsSubtotalInBase = rows.reduce((sum, row) => sum + getRowTotal(row), 0);

  const accountBalanceAfterByCurrency = useMemo(() => {
    if (!supplier) return {};
    const before = accountBalanceBeforeByCurrency;

    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(supplier);
    const rate = toNumber(exchangeRate) / 100;

    const result = calculateLedgerEntries({
      type: "purchase",
      netAmount: itemsSubtotalInBase,
      currencyId: purchaseCurrencyId || defaultCurrency?.id || 5,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === purchaseCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    return result.balanceAfterByCurrency;
  }, [supplier, paidAmounts, targetCurrencyId, exchangeRate, accountBalanceBeforeByCurrency, itemsSubtotalInBase, purchaseCurrencyId, editId, isLocked]);

  const screenAccountBalanceAfterByCurrency = useMemo(() => {
    if (!supplier) return {};
    const before = screenAccountBalanceBeforeByCurrency;

    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(supplier);
    const rate = toNumber(exchangeRate) / 100;

    const result = calculateLedgerEntries({
      type: "purchase",
      netAmount: itemsSubtotalInBase,
      currencyId: purchaseCurrencyId || defaultCurrency?.id || 5,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === purchaseCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    return result.balanceAfterByCurrency;
  }, [supplier, paidAmounts, targetCurrencyId, exchangeRate, screenAccountBalanceBeforeByCurrency, itemsSubtotalInBase, purchaseCurrencyId]);

  const selectedCashbox = cashboxes.find((c: any) => c.id === cashboxId);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();

    const searched = q
      ? purchaseAccounts.filter((account: any) => {
          return (
            String(account.name || "").toLowerCase().includes(q) ||
            String(account.phone || "").toLowerCase().includes(q) ||
            String(account.city || "").toLowerCase().includes(q)
          );
        })
      : purchaseAccounts;

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
  }, [supplierSearch, purchaseAccounts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = products.filter((product: any) => !product.isExpense && !product.isService);

    if (!q) return list;

    return list.filter((product: any) => {
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

  const hasMixedExpenseCurrency =
    new Set(
      expenses
        .filter((expense) => toNumber(expense.amount) > 0)
        .map((expense) => expense.currencyId)
    ).size > 1;

  const usedCurrencyIds = getUsedCurrencyIds();
  const shouldShowExchangeRate = usedCurrencyIds.length > 1;
  const showRate = shouldShowExchangeRate || paidCurrencyId !== purchaseCurrencyId;

  const itemCount = rows.reduce((sum, row) => sum + toNumber(row.qty), 0);
  const totalUnits = rows.reduce((sum, row) => sum + getRowUnits(row), 0);

  const itemsTotalsByCurrency = getItemsTotalsByCurrency();
  const supplierRemainingByCurrency = getSupplierRemainingByCurrency();


  const paidConvertedInBase = getTotalPaidInPurchaseCurrency();

  const supplierRemainingInBase = Object.entries(
    supplierRemainingByCurrency
  ).reduce((sum, [currencyIdText, amount]) => {
    return (
      sum +
      convertCurrency(
        Math.max(amount, 0),
        Number(currencyIdText),
        purchaseCurrencyId || defaultCurrency?.id || 5
      )
    );
  }, 0);

  const expensesTotalInBase = getExpensesTotalInCurrency(purchaseCurrencyId || defaultCurrency?.id || 5);

  const calculatedExpensesTotalInSelectedCurrency = getExpensesTotalInCurrency(
    expenseTotalCurrencyId || defaultCurrency?.id || 5
  );

  const displayedExpenseTotal = isExpenseTotalManual
    ? manualExpenseTotal
    : String(Math.round(calculatedExpensesTotalInSelectedCurrency || 0));

  const finalExpenseTotalInSelectedCurrency = isExpenseTotalManual
    ? toNumber(manualExpenseTotal)
    : calculatedExpensesTotalInSelectedCurrency;

  const costGrandTotalByCurrency = getWarehouseCostTotalByCurrency();

  const visibleColumnCount =
    1 + Object.values(tableColumns).filter(Boolean).length;

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      supplierId,
      invoiceDate,
      createdTime,
      cashboxId,
      rows,
      expenses,
      paidAmounts,
      paidCurrencyId,
      exchangeRate,
      internalNote,
      printNote,
      expenseAllocationMode,
      manualExpenseTotal,
      isExpenseTotalManual,
      expenseGeneralNote,
      employeeName,
      employeePhone,
    });
  }, [
    supplierId,
    invoiceDate,
    createdTime,
    cashboxId,
    rows,
    expenses,
    paidAmounts,
    paidCurrencyId,
    exchangeRate,
    internalNote,
    printNote,
    expenseAllocationMode,
    manualExpenseTotal,
    isExpenseTotalManual,
    expenseGeneralNote,
    employeeName,
    employeePhone,
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

  function getAutoPaymentStatusLabel() {
    const hasPaid = paidCurrencies.length > 0;

    const hasRemaining = Object.values(supplierRemainingByCurrency).some(
      (amount) => Number(amount) > 0.0001
    );

    if (!hasPaid) return "قەرزە";
    if (!hasRemaining) return "نەقدە / واصڵ";
    return "باقیاتی ماوە";
  }

  function getAccountTypeName(accountTypeId?: number) {
    const type = accountTypesStore.find((x: any) => Number(x.id) === Number(accountTypeId)) || accountTypes.find((x: any) => Number(x.id) === Number(accountTypeId));
    return type?.name || "-";
  }

  function getProductPackages(product?: ProductLike) {
    if (product?.packages && product.packages.length > 0) {
      return product.packages;
    }

    return [{ name: "دانە", quantity: 1 }];
  }

  function getRowUnits(row: PurchaseRow) {
    return toNumber(row.qty) * row.packageQuantity;
  }

  function getRowRawTotalInOwnCurrency(row: PurchaseRow) {
    return getRowUnits(row) * toNumber(row.purchasePrice);
  }

  function getRowTotalInOwnCurrency(row: PurchaseRow) {
    return Math.max(getRowRawTotalInOwnCurrency(row) - toNumber(row.discount), 0);
  }

  function getRowTotal(row: PurchaseRow) {
    return convertCurrency(
      getRowTotalInOwnCurrency(row),
      row.currencyId,
      purchaseCurrencyId || defaultCurrency?.id || 5
    );
  }

  function getItemsTotalsByCurrency() {
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

  function getSupplierRemainingByCurrency() {
    const totals = getItemsTotalsByCurrency();
    const paid = getPaidAmountsByCurrency();
    const result: Record<string, number> = {};

    const currencyIds = Array.from(
      new Set([...Object.keys(totals), ...Object.keys(paid)])
    ).map(Number);

    for (const currencyId of currencyIds) {
      const key = getCurrencyKey(currencyId);
      result[key] = (totals[key] || 0) - (paid[key] || 0);
    }

    const usd = currencies.find((c: any) => c.code === "USD")?.id;
    const iqd = currencies.find((c: any) => c.code === "IQD")?.id;

    if (usd && iqd) {
      const usdKey = getCurrencyKey(usd);
      const iqdKey = getCurrencyKey(iqd);

      const usdRemain = result[usdKey] || 0;
      const iqdRemain = result[iqdKey] || 0;

      if (usdRemain < 0 && iqdRemain > 0) {
        const extraUsdAsIqd = convertCurrency(Math.abs(usdRemain), usd, iqd);
        result[usdKey] = 0;
        result[iqdKey] = Math.max(iqdRemain - extraUsdAsIqd, 0);
      }

      if (iqdRemain < 0 && usdRemain > 0) {
        const extraIqdAsUsd = convertCurrency(Math.abs(iqdRemain), iqd, usd);
        result[iqdKey] = 0;
        result[usdKey] = Math.max(usdRemain - extraIqdAsUsd, 0);
      }
    }

    return result;
  }

  function getExpensesTotalInCurrency(targetCurrencyId: number) {
    return expenses.reduce((sum, expense) => {
      return (
        sum +
        convertCurrency(
          toNumber(expense.amount),
          expense.currencyId,
          targetCurrencyId
        )
      );
    }, 0);
  }

  function getAllocatedExpenseForRowInRowCurrency(row: PurchaseRow) {
    if (expenseAllocationMode === "manual") {
      return toNumber(row.manualExpensePerUnit) * getRowUnits(row);
    }

    const expensesTotalInRowCurrency = getExpensesTotalInCurrency(row.currencyId);

    if (expensesTotalInRowCurrency <= 0 || rows.length === 0) return 0;

    if (expenseAllocationMode === "quantity") {
      if (totalUnits <= 0) return 0;
      return expensesTotalInRowCurrency * (getRowUnits(row) / totalUnits);
    }

    if (expenseAllocationMode === "value") {
      const itemsSubtotalInRowCurrency = rows.reduce((sum, item) => {
        return (
          sum +
          convertCurrency(
            getRowTotalInOwnCurrency(item),
            item.currencyId,
            row.currencyId
          )
        );
      }, 0);

      if (itemsSubtotalInRowCurrency <= 0) return 0;

      return (
        expensesTotalInRowCurrency *
        (getRowTotalInOwnCurrency(row) / itemsSubtotalInRowCurrency)
      );
    }

    return 0;
  }

  function getAllocatedExpensePerUnitInRowCurrency(row: PurchaseRow) {
    const units = getRowUnits(row);
    if (units <= 0) return 0;

    return getAllocatedExpenseForRowInRowCurrency(row) / units;
  }

  function getFinalCostPerUnitInRowCurrency(row: PurchaseRow) {
    return (
      toNumber(row.purchasePrice) + getAllocatedExpensePerUnitInRowCurrency(row)
    );
  }

  function getWarehouseCostTotalByCurrency() {
    const map: Record<string, number> = {};

    for (const row of rows) {
      const key = getCurrencyKey(row.currencyId);
      const rowCost =
        getFinalCostPerUnitInRowCurrency(row) * getRowUnits(row);

      map[key] = (map[key] || 0) + rowCost;
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

  function getPaidSummaryText() {
    const list = getPaidCurrencies();

    if (list.length === 0) return "0";

    return list
      .map((item: any) => formatCurrencyAmount(item.amount, item.currencyId))
      .join(" + ");
  }

  function getTotalPaidInPurchaseCurrency() {
    return getPaidCurrencies().reduce((sum, item) => {
      return (
        sum + convertCurrency(item.amount, item.currencyId, purchaseCurrencyId || defaultCurrency?.id || 5)
      );
    }, 0);
  }

  function getUsedCurrencyIds() {
    const ids = new Set<number>();

    rows.forEach((row: any) => ids.add(row.currencyId));

    expenses.forEach((expense) => {
      if (toNumber(expense.amount) > 0) ids.add(expense.currencyId);
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

    const rowCurrencyId =
      product.purchaseCurrencyId || product.costCurrencyId || purchaseCurrencyId || defaultCurrency?.id || 5;

    const newRow: PurchaseRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      qty: "1",
      purchasePrice: "",
      discount: "",
      note: "",
      packageName: firstPackage.name,
      packageQuantity: firstPackage.quantity || 1,
      warehouseName: warehouses[0]?.name || "کۆگای سەرەکی",
      currencyId: rowCurrencyId,
      oldStock: product.stock || 0,
      manualExpensePerUnit: "",
    };

    setRows((prev) => [...prev, newRow]);
    setProductSearch("");
    setShowProductList(false);
    setOpenedDetailRowId(null);
  }

  function updateRow(rowId: number, patch: Partial<PurchaseRow>) {
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

  function changeRowPackage(row: PurchaseRow, packageName: string) {
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

  function getPreviousPurchasePrice(productId: number, supplierAccountId?: number) {
    if (!supplierAccountId) return undefined;

    const reversed = [...invoices].reverse();

    for (const invoice of reversed) {
      if (invoice.rawType !== "purchase" && invoice.type !== "کڕین") continue;
      if (invoice.accountId !== supplierAccountId) continue;

      const foundLine = invoice.lines?.find(
        (line: any) => line.productId === productId
      ) || invoice.items?.find(
        (item: any) => item.productId === productId
      );

      if (foundLine) {
        return {
          price: Number(foundLine.unitPrice || foundLine.price || 0),
          currencyId: foundLine.currencyId || invoice.currencyId || 5,
        };
      }
    }

    return undefined;
  }

  function addExpense() {
    if (blockIfLocked()) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 100000),
        amount: "",
        currencyId: purchaseCurrencyId || defaultCurrency?.id || 5,
        accountId: undefined,
        note: "",
        addAsDebt: false,
      },
    ]);
  }

  function updateExpense(expenseId: number, patch: Partial<ExpenseRow>) {
    if (blockIfLocked()) return;

    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === expenseId ? { ...expense, ...patch } : expense
      )
    );
  }

  function removeExpense(expenseId: number) {
    if (blockIfLocked()) return;

    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
  }

  function getExpensesByCurrency() {
    const map: Record<number, number> = {};

    for (const expense of expenses) {
      const amount = toNumber(expense.amount);
      if (amount <= 0) continue;

      map[expense.currencyId] = (map[expense.currencyId] || 0) + amount;
    }

    return Object.entries(map).map(([currencyId, amount]) => ({
      currencyId: Number(currencyId),
      amount,
    }));
  }

  function updatePaidAmount(currencyId: number, value: string) {
    if (blockIfLocked()) return;

    setPaidAmounts((prev) => ({
      ...prev,
      [currencyId]: onlyDecimal(value),
    }));
  }

  function validateBeforeSave() {
    if (!supplierId) {
      showToast("پسوڵەی کڕین نابێت بێ دابینکەر خەزن بکرێت.");
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

      if (toNumber(row.purchasePrice) <= 0) {
        showToast(`نرخی کڕینی "${row.productName}" دروست نییە.`);
        return false;
      }
    }

    if (expenseAllocationMode === "manual") {
      const manualTotal = rows.reduce((sum, row) => {
        return sum + toNumber(row.manualExpensePerUnit) * getRowUnits(row);
      }, 0);

      if (expensesTotalInBase > 0 && manualTotal <= 0) {
        showToast("جۆری دابەشکردن دەستییە؛ تکایە خەرجی هەر کاڵا بنووسە.");
        return false;
      }
    }

    for (const expense of expenses) {
      if (toNumber(expense.amount) <= 0) {
        showToast("بڕی یەکێک لە خەرجییەکان دروست نییە.");
        return false;
      }

      if (expense.addAsDebt && !expense.accountId) {
        showToast(
          "ئەگەر خەرجی وەک قەرز زیاد دەکەیت، دەبێت هەژمارێک هەڵبژێریت."
        );
        return false;
      }
    }

    const totalPaid = getTotalPaidInPurchaseCurrency();
    if (totalPaid > itemsSubtotalInBase + 0.01) {
      showToast("بڕی پارەی دراو نابێت زیاتر بێت لە بڕی پسووڵە.");
      return false;
    }

    return true;
  }

  function applyStockIncreaseAndCosts() {
    for (const row of rows) {
      const product = products.find((p: any) => p.id === row.productId);
      if (!product) continue;

      const increaseQty = getRowUnits(row);
      const finalCostInRowCurrency = getFinalCostPerUnitInRowCurrency(row);

      product.stock = Number(product.stock || 0) + increaseQty;
      product.costPrice = finalCostInRowCurrency;
      product.costCurrencyId = row.currencyId;
      product.purchasePrice = toNumber(row.purchasePrice);
      product.purchaseCurrencyId = row.currencyId;
    }
  }

  function applyExpenseDebts() {
    for (const expense of expenses) {
      if (!expense.addAsDebt || !expense.accountId) continue;

      const account = accounts.find((a: any) => a.id === expense.accountId);
      if (!account) continue;

      if (!account.balanceByCurrency) {
        account.balanceByCurrency = {};
      }

      const key = getCurrencyKey(expense.currencyId);

      account.balanceByCurrency[key] =
        Number(account.balanceByCurrency[key] || 0) - toNumber(expense.amount);

      const expenseInBase = convertCurrency(
        toNumber(expense.amount),
        expense.currencyId,
        purchaseCurrencyId || defaultCurrency?.id || 5
      );

      account.balance = Number(account.balance || 0) - expenseInBase;
    }
  }

  function applySupplierDebtByCurrency() {
    if (!supplierId) return;

    const account = accounts.find((a: any) => a.id === supplierId);
    if (!account) return;

    if (!account.balanceByCurrency) {
      account.balanceByCurrency = {};
    }

    for (const [currencyIdText, amount] of Object.entries(
      supplierRemainingByCurrency
    )) {
      const currencyId = Number(currencyIdText);
      const key = getCurrencyKey(currencyId);

      account.balanceByCurrency[key] =
        Number(account.balanceByCurrency[key] || 0) + Math.max(amount, 0);
    }

    account.balance = Number(account.balance || 0) + supplierRemainingInBase;
  }

  function resetInvoice() {
    // Clear editId from URL so the component exits edit mode
    if (editId) {
      router.push("/invoices?type=purchase");
      return; // The route change will remount the component with editId=undefined
    }
    setInvoiceNumber("");
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setSupplierId(undefined);
    setSupplierSearch("");
    setShowSupplierInfo(false);
    setShowSupplierList(false);
    setRows([]);
    setOpenedDetailRowId(null);
    setExpenses([]);
    setPaidAmounts({});
    setPurchaseCurrencyId(defaultCurrency.id);
    setPaidCurrencyId(defaultCurrency.id);
    setExchangeRate("150000");
    setManualExpenseTotal("");
    setIsExpenseTotalManual(false);
    setExpenseGeneralNote("");
    setInternalNote("");
    setPrintNote("");
    setShowInvoiceNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
    setOriginalVoucher(null);
    setExpenseAllocationMode("quantity");
    setExpenseTotalCurrencyId(defaultCurrency.id);
  }

  function hasUnsavedData() {
    const hasPaid = Object.values(paidAmounts).some((x: any) => x.trim() !== "");

    return (
      supplierId !== undefined ||
      supplierSearch.trim() !== "" ||
      rows.length > 0 ||
      expenses.length > 0 ||
      hasPaid ||
      internalNote.trim() !== "" ||
      printNote.trim() !== "" ||
      expenseGeneralNote.trim() !== ""
    );
  }

  function handleNewInvoice() {
    if (hasUnsavedData() && !isSaved && !isLocked) {
      setShowNewInvoiceConfirm(true);
      return;
    }

    resetInvoice();
  }

  // Save voucher with proper currency handling
  function saveVoucher(action: "keep_credit" | "cross_deduct" | null) {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    setExcessModalConfig(null);

    const rate = (toNumber(exchangeRate) / 100) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (supplier ? getSingleAccountBalanceCurrencyId(supplier) : (defaultCurrency?.id || 5));
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
      type: "purchase",
      netAmount: itemsSubtotalInBase,
      currencyId: purchaseCurrencyId || defaultCurrency?.id || 5,
      exchangeRate: rate,
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === purchaseCurrencyId) ? 1 : rate
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
          cleanTime = `${String(hours).padStart(2, "0")}:${minutes}`;
        }
        const hhmmMatch = cleanTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
        if (hhmmMatch) {
          const hours = hhmmMatch[1].padStart(2, "0");
          const minutes = hhmmMatch[2];
          return new Date(`${dateStr}T${hours}:${minutes}:00Z`).toISOString();
        }
        const fallback = new Date(`${dateStr} ${cleanTime}`);
        if (!isNaN(fallback.getTime())) return fallback.toISOString();
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate.toISOString();
      } catch (e) {
        console.error("Error combining date and time:", e);
      }
      return new Date().toISOString();
    };

    const payload = {
      type: "purchase",
      referenceNo: String(invoiceNumber),
      date: combineDateAndTime(invoiceDate, createdTime),
      accountId: supplierId || null,
      cashboxId: cashboxId || null,
      currencyId: purchaseCurrencyId,
      exchangeRate: rate,
      totalAmount: itemsSubtotalInBase,
      totalDiscount: 0,
      netAmount: itemsSubtotalInBase,
      internalNote: internalNote,
      printNote: printNote,
      employeeName: employeeName || "کۆساری مەلا فەرهاد",
      lines: rows.map((row: any) => {
        const warehouse = warehouses.find((w: any) => w.name === row.warehouseName);
        return {
          productId: row.productId,
          qty: getRowUnits(row),
          unitPrice: toNumber(row.purchasePrice),
          discountPercent: 0,
          discountAmount: toNumber(row.discount),
          lineTotal: getRowTotal(row),
          note: row.note,
          warehouseId: warehouse?.id || warehouses[0]?.id || 1,
          unitCost: getFinalCostPerUnitInRowCurrency(row),
        };
      }),
      expenses: expenses.map((exp) => ({
        amount: toNumber(exp.amount),
        currencyId: exp.currencyId,
        accountId: exp.accountId || null,
        note: exp.note || "",
        addToAccountDebt: exp.addAsDebt
      })),
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: isUsd(p.currencyId) ? 1 : rate
      })),
      ledgerEntries: result.ledgerEntries,
      extraPaymentHandling: extraHandling
    };

    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise.then((res) => {
      if (res) {
        fetchProducts(); // refresh products stock
        setSavedSnapshot(currentSnapshot);
        if (editId) {
          showToast("پسوڵەکە بە سەرکەوتوویی نوێکرایەوە ✅", "success");
        } else {
          setIsLocked(true);
          showToast("پسوڵەی کڕین خەزن کرا ✅ کۆست و ستۆک نوێکرایەوە.", "success");
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

    // Ensure a valid purchaseCurrencyId is present
    if (!purchaseCurrencyId) {
      showToast("پسوڵەی کڕین ناتوانێت خەزن بکرێت: هەڵبژاردنی پارەی سەرهەڵبژێرە.");
      return;
    }

    const rate = (toNumber(exchangeRate) / 100) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (supplier ? getSingleAccountBalanceCurrencyId(supplier) : (defaultCurrency?.id || 5));
    const before = accountBalanceBeforeByCurrency;

    const paidList = Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x: any) => x.amount > 0);

    const result = calculateLedgerEntries({
      type: "purchase",
      netAmount: itemsSubtotalInBase,
      currencyId: purchaseCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: isUsd(p.currencyId) ? 1 : rate
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

    if (!editId && !isLocked && !isSaved) {
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
                  filteredSuppliers.map((account: any) => (
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

          {supplier && activeBalances.length > 1 && !isLocked && (
            <div style={{
              background: "rgba(243, 244, 246, 0.6)",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              width: "100%"
            }}>
              <div style={{ labelStyle, fontSize: 13, marginBottom: 8 } as any}>کەمکردنەوە/زیادکردن لە باڵانسی دراوی:</div>
              <div style={{ display: "flex", gap: 8 }}>
                {activeBalances.map(([currencyIdText]) => {
                  const curId = Number(currencyIdText);
                  const symbol = getCurrencySymbol(curId);
                  const code = getCurrencyCode(curId);
                  const isSelected = targetCurrencyId === curId;
                  
                  return (
                    <button
                      key={curId}
                      type="button"
                      onClick={() => setTargetCurrencyId(curId)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: isSelected ? "2px solid #2563eb" : "1px solid #d1d5db",
                        background: isSelected ? "#eff6ff" : "white",
                        color: isSelected ? "#1d4ed8" : "#374151",
                        fontWeight: isSelected ? 900 : 700,
                        cursor: "pointer",
                        fontSize: 13,
                        fontFamily: "inherit",
                        textAlign: "center"
                      }}
                    >
                      {symbol} ({code})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

              <InfoRow label="جۆری هەژمار">
                {getAccountTypeName(supplier.accountTypeId)}
              </InfoRow>

              <InfoRow label="ژمارەی تەلەفۆن">
                {supplier.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{supplier.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {supplier.address || "-"}
              </InfoRow>

              <InfoRow label="قەرزی پێشوو">
                {formatCurrencyMapWithColors(screenAccountBalanceBeforeByCurrency)}
              </InfoRow>

              <InfoRow label="کۆی گشتی ماوە">
                {formatCurrencyMapWithColors(screenAccountBalanceAfterByCurrency)}
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="گشتی"
                value={formatCurrencyMapJSX(itemsTotalsByCurrency)}
                color="#16a34a"
              />
              <StatBox
                title="کۆی ماوەی ئەم پسووڵە"
                value={formatCurrencyMapWithColors(supplierRemainingByCurrency)}
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
                  <Field key={currency.id} label={isCurrent ? "پارەی دراو" : `پارەی دراو (${currency.name})`}>
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
                        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 12px", background: isLocked ? "#f3f4f6" : "#fff", cursor: isLocked ? "not-allowed" : "text", textAlign: "left" }}
                      />

                      <span style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#475569", fontSize: "13px" }}>
                        {currency.name}
                      </span>
                    </div>
                  </Field>
                );
              })}
            </div>


            {paidCurrencies.length > 0 && (
              <div style={paidSummaryBox}>
                <strong>پارەی دراو:</strong>
                <span>{getPaidSummaryText()}</span>
              </div>
            )}

            {showRate && (
              <Field label="ڕەیتی 100 دۆلار بۆ پارەدان">
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
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>پسوڵەی کڕین</h2>}
            
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
                          کۆد: {product.code || "-"} / ستۆکی ئێستا:{" "}
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
                    {tableColumns.purchasePrice && (
                      <th style={th}>نرخی کڕین</th>
                    )}
                    {tableColumns.expense && <th style={th}>خەرجی</th>}
                    {tableColumns.cost && <th style={th}>کۆست</th>}
                    {tableColumns.discount && <th style={th}>داشکاندن</th>}
                    {tableColumns.total && <th style={th}>کۆی بەهای کاڵا</th>}
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
                    rows.map((row, index) => {
                      const isDetailOpen = openedDetailRowId === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr>
                            <td style={tdCenter}>{index + 1}</td>

                            {tableColumns.product && (
                              <td style={tdWide}>
                                <div
                                  onClick={() => {
                                    if (isLocked) return;
                                    const isOpening = openedDetailRowId !== row.id;
                                    setOpenedDetailRowId(isOpening ? row.id : null);
                                    if (isOpening) {
                                      setDetailSupplierId(supplierId);
                                      setShowPrevPrice(false);
                                    }
                                  }}
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

                            {tableColumns.purchasePrice && (
                              <td style={tdCenter}>
                                <FormattedNumberInput
                                  value={row.purchasePrice}
                                  disabled={isLocked}
                                  onChange={(val) =>
                                    updateRow(row.id, {
                                      purchasePrice: val,
                                    })
                                  }
                                  style={{ ...smallInput, ...lockedFieldStyle }}
                                />
                              </td>
                            )}

                            {tableColumns.expense && (
                              <td style={tdCenter}>
                                {expenseAllocationMode === "manual" ? (
                                  <FormattedNumberInput
                                    value={row.manualExpensePerUnit}
                                    disabled={isLocked}
                                    onChange={(val) =>
                                      updateRow(row.id, {
                                        manualExpensePerUnit: val,
                                      })
                                    }
                                    style={{ ...smallInput, ...lockedFieldStyle }}
                                  />
                                ) : (
                                  <strong>
                                    {formatCurrencyAmountJSX(
                                      getAllocatedExpensePerUnitInRowCurrency(row),
                                      row.currencyId
                                    )}
                                  </strong>
                                )}
                              </td>
                            )}

                            {tableColumns.cost && (
                              <td style={tdCenter}>
                                <strong>
                                  {formatCurrencyAmountJSX(
                                    getFinalCostPerUnitInRowCurrency(row),
                                    row.currencyId
                                  )}
                                </strong>
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
                                  {formatCurrencyAmountJSX(
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
                          {isDetailOpen && (
                            <tr key={`${row.id}-details`}>
                              <td colSpan={visibleColumnCount} style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f7" }}>
                                <div style={{ ...detailPanel, marginTop: 0 }}>
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
                                          <option
                                            key={pkg.name}
                                            value={pkg.name}
                                          >
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
                                        {row.oldStock} دانە
                                      </div>
                                    </Field>

                                    <Field label="دوای کڕین">
                                      <div style={compactReadonlyBox}>
                                        {row.oldStock + getRowUnits(row)} دانە
                                      </div>
                                    </Field>

                                    <Field label="دراوی کەرەستە">
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
                                          <option
                                            key={currency.id}
                                            value={currency.id}
                                          >
                                            {currency.name} ({currency.symbol})
                                          </option>
                                        ))}
                                      </select>
                                    </Field>



                                    {(() => {
                                      const prevPurchase = supplierId
                                        ? getPreviousPurchasePrice(row.productId, supplierId)
                                        : null;

                                      return (
                                        <Field label="نرخی پێشوو">
                                          {prevPurchase ? (
                                            showPrevPrice ? (
                                              <div style={compactReadonlyBox}>
                                                {formatCurrencyAmount(
                                                  prevPurchase.price,
                                                  prevPurchase.currencyId
                                                )}
                                              </div>
                                            ) : (
                                              <button
                                                style={{
                                                  borderRadius: 8,
                                                  border: 0,
                                                  background: "#2563eb",
                                                  color: "white",
                                                  padding: "6px 12px",
                                                  fontWeight: 800,
                                                  cursor: "pointer",
                                                  fontFamily: appFont,
                                                  width: "100%",
                                                  fontSize: 12,
                                                  minHeight: 30,
                                                }}
                                                onClick={() => {
                                                  setShowPrevPrice(true);
                                                }}
                                              >
                                                پیشاندان
                                              </button>
                                            )
                                          ) : (
                                            <div style={compactReadonlyBox}>
                                              نییە
                                            </div>
                                          )}
                                        </Field>
                                      );
                                    })()}
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
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={sectionCard}>
            <div style={sectionHeader}>
              <h3 style={{ margin: 0 }}>خەرجی پسوڵە</h3>

              <button
                style={smallBlueBtn}
                disabled={isLocked}
                onClick={addExpense}
              >
                + زیادکردن
              </button>
            </div>

            <div style={allocationBox}>
              <Field label="جۆری دابەشکردنی خەرجی بەسەر کاڵاکان">
                <select
                  value={expenseAllocationMode}
                  disabled={isLocked}
                  onChange={(e) =>
                    setExpenseAllocationMode(
                      e.target.value as ExpenseAllocationMode
                    )
                  }
                  style={{ ...input, ...lockedFieldStyle }}
                >
                  <option value="quantity">بەپێی عەدد</option>
                  <option value="value">بەپێی نرخی کڕین</option>
                  <option value="manual">دەستی</option>
                </select>
              </Field>

              {hasMixedExpenseCurrency && (
                <Field label="ڕەیتی 100 دۆلار بۆ خەرجی">
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
            </div>

            {expenses.length === 0 ? (
              <div style={emptyExpenseBox}>هێشتا هیچ خەرجییەک زیاد نەکراوە</div>
            ) : (
              <div style={expenseStack}>
                {expenses.map((expense) => (
                  <div key={expense.id} style={expenseCard}>
                    <div style={expenseGrid}>
                      <Field label="بڕ" style={{ flex: "0 0 140px", minWidth: "120px" }}>
                        <FormattedNumberInput
                          value={expense.amount}
                          disabled={isLocked}
                          onChange={(val) =>
                            updateExpense(expense.id, {
                              amount: val,
                            })
                          }
                          style={{ ...input, ...lockedFieldStyle }}
                        />
                      </Field>

                      <Field label="دراو" style={{ flex: "0 0 140px", minWidth: "125px" }}>
                        <select
                          value={expense.currencyId}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateExpense(expense.id, {
                              currencyId: Number(e.target.value),
                            })
                          }
                          style={{ ...input, ...lockedFieldStyle }}
                        >
                          {currencies.map((currency: any) => (
                            <option key={currency.id} value={currency.id}>
                              {currency.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="تێبینی" style={{ flex: "2 1 240px", minWidth: "200px" }}>
                        <input
                          value={expense.note}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateExpense(expense.id, {
                              note: e.target.value,
                            })
                          }
                          style={{ ...compactExpenseNoteInput, ...lockedFieldStyle }}
                        />
                      </Field>

                      <div style={expenseDebtBox}>
                        <label style={checkboxRow}>
                          <input
                            type="checkbox"
                            checked={expense.addAsDebt}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateExpense(expense.id, {
                                addAsDebt: e.target.checked,
                                accountId: e.target.checked
                                  ? expense.accountId
                                  : undefined,
                              })
                            }
                          />
                          زیادکردن وەک قەرز
                        </label>

                        {expense.addAsDebt && (
                          <div style={{ position: "relative", marginTop: 8 }}>
                            <div style={supplierInputWrap}>
                              <input
                                value={expenseSearches[expense.id] !== undefined ? expenseSearches[expense.id] : (accounts.find((a: any) => a.id === expense.accountId)?.name || "")}
                                disabled={isLocked}
                                onFocus={() => {
                                  if (!isLocked) {
                                    const currentName = accounts.find((a: any) => a.id === expense.accountId)?.name || "";
                                    setExpenseSearches(prev => ({ ...prev, [expense.id]: currentName }));
                                    setShowExpenseList(prev => ({ ...prev, [expense.id]: true }));
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setShowExpenseList(prev => ({ ...prev, [expense.id]: false }));
                                    setExpenseSearches(prev => {
                                      const copy = { ...prev };
                                      delete copy[expense.id];
                                      return copy;
                                    });
                                  }, 200);
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExpenseSearches(prev => ({ ...prev, [expense.id]: val }));
                                  updateExpense(expense.id, { accountId: undefined });
                                  setShowExpenseList(prev => ({ ...prev, [expense.id]: true }));
                                }}
                                placeholder="بۆ هەژمار بگەڕێ..."
                                style={{
                                  ...input,
                                  ...lockedFieldStyle,
                                  paddingLeft: expense.accountId && !isLocked ? 36 : 14,
                                }}
                              />

                              {expense.accountId && !isLocked && (
                                <button
                                  type="button"
                                  style={{
                                    ...supplierClearBtn,
                                    width: 24,
                                    height: 24,
                                    fontSize: 16,
                                  }}
                                  onClick={() => {
                                    updateExpense(expense.id, { accountId: undefined });
                                    setExpenseSearches(prev => {
                                      const copy = { ...prev };
                                      delete copy[expense.id];
                                      return copy;
                                    });
                                  }}
                                  title="لابردنی هەژمار"
                                >
                                  ×
                                </button>
                              )}
                            </div>

                            {showExpenseList[expense.id] && !isLocked && (
                              <div style={{ ...dropdownLarge, maxHeight: 200, width: "100%", zIndex: 100 }}>
                                {(() => {
                                  const q = (expenseSearches[expense.id] || "").trim().toLowerCase();
                                  const expAccounts = accounts.filter((a: any) => a.isActive !== false && a.isShareholder !== true && a.accountType?.name !== 'کڕیار');
                                  const filtered = q
                                    ? expAccounts.filter((a: any) =>
                                        String(a.name || "").toLowerCase().includes(q) ||
                                        String(a.phone || "").toLowerCase().includes(q) ||
                                        String(a.city || "").toLowerCase().includes(q)
                                      )
                                    : expAccounts;

                                  if (filtered.length === 0) {
                                    return <div style={{ padding: 12, color: "#9ca3af", textAlign: "center", fontSize: 13 }}>هیچ هەژمارێک نەدۆزرایەوە</div>;
                                  }

                                  return filtered.map((account: any) => (
                                    <button
                                      key={account.id}
                                      style={dropdownItem}
                                      onMouseDown={() => {
                                        updateExpense(expense.id, { accountId: account.id });
                                        setShowExpenseList(prev => ({ ...prev, [expense.id]: false }));
                                        setExpenseSearches(prev => {
                                          const copy = { ...prev };
                                          delete copy[expense.id];
                                          return copy;
                                        });
                                      }}
                                    >
                                      <strong>{account.name}</strong>
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={expenseActions}>
                      <span style={smallMuted}>
                        {expense.addAsDebt
                          ? "ئەم خەرجییە وەک قەرز بۆ هەژماری هەڵبژێردراو زیاد دەبێت."
                          : "ئەم خەرجییە بۆ کۆستی کاڵاکان دابەش دەبێت."}
                      </span>

                      <button
                        style={deleteBtn}
                        disabled={isLocked}
                        onClick={() => removeExpense(expense.id)}
                      >
                        سڕینەوە
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expenses.length > 0 && (
              <div style={expenseTotalBox}>
                <div style={sectionTitle}>کۆی گشتی خەرجی</div>

                <div style={expenseBadges}>
                  {getExpensesByCurrency().map((item: any) => (
                    <span key={item.currencyId} style={moneyBadge}>
                      {formatCurrencyAmountJSX(item.amount, item.currencyId)}
                    </span>
                  ))}
                </div>

                <div style={expenseTotalCurrencyBox}>
                  <Field label="کۆی بڕی خەرجی بە">
                    <select
                      value={expenseTotalCurrencyId ?? ""}
                      disabled={isLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setExpenseTotalCurrencyId(Number(e.target.value));
                        setIsExpenseTotalManual(false);
                        setManualExpenseTotal("");
                      }}
                      style={{ ...input, ...lockedFieldStyle }}
                    >
                      {currencies.map((currency: any) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name} ({currency.symbol})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="کۆی بڕی خەرجی">
                    <FormattedNumberInput
                      value={displayedExpenseTotal}
                      disabled={isLocked}
                      onFocus={() => {
                        if (blockIfLocked()) return;

                        if (!isExpenseTotalManual) {
                          setManualExpenseTotal(
                            String(
                              Math.round(
                                calculatedExpensesTotalInSelectedCurrency || 0
                              )
                            )
                          );
                          setIsExpenseTotalManual(true);
                        }
                      }}
                      onChange={(val) => {
                        if (blockIfLocked()) return;
                        setIsExpenseTotalManual(true);
                        setManualExpenseTotal(val);
                      }}
                      style={{ ...smallExpenseTotalInput, ...lockedFieldStyle }}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Field label="تێبینی گشتی خەرجیەکان">
                    <textarea
                      value={expenseGeneralNote}
                      disabled={isLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setExpenseGeneralNote(e.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                      placeholder="تێبینی گشتی بۆ خەرجیەکان..."
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div style={summaryCard}>
            <SummaryItem label="کۆی کەرەستەکان" value={`${itemCount}`} />
            <SummaryItem
              label="کۆی بەهای کاڵاکان"
              value={formatCurrencyMap(itemsTotalsByCurrency)}
            />
            <SummaryItem
              label="کۆی بڕی خەرجی"
              value={formatCurrencyAmount(
                finalExpenseTotalInSelectedCurrency,
                expenseTotalCurrencyId || defaultCurrency?.id || 5
              )}
            />
            <SummaryItem
              label="کۆستی گشتی کۆگا"
              value={formatCurrencyMap(costGrandTotalByCurrency)}
              strong
            />
            <SummaryItem label="پارەی دراو" value={getPaidSummaryText()} />
            <SummaryItem
              label="ماوەی دابینکەر"
              value={formatCurrencyMap(supplierRemainingByCurrency)}
              strong
            />
          </div>
        </main>
      </div>

      <div id="purchase-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

                    {(printOptions.showInvoiceInfo || printOptions.showSupplierInfo) && (
            <div style={printInfoGrid}>
              {/* Right Column: Invoice Info Box */}
              {printOptions.showInvoiceInfo ? (
                <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                  <PrintInfoLine label="جۆری پسوڵە" value="کڕین" />
                  <PrintInfoLine label="ژمارەی پسوڵە" value={invoiceNumber} />
                  <PrintInfoLine
                      label="بەروار"
                      value={formatDate(invoiceDate)}
                    />
                  <PrintInfoLine label="کاتژمێر" value={createdTime} />
                  <PrintInfoLine
                      label="قاسە"
                      value={selectedCashbox?.name || "-"}
                    />
                  <PrintInfoLine
                      label="دۆخی پارەدان"
                      value={getAutoPaymentStatusLabel()}
                    />
                  <PrintInfoLine label="دابینکەر" value={supplier?.name || "-"} />
                  <PrintInfoLine label="ژمارە" value={supplier?.phone || "-"} />
                  <PrintInfoLine
                      label="ناونیشان"
                      value={
                        [supplier?.city, supplier?.address]
                          .filter(Boolean)
                          .join(" - ") || "-"
                      }
                    />
                </div>
              ) : (
                <div />
              )}

              {/* Left Column: Stack of Account Info & Employee Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {printOptions.showSupplierInfo && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                    <PrintInfoLine label="دابینکەر" value={supplier?.name || "-"} />
                    <PrintInfoLine label="ژمارە" value={supplier?.phone || "-"} />
                    <PrintInfoLine
                      label="ناونیشان"
                      value={
                        [supplier?.city, supplier?.address]
                          .filter(Boolean)
                          .join(" - ") || "-"
                      }
                    />
                  </div>
                )}

                {/* Employee Info Box */}
                {printOptions.showEmployeeName || printOptions.showEmployeePhone && (employeeName || employeePhone) && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                    <PrintInfoLine
                      label="کارمەند"
                      value={employeeName}
                    />
                    <PrintInfoLine
                      label="ژمارەی تەلەفۆن"
                      value={employeePhone}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <table style={printTable}>
            <thead>
              <tr>
                <th style={printTh}>#</th>
                {tableColumns.product && <th style={printTh}>کەرەستە</th>}
                {tableColumns.code && <th style={printTh}>کۆد</th>}
                {tableColumns.qty && <th style={printTh}>عەدد</th>}
                {tableColumns.purchasePrice && (
                  <th style={printTh}>نرخی کڕین</th>
                )}
                {tableColumns.expense && <th style={printTh}>خەرجی</th>}
                {tableColumns.cost && <th style={printTh}>کۆست</th>}
                {tableColumns.discount &&
                  rows.some((row: any) => toNumber(row.discount) > 0) && (
                    <th style={printTh}>داشکاندن</th>
                  )}
                {tableColumns.total && <th style={printTh}>کۆی بەهای کاڵا</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td style={printTd}>{index + 1}</td>

                  {tableColumns.product && (
                    <td style={printTdWide}>
                      <div>{row.productName}</div>
                      {printOptions.showNotes && row.note && (
                        <div style={printSmallNote}>{row.note}</div>
                      )}
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

                  {tableColumns.purchasePrice && (
                    <td style={printTd}>
                      {formatCurrencyAmount(
                        toNumber(row.purchasePrice),
                        row.currencyId
                      )}
                    </td>
                  )}

                  {tableColumns.expense && (
                    <td style={printTd}>
                      {formatCurrencyAmount(
                        getAllocatedExpensePerUnitInRowCurrency(row),
                        row.currencyId
                      )}
                    </td>
                  )}

                  {tableColumns.cost && (
                    <td style={printTd}>
                      {formatCurrencyAmount(
                        getFinalCostPerUnitInRowCurrency(row),
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
                    label="کۆی بەهای کاڵاکان"
                    value={formatCurrencyMap(itemsTotalsByCurrency)}
                  />
                  <PrintSummaryLine
                    label="کۆی بڕی خەرجی"
                    value={formatCurrencyAmount(
                      finalExpenseTotalInSelectedCurrency,
                      expenseTotalCurrencyId || defaultCurrency?.id || 5
                    )}
                  />
                  <PrintSummaryLine
                    label="کۆستی گشتی کۆگا"
                    value={formatCurrencyMap(costGrandTotalByCurrency)}
                    bold
                  />
                </>
              )}
            </div>

            <div style={printSummaryBox}>
              {printOptions.showBalance && (
                <>
                  <PrintSummaryLine
                    label="قەرزی پێشوو"
                    value={formatCurrencyMap(accountBalanceBeforeByCurrency)}
                  />
                  <PrintSummaryLine
                    label="پارەی دراو"
                    value={getPaidSummaryText()}
                  />
                  <PrintSummaryLine
                    label="کۆی گشتی ماوە"
                    value={formatCurrencyMap(accountBalanceAfterByCurrency)}
                    bold
                  />

                  {expenseGeneralNote.trim() !== "" && (
                    <div style={printExpenseNoteBox}>
                      <b>تێبینی خەرجی:</b> {expenseGeneralNote}
                    </div>
                  )}
                </>
              )}

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
              <button style={modalCloseBtn} onClick={() => setShowSettings(false)}>
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
                    label="دۆخی پارەدان"
                    checked={printOptions.showPaymentStatus}
                    onChange={() => togglePrintOption("showPaymentStatus")}
                  />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری دابینکەر</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" }}>
                    <SettingCheck
                    label="زانیاری دابینکەر دەرکەوێت"
                    checked={printOptions.showSupplierInfo}
                    onChange={() => togglePrintOption("showSupplierInfo")}
                  />
                    <SettingCheck
                    label="ناوی دابینکەر"
                    checked={printOptions.showSupplierName}
                    onChange={() => togglePrintOption("showSupplierName")}
                  />
                    <SettingCheck
                    label="ژمارەی دابینکەر"
                    checked={printOptions.showSupplierPhone}
                    onChange={() => togglePrintOption("showSupplierPhone")}
                  />
                    <SettingCheck
                    label="ناونیشانی دابینکەر"
                    checked={printOptions.showSupplierAddress}
                    onChange={() => togglePrintOption("showSupplierAddress")}
                  />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری کارمەند</h4>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8, backgroundColor: "#f9fafb", display: "flex", flexDirection: "column", gap: 12 }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <SettingCheck
                    label="زانیاری کارمەند"
                    checked={printOptions.showEmployeeInfo}
                    onChange={() => togglePrintOption("showEmployeeInfo")}
                  />
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      
                  <Field label="ناوی کارمەند">
                    <input
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="ناوی کارمەند"
                      style={input}
                    />
                  </Field>

                  <Field label="ژمارەی مۆبایلی کارمەند">
                    <input
                      value={employeePhone}
                      onChange={(e) =>
                        setEmployeePhone(onlyInteger(e.target.value))
                      }
                      inputMode="numeric"
                      lang="en"
                      dir="ltr"
                      placeholder="0770..."
                      style={input}
                    />
                  </Field>
                
                    </div>
                  </div>
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
                    label="نرخی کڕین"
                    checked={tableColumns.purchasePrice}
                    onChange={() => toggleColumn("purchasePrice")}
                  />
                  <SettingCheck
                    label="خەرجی"
                    checked={tableColumns.expense}
                    onChange={() => toggleColumn("expense")}
                  />
                  <SettingCheck
                    label="کۆست"
                    checked={tableColumns.cost}
                    onChange={() => toggleColumn("cost")}
                  />
                  <SettingCheck
                    label="داشکاندن"
                    checked={tableColumns.discount}
                    onChange={() => toggleColumn("discount")}
                  />
                  <SettingCheck
                    label="کۆی بەهای کاڵا"
                    checked={tableColumns.total}
                    onChange={() => toggleColumn("total")}
                  />
                  <SettingCheck
                    label="چالاکی"
                    checked={tableColumns.action}
                    onChange={() => toggleColumn("action")}
                  />
                </div>

                <div style={settingHelp}>
                  هەر کۆڵۆمێک لێرە ناچالاک بکەیت، لە ناو پەڕە و چاپیش دەرناکەوێت.
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>چاپ</h3>

                <div style={settingGrid2}>
                  <SettingCheck
                    label="تێبینی چاپ بکرێت"
                    checked={printOptions.showNotes}
                    onChange={() => togglePrintOption("showNotes")}
                  />
                  <SettingCheck
                    label="باڵانسی پسوڵە پیشان بدرێت"
                    checked={printOptions.showBalance}
                    onChange={() => togglePrintOption("showBalance")}
                  />
                  <SettingCheck
                    label="ناوی کارمەند"
                    checked={printOptions.showEmployeeName}
                    onChange={() => togglePrintOption("showEmployeeName")}
                  />
                  <SettingCheck
                    label="ژمارەی کارمەند"
                    checked={printOptions.showEmployeePhone}
                    onChange={() => togglePrintOption("showEmployeePhone")}
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
  style,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <label style={{ display: "block", ...style }}>
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
  value: ReactNode;
  color?: string;
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
    <div style={{ ...printInfoRow, justifyContent: "flex-start", gap: "6px" }}>
      <b style={{ marginLeft: "4px" }}>{label}:</b>
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
  @page { size: auto; margin: 0 !important; }

  body * {
    visibility: hidden !important;
  }

  #purchase-print-area,
  #purchase-print-area * {
    visibility: visible !important;
  }

  #purchase-print-area {
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
  display: "flex",
  flexDirection: "column",
  flex: 1,
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

const smallExpenseTotalInput: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  outline: "none",
  background: "white",
  boxSizing: "border-box",
  fontFamily: appFont,
  textAlign: "right",
  direction: "ltr",
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

const compactExpenseNoteInput: CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 13,
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

const supplierInputWrap: CSSProperties = {
  position: "relative",
  width: "100%",
};

const supplierClearBtn: CSSProperties = {
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

const emptyExpenseBox: CSSProperties = {
  padding: 26,
  borderRadius: 14,
  border: "1px dashed #d1d5db",
  textAlign: "center",
  color: "#9ca3af",
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

const smallBlueBtn: CSSProperties = {
  borderRadius: 10,
  border: 0,
  background: "#2563eb",
  color: "white",
  padding: "9px 14px",
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

const currentPriceTypeBadge: CSSProperties = {
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
  verticalAlign: "middle",
};

const tdWide: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  minWidth: 280,
  verticalAlign: "middle",
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

const sectionCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const sectionTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 12,
};

const checkboxRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
};

const allocationBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 260px",
  gap: 12,
  marginBottom: 14,
};

const expenseStack: CSSProperties = {
  display: "grid",
  gap: 12,
};

const expenseCard: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fafafa",
  padding: 12,
};

const expenseGrid: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "stretch",
  width: "100%",
};

const expenseDebtBox: CSSProperties = {
  flex: "1 1 300px",
  minWidth: "280px",
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  boxSizing: "border-box",
};

const expenseActions: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
};

const expenseTotalBox: CSSProperties = {
  marginTop: 14,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  padding: 14,
};

const expenseBadges: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const moneyBadge: CSSProperties = {
  background: "white",
  color: "#2563eb",
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  padding: "6px 10px",
  fontWeight: 900,
};

const expenseTotalCurrencyBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "260px 260px",
  gap: 12,
  alignItems: "end",
  justifyContent: "start",
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
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)",
  borderBottom: "1px solid #0f172a",
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
  verticalAlign: "middle",
};

const printTdWide: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "6px 5px",
  textAlign: "right",
  verticalAlign: "middle",
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

const settingFormGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
  marginTop: 12,
};

const settingCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
  fontWeight: 700,
};

const settingHelp: CSSProperties = {
  marginTop: 10,
  color: "#6b7280",
  lineHeight: 1.7,
};

const modalFooter: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-start",
};
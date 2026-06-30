"use client";
import DateInput from "./DateInput";
import FormattedNumberInput from "./FormattedNumberInput";
import PrintHeader, { PrintWatermark } from "./PrintHeader";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store, useStore } from "../store/store";
import { calculateLedgerEntries } from "../utils/ledgerHelper";
import { accountTypes, currencies as mockCurrencies } from "../data/mockData";

type Props = {
  headerSelector?: ReactNode;
  invoiceType: string;
  editId?: string;
};

type DiscountMode = "amount" | "percent";
type PriceTypeName = "جوملە" | "تاک" | "تایبەت";
const priceTypes: PriceTypeName[] = ["جوملە", "تاک", "تایبەت"];
type ToastType = "error" | "success" | "info";

type PaidAmounts = {
  [currencyId: number]: string;
};

type InvoiceRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  qty: string;
  price: string;
  discountMode: DiscountMode;
  discountValue: string;
  note: string;
  packageName: string;
  packageQuantity: number;
  warehouseName: string;
  priceType: PriceTypeName | string;
  currencyId: number;
  availableQty: number;
  previousPrice?: number;
  costPrice?: number;
  showCost: boolean;
};

type ProductLike = {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  warehouseStocks?: Record<number, number>;
  salePrices?: {
    currencyId: number;
    amount?: number;
    price?: number;
    priceType?: string;
  }[];
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
  balanceCurrencyId?: number;
  showInPurchase?: boolean;
  showInSales?: boolean;
  creditLimit?: number;
  creditLimitCurrencyId?: number;
  debtAlertDays?: number;
  guarantorName?: string;
};

type TableColumns = {
  product: boolean;
  code: boolean;
  qty: boolean;
  price: boolean;
  discount: boolean;
  total: boolean;
  action: boolean;
};

type PrintOptions = {
  showInvoiceInfo: boolean;
  showInvoiceType: boolean;
  showInvoiceNumber: boolean;
  showInvoiceDate: boolean;
  showCreatedTime: boolean;
  showCashbox: boolean;
  showAccountInfo: boolean;
  showAccountName: boolean;
  showAccountPhone: boolean;
  showAccountAddress: boolean;
  showCode: boolean;
  showDiscount: boolean;
  showNotes: boolean;
  showDelivery: boolean;
  showPriceType: boolean;
  showPrintBalance: boolean;
  showEmployeeName: boolean;
  showEmployeePhone: boolean;
};

const fallbackWarehouses = [
  { id: 1, name: "کۆگای سەرەکی" },
  { id: 2, name: "کۆگای دووکان" },
];

export default function InvoicePage({ headerSelector, invoiceType, editId }: Props) {
  const router = useRouter();
  const [isEditLoading, setIsEditLoading] = useState(!!editId);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedInvoiceSnapshot("");
    } else {
      resetInvoice();
    }
  }, [editId]);

  const accounts = (useStore((s) => s.accounts) || []) as AccountLike[];
  const cashboxes = (useStore((s) => s.cashboxes) || []) as any[];
  const products = (useStore((s) => s.products) || []) as ProductLike[];
  const invoices = (useStore((s) => s.invoices) || []) as any[];
  const accountTypesStore = (useStore((s) => s.accountTypes) || []) as any[];
  const currentUser = useStore((s) => s.currentUser);

  const fetchAccounts = useStore((s) => s.fetchAccounts);
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const fetchCashboxes = useStore((s) => s.fetchCashboxes);
  const fetchProducts = useStore((s) => s.fetchProducts);
  const fetchInvoices = useStore((s) => s.fetchInvoices);
  const fetchAccountTypes = useStore((s) => s.fetchAccountTypes);

  const warehousesFromStore = (useStore((s) => (s as any).warehouses) || []) as any[];
  const fetchWarehouses = useStore((s: any) => s.fetchWarehouses);

  const warehouses = useMemo(() => {
    return warehousesFromStore.length > 0
      ? warehousesFromStore
      : fallbackWarehouses;
  }, [warehousesFromStore]);

  const addVoucher = useStore((s) => s.addVoucher);
  const updateVoucher = useStore((s) => s.updateVoucher);

  const loggedInUser =
    currentUser ||
    (store as any).currentUser ||
    (store as any).user ||
    (store as any).authUser ||
    {};

  const defaultCurrency =
    currencies[0] ||
    ({
      id: 1,
      name: "دۆلار",
      code: "USD",
      symbol: "$",
      isActive: true,
    } as any);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");

  useEffect(() => {
    if (accounts.length === 0) fetchAccounts();
    if (storeCurrencies.length === 0) fetchCurrencies();
    if (cashboxes.length === 0) fetchCashboxes();
    if (products.length === 0) fetchProducts();
    if (invoices.length === 0) fetchInvoices();
    if (accountTypesStore.length === 0) fetchAccountTypes();
    if (warehousesFromStore.length === 0) fetchWarehouses();
  }, []);

  useEffect(() => {
    setInvoiceNumber("");
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setInvoiceDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (currentUser) {
      setEmployeeName(currentUser.name || currentUser.username || "");
      setEmployeePhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>();
  const [showAccountList, setShowAccountList] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [isTemporaryCustomer, setIsTemporaryCustomer] = useState(false);
  const [tempCustomerName, setTempCustomerName] = useState("");
  const [tempCustomerPhone, setTempCustomerPhone] = useState("");
  const [tempCustomerAddress, setTempCustomerAddress] = useState("");

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [invoiceCurrencyId] = useState<number>(defaultCurrency.id);

  const [paidCurrencyId, setPaidCurrencyId] = useState<number>(
    defaultCurrency.id
  );
  const [paidAmounts, setPaidAmounts] = useState<PaidAmounts>({});

  const [exchangeRate, setExchangeRate] = useState("150000");

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [openedDetailRowId, setOpenedDetailRowId] = useState<number | null>(
    null
  );
  const [detailCoords, setDetailCoords] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (openedDetailRowId === null) return;
    const updatePosition = () => {
      const triggerEl = document.getElementById(`product-name-${openedDetailRowId}`);
      if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        setDetailCoords({
          top: rect.bottom + 6,
          right: window.innerWidth - rect.right,
        });
      }
    };
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openedDetailRowId]);

  const [showInvoiceNotes, setShowInvoiceNotes] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [printNote, setPrintNote] = useState("");

  const [showInvoiceDiscount, setShowInvoiceDiscount] = useState(false);
  const [invoiceDiscountMode, setInvoiceDiscountMode] = useState<DiscountMode>("amount");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState("");

  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  const [invoicePriceType, setInvoicePriceType] = useState<PriceTypeName | string>("جوملە");

  const [savedInvoiceSnapshot, setSavedInvoiceSnapshot] = useState("");
  const [originalVoucher, setOriginalVoucher] = useState<any>(null);
  const [excessModalConfig, setExcessModalConfig] = useState<{
    isOpen: boolean;
    excessAmount: number;
    targetCurrencyId: number;
    otherCurrencyId: number;
  } | null>(null);
  const [isInvoiceLocked, setIsInvoiceLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  useEffect(() => {
    fetch("/api/invoice-templates")
      .then((res) => res.json())
      .then((data) => {
        const main = data.find((t: any) => t.isMain && t.isActive);
        if (main) setActiveTemplate(main);
      })
      .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
  }, []);

  const [tableColumns, setTableColumns] = useState<TableColumns>({
    product: true,
    code: true,
    qty: true,
    price: true,
    discount: true,
    total: true,
    action: true,
  });

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
              setAccountId(voucher.accountId);
              const acc = accounts.find((a: any) => a.id === voucher.accountId);
              if (acc) {
                setAccountSearch(acc.name);
              }
            } else if (voucher.isTemporaryCustomer || voucher.temporaryCustomer) {
              setIsTemporaryCustomer(true);
              const temp = voucher.temporaryCustomer || {};
              setTempCustomerName(temp.name || "");
              setTempCustomerPhone(temp.phone || "");
              setTempCustomerAddress(temp.address || "");
            }
            
            setCashboxId(voucher.cashboxId || undefined);
            
            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                qty: String(line.qty / (line.packageQuantity || 1)),
                price: String(line.unitPrice),
                discountMode: "amount" as const,
                discountValue: String(line.discountAmount),
                note: line.note || "",
                packageName: line.packageName || "دانە",
                packageQuantity: line.packageQuantity || 1,
                warehouseName: (() => {
                  const tx = voucher.inventoryTransactions?.find((t: any) => t.productId === line.productId);
                  return tx?.warehouse?.name || "کۆگای سەرەکی";
                })(),
                priceType: line.priceType || "جوملە",
                currencyId: line.currencyId || voucher.currencyId || 1,
                availableQty: (line.product?.stock || 0) + line.qty,
                costPrice: (() => {
                  const tx = voucher.inventoryTransactions?.find((t: any) => t.productId === line.productId);
                  return tx ? tx.unitCost : (line.product?.costPrice || 0);
                })(),
                showCost: false,
              }));
              setRows(mappedRows);
            }
            
            setInternalNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) {
              setShowInvoiceNotes(true);
            }
            
            const initialPaid: PaidAmounts = {};
            if (voucher.paidAmounts && Array.isArray(voucher.paidAmounts)) {
              voucher.paidAmounts.forEach((pa: any) => {
                initialPaid[pa.currencyId] = String(pa.amount);
              });
            }
            setPaidAmounts(initialPaid);
            
            // Set the paid currency dropdown to the currency that was actually paid
            if (voucher.paidAmounts && Array.isArray(voucher.paidAmounts) && voucher.paidAmounts.length > 0) {
              const firstPaidCurrency = voucher.paidAmounts.find((pa: any) => pa.amount > 0);
              if (firstPaidCurrency) {
                setPaidCurrencyId(firstPaidCurrency.currencyId);
              }
            }
            
            if (voucher.hasDelivery) {
              setHasDelivery(true);
              setDeliveryName(voucher.driverName || "");
              setDeliveryPhone(voucher.driverPhone || "");
              setDeliveryCity(voucher.deliveryCity || "");
              setDeliveryAddress(voucher.deliveryAddress || "");
              setDeliveryFee(voucher.deliveryFee ? String(voucher.deliveryFee) : "");
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
            setOriginalVoucher(voucher);
            setIsInvoiceLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
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

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    showInvoiceInfo: true,
    showInvoiceType: true,
    showInvoiceNumber: true,
    showInvoiceDate: true,
    showCreatedTime: true,
    showCashbox: true,

    showAccountInfo: true,
    showAccountName: true,
    showAccountPhone: true,
    showAccountAddress: true,

    showCode: true,
    showDiscount: true,
    showNotes: true,
    showDelivery: true,
    showPriceType: true,

    showPrintBalance: false,
    showEmployeeName: true,
    showEmployeePhone: true,
  });

  const selectedAccount = accounts.find((a: any) => a.id === accountId);

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
      const balanceCurrencyId = account.balanceCurrencyId || account.creditLimitCurrencyId || defaultCurrency.id || 1;
      map[String(balanceCurrencyId)] = Number(account.balance || 0);
    }
    return map;
  }

  function getSingleAccountBalanceCurrencyId(account?: AccountLike): number {
    if (!account?.balanceByCurrency) {
      return account?.balanceCurrencyId || account?.creditLimitCurrencyId || defaultCurrency.id || 1;
    }
    const activeCurrencies = Object.entries(account.balanceByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText]) => Number(currencyIdText));
    if (activeCurrencies.length === 1) return activeCurrencies[0];
    return account.balanceCurrencyId || account.creditLimitCurrencyId || defaultCurrency.id || 1;
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
          return (
            <span key={curIdText} style={{ color, fontWeight: 900, fontSize: 14 }} dir="ltr">
              {formatCurrencyAmountJSX(val, Number(curIdText))}
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
    const formatted = Math.abs(value).toLocaleString("en-US", { 
      minimumFractionDigits: isRounding ? 0 : 2, 
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
            <span style={{ fontSize: "0.7em", opacity: 0.75 }}>.{decimal}</span>
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
    const currentBalMap = getAccountBalanceBeforeMap(selectedAccount);
    if (!editId) {
      return currentBalMap;
    }
    if (!originalVoucher || !selectedAccount) {
      return currentBalMap;
    }
    if (Number(accountId) !== originalVoucher.accountId) {
      return currentBalMap;
    }
    if (originalVoucher.historicalBalanceBefore) {
      return originalVoucher.historicalBalanceBefore;
    }
    const computedBefore = { ...currentBalMap };
    if (originalVoucher.ledgerEntries) {
      originalVoucher.ledgerEntries.forEach((le: any) => {
        if (le.accountId === Number(accountId)) {
          const curIdText = String(le.currencyId);
          const change = le.debit - le.credit;
          computedBefore[curIdText] = (computedBefore[curIdText] || 0) - change;
        }
      });
    }
    return computedBefore;
  }, [selectedAccount, editId, originalVoucher, accountId]);

  const screenAccountBalanceBeforeByCurrency = useMemo(() => {
    const currentBalMap = getAccountBalanceBeforeMap(selectedAccount);
    if (!editId || !originalVoucher || !selectedAccount) {
      return currentBalMap;
    }
    if (Number(accountId) !== originalVoucher.accountId) {
      return currentBalMap;
    }
    const computedBefore = { ...currentBalMap };
    if (originalVoucher.ledgerEntries) {
      originalVoucher.ledgerEntries.forEach((le: any) => {
        if (le.accountId === Number(accountId)) {
          const curIdText = String(le.currencyId);
          const change = le.debit - le.credit;
          computedBefore[curIdText] = (computedBefore[curIdText] || 0) - change;
        }
      });
    }
    return computedBefore;
  }, [selectedAccount, editId, originalVoucher, accountId]);

  const activeBalances = useMemo(() => {
    return Object.entries(accountBalanceBeforeByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount)) > 0.01);
  }, [accountBalanceBeforeByCurrency]);

  const [targetCurrencyId, setTargetCurrencyId] = useState<number | undefined>();

  useEffect(() => {
    if (selectedAccount) {
      if (activeBalances.length > 1) {
        const hasPaidCur = activeBalances.some(([id]) => Number(id) === paidCurrencyId);
        setTargetCurrencyId(hasPaidCur ? paidCurrencyId : Number(activeBalances[0][0]));
      } else {
        setTargetCurrencyId(undefined);
      }
    } else {
      setTargetCurrencyId(undefined);
    }
  }, [accountId, paidCurrencyId, activeBalances, selectedAccount]);

  const itemCount = rows.reduce((sum, row) => sum + toNumber(row.qty), 0);
  const itemsSubtotal = rows.reduce((sum, row) => sum + getRowTotal(row), 0);

  const invoiceDiscountAmount = getDiscountAmount(
    itemsSubtotal,
    invoiceDiscountMode,
    invoiceDiscountValue
  );

  const iqdCurrencyId = currencies.find((c: any) => c.code === "IQD")?.id || 12;
  const rateForDelivery = (toNumber(exchangeRate) / 100) || 1500;

  const deliveryFeeAmount = useMemo(() => {
    const rawFee = hasDelivery && deliveryFee.trim() ? toNumber(deliveryFee) : 0;
    if (rawFee <= 0) return 0;
    if (invoiceCurrencyId === iqdCurrencyId) return rawFee;
    return rawFee / rateForDelivery;
  }, [deliveryFee, hasDelivery, invoiceCurrencyId, iqdCurrencyId, rateForDelivery]);

  const total =
    Math.max(itemsSubtotal - invoiceDiscountAmount, 0) + deliveryFeeAmount;

  const accountBalanceAfterByCurrency = useMemo(() => {
    if (!selectedAccount) return {};
    const before = accountBalanceBeforeByCurrency;

    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
    const rate = toNumber(exchangeRate) / 100;

    let mappedType = "sales";
    if (invoiceType === "کڕین") mappedType = "purchase";
    else if (invoiceType === "گەڕانەوەی فرۆشتن") mappedType = "sales_return";
    else if (invoiceType === "گەڕانەوەی کڕین") mappedType = "purchase_return";
    else if (invoiceType === "نرخاندن") mappedType = "quotation";

    const result = calculateLedgerEntries({
      type: mappedType,
      netAmount: total,
      currencyId: invoiceCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === invoiceCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    return result.balanceAfterByCurrency;
  }, [selectedAccount, paidAmounts, targetCurrencyId, exchangeRate, accountBalanceBeforeByCurrency, total, invoiceCurrencyId, invoiceType, editId, isInvoiceLocked]);

  const screenAccountBalanceAfterByCurrency = useMemo(() => {
    if (!selectedAccount) return {};
    const before = screenAccountBalanceBeforeByCurrency;

    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
    const rate = toNumber(exchangeRate) / 100;

    let mappedType = "sales";
    if (invoiceType === "کڕین") mappedType = "purchase";
    else if (invoiceType === "گەڕانەوەی فرۆشتن") mappedType = "sales_return";
    else if (invoiceType === "گەڕانەوەی کڕین") mappedType = "purchase_return";
    else if (invoiceType === "نرخاندن") mappedType = "quotation";

    const result = calculateLedgerEntries({
      type: mappedType,
      netAmount: total,
      currencyId: invoiceCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === invoiceCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    return result.balanceAfterByCurrency;
  }, [selectedAccount, paidAmounts, targetCurrencyId, exchangeRate, screenAccountBalanceBeforeByCurrency, total, invoiceCurrencyId, invoiceType]);
  const selectedCashbox = cashboxes.find((c: any) => c.id === cashboxId);
  const invoiceCurrency = currencies.find((c: any) => c.id === invoiceCurrencyId);
  const invoiceSymbol = invoiceCurrency?.symbol || "$";

  const visibleColumnCount =
    1 + Object.values(tableColumns).filter(Boolean).length;

  const currentInvoiceSnapshot = useMemo(() => {
    return JSON.stringify({
      accountId,
      isTemporaryCustomer,
      tempCustomerName,
      tempCustomerPhone,
      tempCustomerAddress,
      cashboxId,
      invoiceDate,
      createdTime,
      rows,
      invoiceDiscountMode,
      invoiceDiscountValue,
      paidAmounts,
      paidCurrencyId,
      exchangeRate,
      internalNote,
      printNote,
      hasDelivery,
      deliveryName,
      deliveryPhone,
      deliveryCity,
      deliveryAddress,
      deliveryFee,
      deliveryNote,
      invoicePriceType,
    });
  }, [
    accountId,
    isTemporaryCustomer,
    tempCustomerName,
    tempCustomerPhone,
    tempCustomerAddress,
    cashboxId,
    invoiceDate,
    createdTime,
    rows,
    invoiceDiscountMode,
    invoiceDiscountValue,
    paidAmounts,
    paidCurrencyId,
    exchangeRate,
    internalNote,
    printNote,
    hasDelivery,
    deliveryName,
    deliveryPhone,
    deliveryCity,
    deliveryAddress,
    deliveryFee,
    deliveryNote,
    invoicePriceType,
  ]);

  useEffect(() => {
    if (editId && !isEditLoading && !savedInvoiceSnapshot) {
      setSavedInvoiceSnapshot(currentInvoiceSnapshot);
    }
  }, [editId, isEditLoading, currentInvoiceSnapshot, savedInvoiceSnapshot]);

  const isInvoiceSaved =
    rows.length > 0 && savedInvoiceSnapshot === currentInvoiceSnapshot;

  const salesAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      if (account.isShareholder === true) return false;
      const show = account.accountType?.showsInSales ?? account.showInSales;
      if (typeof show === "boolean") {
        return show;
      }
      return true;
    });
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    const searched = q
      ? salesAccounts.filter((account: any) => {
          const typeName = getAccountTypeName(account.accountTypeId);
          return (
            String(account.name || "").toLowerCase().includes(q) ||
            String(account.phone || "").toLowerCase().includes(q) ||
            String(account.city || "").toLowerCase().includes(q) ||
            typeName.toLowerCase().includes(q)
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
  }, [accountSearch, salesAccounts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    let list = products.filter((product: any) => !product.isExpense);
    if (invoiceType === "فرۆشتن") {
      list = list.filter((product: any) => (product.stock || 0) > 0 || product.isService);
    }
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

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function convertCurrency(amount: number, fromId: number, toId: number) {
    if (fromId === toId) return amount;

    const from = currencies.find((c: any) => c.id === fromId);
    const to = currencies.find((c: any) => c.id === toId);
    const rate = (toNumber(exchangeRate) / 100) || 1500;

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
      .filter((x: any) => x.amount > 0);
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
      .map((item: any) => {
        const symbol = getCurrencySymbol(item.currencyId);
        const code = getCurrencyCode(item.currencyId);

        if (code === "IQD") {
          return `${Number(item.amount).toLocaleString("en-US")} دینار`;
        }

        return `${symbol}${Number(item.amount).toLocaleString("en-US")}`;
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
    const type = accountTypesStore.find((x: any) => Number(x.id) === Number(accountTypeId)) || accountTypes.find((x: any) => Number(x.id) === Number(accountTypeId));
    return type?.name || "-";
  }

  function formatMoney(value: number, symbol = invoiceSymbol) {
    const isIqd = symbol === "IQD" || symbol === "دینار";
    const displaySymbol = isIqd ? "دینار" : symbol;
    return `${displaySymbol} ${Number(value || 0).toLocaleString("en-US")}`;
  }

  function formatMoneyJSX(value: number, symbol = invoiceSymbol) {
    const isIqd = symbol === "IQD" || symbol === "دینار";
    const displaySymbol = isIqd ? "دینار" : symbol;
    const isRounding = isIqd;
    const formatted = Math.abs(value).toLocaleString("en-US", { 
      minimumFractionDigits: isRounding ? 0 : 2, 
      maximumFractionDigits: isRounding ? 0 : 2 
    });

    const parts = formatted.split('.');
    const whole = parts[0];
    const decimal = parts[1];
    const isNegative = value < 0;

    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: 2 }} dir="ltr">
        {isNegative && <span>-</span>}
        <span style={{ fontSize: "0.85em", opacity: 0.8 }}>{displaySymbol}</span>
        <span>
          <span>{whole}</span>
          {decimal !== undefined && (
            <span style={{ fontSize: "0.7em", opacity: 0.75 }}>.{decimal}</span>
          )}
        </span>
      </span>
    );
  }

  function getPaidSummaryTextJSX() {
    const paidList = getPaidCurrencies();
    if (paidList.length === 0) return <span style={{ color: "#9ca3af", fontWeight: 900 }}>0</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        {paidList.map((item: any, idx: number) => (
          <div key={idx}>
            {formatMoneyJSX(item.amount, getCurrencySymbol(item.currencyId))}
          </div>
        ))}
      </div>
    );
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";
    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  function getRowAvailableQty(productId: number, warehouseName: string) {
    const prod = products.find((p: any) => p.id === productId);
    if (!prod) return 0;

    const warehouse = warehouses.find((w: any) => w.name === warehouseName);
    const whId = warehouse ? warehouse.id : warehouses[0]?.id;

    const baseStock = prod.warehouseStocks ? (prod.warehouseStocks[whId] || 0) : (prod.stock || 0);

    let originalQty = 0;
    if (originalVoucher) {
      const origLine = originalVoucher.lines?.find((l: any) => l.productId === productId);
      const origTx = originalVoucher.inventoryTransactions?.find((t: any) => t.productId === productId);
      const origWhId = origTx?.warehouseId || origTx?.warehouse?.id;
      if (origLine && origWhId === whId) {
        originalQty = origLine.qty || 0;
      }
    }

    return baseStock + originalQty;
  }

  function availableText(row: InvoiceRow) {
    const totalAvailable = getRowAvailableQty(row.productId, row.warehouseName);
    const packageQty = row.packageQuantity || 1;
    if (packageQty > 1) {
      const packs = Math.floor(totalAvailable / packageQty);
      return `${packs} ${row.packageName} / ${totalAvailable} دانە`;
    }

    return `${totalAvailable} دانە`;
  }

  function validateStockBeforeSave() {
    for (const row of rows) {
      const requestedQty = toNumber(row.qty) * row.packageQuantity;
      const availableQty = getRowAvailableQty(row.productId, row.warehouseName);

      if (requestedQty <= 0) {
        showToast(`عەددی کەرەستەی "${row.productName}" دروست نییە.`);
        return false;
      }

      if (requestedQty > availableQty) {
        showToast(
          `ناتوانیت "${row.productName}" بفرۆشیت. بەردەست: ${availableQty} دانە / داواکراو: ${requestedQty} دانە`
        );
        return false;
      }
    }

    return true;
  }

  function updateRow(rowId: number, patch: Partial<InvoiceRow>) {
    if (blockIfLocked()) return;

    setRows((prev) =>
      prev.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  function updateRowQty(row: InvoiceRow, nextQtyText: string) {
    if (blockIfLocked()) return;

    const clean = onlyDecimal(nextQtyText);
    const requestedQty = toNumber(clean) * row.packageQuantity;
    const availableQty = getRowAvailableQty(row.productId, row.warehouseName);

    if (requestedQty > availableQty) {
      showToast(
        `ناتوانیت "${row.productName}" بەو عەددە بفرۆشیت. تەنها ${availableQty} بەردەستە لە کۆگا.`
      );
      return;
    }

    updateRow(row.id, { qty: clean });
  }

  function removeRow(rowId: number) {
    if (blockIfLocked()) return;

    setRows((prev) => prev.filter((row: any) => row.id !== rowId));

    if (openedDetailRowId === rowId) {
      setOpenedDetailRowId(null);
    }
  }

  function getProductPackages(product?: ProductLike) {
    if (product?.packages && product.packages.length > 0) {
      return product.packages;
    }

    return [{ name: "دانە", quantity: 1 }];
  }

  function getProductPrices(product?: ProductLike) {
    if (product?.salePrices && product.salePrices.length > 0) {
      return product.salePrices;
    }

    return [
      {
        priceType: "جوملە",
        currencyId: invoiceCurrencyId,
        amount: product?.salePrice || 0,
      },
    ];
  }

  function findPriceByType(product: ProductLike, priceType: string) {
    const prices = getProductPrices(product);
    return (
      prices.find((p: any) => (p.priceType || p.name) === priceType) ||
      prices[0]
    );
  }

  function chooseProduct(product: ProductLike) {
    if (blockIfLocked()) return;

    if ((product.stock || 0) <= 0) {
      showToast(`"${product.name}" لە کۆگادا بەردەست نییە.`);
      setProductSearch("");
      setShowProductList(false);
      return;
    }

    const packages = getProductPackages(product);
    const firstPackage = packages[0];

    const selectedPrice = findPriceByType(product, invoicePriceType);
    const priceAmount =
      Number(
        (selectedPrice as any).amount || (selectedPrice as any).price || 0
      ) || 0;

    const existing = rows.find((row: any) => row.productId === product.id);

    if (existing) {
      const nextQty = toNumber(existing.qty) + 1;
      const requestedQty = nextQty * existing.packageQuantity;
      const availableQty = getRowAvailableQty(existing.productId, existing.warehouseName);

      if (requestedQty > availableQty) {
        showToast(
          `ناتوانیت "${existing.productName}" زیاتر زیاد بکەیت. تەنها ${availableQty} بەردەستە لە کۆگا.`
        );
        setProductSearch("");
        setShowProductList(false);
        return;
      }

      updateRow(existing.id, {
        qty: String(nextQty),
      });

      setProductSearch("");
      setShowProductList(false);
      return;
    }

    const defaultWarehouseName = warehouses[0]?.name || "کۆگای سەرەکی";

    const newRow: InvoiceRow = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productId: product.id,
      productName: product.name,
      code: product.code || "",
      qty: "1",
      price: String(priceAmount),
      discountMode: "amount",
      discountValue: "",
      note: "",
      packageName: firstPackage.name,
      packageQuantity: firstPackage.quantity || 1,
      warehouseName: defaultWarehouseName,
      priceType:
        (selectedPrice as any).priceType ||
        (selectedPrice as any).name ||
        invoicePriceType,
      currencyId: selectedPrice.currencyId || invoiceCurrencyId,
      availableQty: getRowAvailableQty(product.id, defaultWarehouseName),
      previousPrice: getPreviousPrice(product.id),
      costPrice: product.costPrice || 0,
      showCost: false,
    };

    setRows((prev) => [...prev, newRow]);
    setProductSearch("");
    setShowProductList(false);
    setOpenedDetailRowId(null);
  }

  function getPreviousPrice(productId: number) {
    if (!accountId) return undefined;

    const reversed = [...invoices].reverse();

    for (const invoice of reversed) {
      if (invoice.type !== "فرۆشتن") continue;
      if (invoice.accountId !== accountId) continue;

      const foundItem = invoice.items?.find(
        (item: any) => item.productId === productId
      );

      if (foundItem) return Number(foundItem.price || 0);
    }

    return undefined;
  }

  function changeRowPackage(row: InvoiceRow, packageName: string) {
    if (blockIfLocked()) return;

    const product = products.find((p: any) => p.id === row.productId);
    const selectedPackage = getProductPackages(product).find(
      (p: any) => p.name === packageName
    );

    const nextPackageQuantity = selectedPackage?.quantity || 1;
    const requestedQty = toNumber(row.qty) * nextPackageQuantity;

    if (requestedQty > row.availableQty) {
      showToast(
        `ناتوانیت ئەم پێچانەوەیە هەڵبژێریت. داواکراو ${requestedQty} دانەیە، بەڵام بەردەست ${row.availableQty} دانەیە.`
      );
      return;
    }

    updateRow(row.id, {
      packageName,
      packageQuantity: nextPackageQuantity,
    });
  }

  function changeRowPriceType(row: InvoiceRow, priceType: string) {
    if (blockIfLocked()) return;

    const product = products.find((p: any) => p.id === row.productId);
    if (!product) return;

    const selectedPrice = getProductPrices(product).find((price: any) => {
      const pType = price.priceType || price.name;
      return pType === priceType && price.currencyId === row.currencyId;
    });

    updateRow(row.id, {
      priceType,
      price: selectedPrice
        ? String(
            (selectedPrice as any).amount || (selectedPrice as any).price || 0
          )
        : row.price,
    });
  }

  function changeRowCurrency(row: InvoiceRow, currencyId: number) {
    if (blockIfLocked()) return;

    const product = products.find((p: any) => p.id === row.productId);
    if (!product) return;

    const selectedPrice = getProductPrices(product).find((price: any) => {
      const pType = price.priceType || price.name;
      return pType === row.priceType && price.currencyId === currencyId;
    });

    updateRow(row.id, {
      currencyId,
      price: selectedPrice
        ? String(
            (selectedPrice as any).amount || (selectedPrice as any).price || 0
          )
        : row.price,
    });
  }

  function changePaidCurrency(currencyId: number) {
    if (blockIfLocked()) return;
    setPaidCurrencyId(currencyId);
  }

  function updatePaidAmount(currencyId: number, value: string) {
    if (blockIfLocked()) return;

    const clean = onlyDecimal(value);

    setPaidAmounts((prev) => ({
      ...prev,
      [currencyId]: clean,
    }));
  }

  function hasUnsavedInvoiceData() {
    const hasPaid = Object.values(paidAmounts).some((x: any) => x.trim() !== "");

    return (
      rows.length > 0 ||
      accountId !== undefined ||
      isTemporaryCustomer ||
      tempCustomerName.trim() !== "" ||
      tempCustomerPhone.trim() !== "" ||
      tempCustomerAddress.trim() !== "" ||
      hasPaid ||
      invoiceDiscountValue.trim() !== "" ||
      internalNote.trim() !== "" ||
      printNote.trim() !== "" ||
      hasDelivery ||
      deliveryName.trim() !== "" ||
      deliveryPhone.trim() !== "" ||
      deliveryCity.trim() !== "" ||
      deliveryAddress.trim() !== "" ||
      deliveryFee.trim() !== "" ||
      deliveryNote.trim() !== ""
    );
  }

  function resetInvoice() {
    // Clear editId from URL so the component exits edit mode
    if (editId) {
      router.push("/invoices?type=sales");
      return; // The route change will remount the component with editId=undefined
    }
    setInvoiceNumber("");
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setRows([]);
    setOpenedDetailRowId(null);
    setProductSearch("");
    setInvoiceDiscountValue("");
    setShowInvoiceDiscount(false);
    setPaidAmounts({});
    setPaidCurrencyId(defaultCurrency.id);
    const iqd = currencies.find((c: any) => c.code === "IQD");
    if (iqd && iqd.rate) {
      setExchangeRate(String(iqd.rate * 100));
    } else {
      setExchangeRate("150000");
    }
    setInternalNote("");
    setPrintNote("");
    setShowInvoiceNotes(false);
    setHasDelivery(false);
    setDeliveryName("");
    setDeliveryPhone("");
    setDeliveryCity("");
    setDeliveryAddress("");
    setDeliveryFee("");
    setDeliveryNote("");
    setSavedInvoiceSnapshot("");
    setIsInvoiceLocked(false);
    setOriginalVoucher(null);
    setAccountId(undefined);
    setAccountSearch("");
    setShowAccountInfo(false);
    setIsTemporaryCustomer(false);
    setTempCustomerName("");
    setTempCustomerPhone("");
    setTempCustomerAddress("");
  }

  function handleNewInvoice() {
    if (hasUnsavedInvoiceData() && !isInvoiceSaved && !isInvoiceLocked) {
      showToast("پسوڵەکەت خەزن نەکردووە! یەکەم جار خەزنی بکە یان داتاکان بسڕەوە.", "info");
      return;
    }

    resetInvoice();
  }

  function saveVoucher(action: "keep_credit" | "cross_deduct" | null) {
    if (isInvoiceLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);

    setExcessModalConfig(null);

    let mappedType = "sales";
    if (invoiceType === "کڕین") mappedType = "purchase";
    else if (invoiceType === "گەڕانەوەی فرۆشتن") mappedType = "sales_return";
    else if (invoiceType === "گەڕانەوەی کڕین") mappedType = "purchase_return";
    else if (invoiceType === "نرخاندن") mappedType = "quotation";

    const rate = (toNumber(exchangeRate) / 100) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (selectedAccount ? getSingleAccountBalanceCurrencyId(selectedAccount) : 1);
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
      type: mappedType,
      netAmount: total,
      currencyId: invoiceCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === invoiceCurrencyId) ? 1 : rate
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
      type: mappedType,
      referenceNo: String(invoiceNumber),
      date: combineDateAndTime(invoiceDate, createdTime),
      accountId: isTemporaryCustomer ? null : (accountId || null),
      cashboxId: cashboxId || null,
      currencyId: invoiceCurrencyId,
      exchangeRate: rate,
      totalAmount: itemsSubtotal,
      totalDiscount: invoiceDiscountAmount,
      netAmount: total,
      internalNote: internalNote,
      printNote: printNote,
      employeeName: employeeName || "کۆساری مەلا فەرهاد",
      hasDelivery: hasDelivery,
      driverName: deliveryName || null,
      driverPhone: deliveryPhone || null,
      deliveryCity: deliveryCity || null,
      deliveryAddress: deliveryAddress || null,
      deliveryFee: (hasDelivery && deliveryFee.trim()) ? toNumber(deliveryFee) : null,
      lines: rows.map((row: any) => {
        const warehouseId = warehouses.find((w: any) => w.name === row.warehouseName)?.id || warehouses[0]?.id || 1;
        return {
          productId: row.productId,
          qty: toNumber(row.qty) * row.packageQuantity,
          unitPrice: toNumber(row.price),
          discountPercent: row.discountMode === "percent" ? toNumber(row.discountValue) : 0,
          discountAmount: getRowDiscountAmount(row),
          lineTotal: getRowTotal(row),
          note: row.note,
          warehouseId,
          unitCost: toNumber(row.costPrice || 0),
        };
      }),
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === invoiceCurrencyId) ? 1 : rate
      })),
      ledgerEntries: result.ledgerEntries,
      extraPaymentHandling: extraHandling,
      temporaryCustomer: isTemporaryCustomer ? {
        name: tempCustomerName,
        phone: tempCustomerPhone,
        address: tempCustomerAddress
      } : undefined
    };

    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise.then((res) => {
      setIsSaving(false);
      if (res && !res.error) {
        setSavedInvoiceSnapshot(currentInvoiceSnapshot);
        if (editId) {
          // In edit mode: don't lock, allow further edits
          showToast("پسوڵەکە نوێکرایەوە ✅", "success");
        } else {
          setIsInvoiceLocked(true);
          showToast("پسوڵەکە خەزن کرا ✅ ئەم پسوڵەیە ئیتر قوفڵ کرا.", "success");
        }
      } else {
        const errorMsg = res?.error || "هەڵە لە خەزنکردن! تکایە دووبارە هەوڵ بدەوە.";
        showToast(errorMsg, "error");
      }
    }).catch((err) => {
      setIsSaving(false);
      console.error("Save error:", err);
      showToast("هەڵەی نەتۆرک! تکایە دووبارە هەوڵ بدەوە.", "error");
    });
  }

  function handleSaveInvoice() {
    if (isInvoiceLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    if (rows.length === 0) {
      showToast("تکایە لانیکەم یەک کەرەستە زیاد بکە.");
      return;
    }

    if (!validateStockBeforeSave()) return;

    if (!accountId && !isTemporaryCustomer) {
      showToast("پسوڵە نابێت بێ هەژمار خەزن بکرێت.");
      return;
    }

    if (isTemporaryCustomer) {
      if (!tempCustomerName.trim()) {
        showToast("تکایە ناوی کڕیاری کاتی بنووسە.");
        return;
      }

      if (remaining > 0) {
        showToast(
          "پسوڵەی کڕیاری کاتی دەبێت تەواوی پارەکەی درابێت، نابێت ماوەی هەبێت."
        );
        return;
      }
    }

    let mappedType = "sales";
    if (invoiceType === "کڕین") mappedType = "purchase";
    else if (invoiceType === "گەڕانەوەی فرۆشتن") mappedType = "sales_return";
    else if (invoiceType === "گەڕانەوەی کڕین") mappedType = "purchase_return";
    else if (invoiceType === "نرخاندن") mappedType = "quotation";

    const rate = (toNumber(exchangeRate) / 100) || 1500;
    const activeTargetCurrencyId = targetCurrencyId || (selectedAccount ? getSingleAccountBalanceCurrencyId(selectedAccount) : 1);
    const before = accountBalanceBeforeByCurrency;

    const paidList = Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x: any) => x.amount > 0);

    // If temporary customer, skip excess checking
    if (isTemporaryCustomer || !selectedAccount) {
      saveVoucher(null);
      return;
    }

    const result = calculateLedgerEntries({
      type: mappedType,
      netAmount: total,
      currencyId: invoiceCurrencyId,
      exchangeRate: rate,
      paidAmounts: paidList.map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === invoiceCurrencyId) ? 1 : rate
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

  function toggleColumn(key: keyof TableColumns) {
    setTableColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function togglePrintOption(key: keyof PrintOptions) {
    setPrintOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handlePrint() {
    if (rows.length === 0) {
      showToast("هیچ کەرەستەیەک لە پسوڵەکەدا نییە.");
      return;
    }

    if (!editId && !isInvoiceSaved) {
      showToast("پێش پرێنتکردن دەبێت پسوڵەکە خەزن بکەیت.");
      return;
    }

    setTimeout(() => window.print(), 100);
  }

  const lockedFieldStyle: CSSProperties = isInvoiceLocked
    ? { background: "#f3f4f6", cursor: "not-allowed" }
    : {};

  const dynamicThStyle: CSSProperties = {
    ...printTh,
    ...(activeTemplate?.tableHeaderBg ? { backgroundColor: activeTemplate.tableHeaderBg } : {}),
    ...(activeTemplate?.tableHeaderColor ? { color: activeTemplate.tableHeaderColor } : {}),
  };

  let hideZero = false;
  let primaryCode = "USD";
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        hideZero = !!parsed.hideZeroBalance;
        if (parsed.primaryCurrency) primaryCode = parsed.primaryCurrency;
      } catch (e) {}
    }
  }

  const getCurrencyBalancesList = (balanceMap: Record<string, number>) => {
    const list = Object.entries(balanceMap || {}).map(([curIdText, val]) => {
      const curId = Number(curIdText);
      const currency = currencies.find((c: any) => c.id === curId);
      const code = currency?.code || "USD";
      const formatted = formatCurrencyAmount(val, curId);
      return { val, code, formatted };
    });

    const filtered = list.filter(item => !hideZero || Math.abs(item.val) > 0.01);

    if (filtered.length === 0) {
      const primaryCurId = currencies.find((c: any) => c.code === primaryCode)?.id || 1;
      filtered.push({
        val: 0,
        code: primaryCode,
        formatted: formatCurrencyAmount(0, primaryCurId)
      });
    }

    return filtered;
  };

  const prevBalances = getCurrencyBalancesList(accountBalanceBeforeByCurrency);
  const newBalances = getCurrencyBalancesList(accountBalanceAfterByCurrency);

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
          <div style={sideHeader}>
            <label style={tempCustomerCheck} title="کڕیاری کاتی">
              <input
                type="checkbox"
                checked={isTemporaryCustomer}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;

                  const checked = e.target.checked;
                  setIsTemporaryCustomer(checked);

                  if (checked) {
                    setAccountId(undefined);
                    setAccountSearch("");
                    setShowAccountInfo(false);
                  } else {
                    setTempCustomerName("");
                    setTempCustomerPhone("");
                    setTempCustomerAddress("");
                  }
                }}
              />
            </label>

            <div style={{ flex: 1 }}>
              <label style={labelStyle}>هەژمار</label>

              <div style={{ position: "relative", width: "100%" }}>
                <input
                  value={accountSearch}
                  disabled={isTemporaryCustomer || isInvoiceLocked}
                  onFocus={() => {
                    if (!isInvoiceLocked) setShowAccountList(true);
                  }}
                  onChange={(e) => {
                    if (blockIfLocked()) return;

                    setAccountSearch(e.target.value);
                    setAccountId(undefined);
                    setShowAccountList(true);
                    setShowAccountInfo(false);
                  }}
                  placeholder="هەژمار"
                  style={{
                    ...input,
                    paddingLeft: accountId ? 36 : 14,
                    ...(isTemporaryCustomer || isInvoiceLocked
                      ? { background: "#f3f4f6", cursor: "not-allowed" }
                      : {}),
                  }}
                />

                {accountId && !isInvoiceLocked && !isTemporaryCustomer && (
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "1px solid #fecaca",
                      background: "#fee2e2",
                      color: "#dc2626",
                      fontSize: 16,
                      fontWeight: 900,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 5,
                      padding: 0,
                    }}
                    onClick={() => {
                      if (blockIfLocked()) return;
                      setAccountId(undefined);
                      setAccountSearch("");
                      setShowAccountInfo(false);
                    }}
                  >
                    ×
                  </button>
                )}

                {!isTemporaryCustomer && showAccountList && !isInvoiceLocked && (
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
          </div>
        </div>

          {isTemporaryCustomer && (
            <div style={tempCustomerBox}>
              <input
                value={tempCustomerName}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setTempCustomerName(e.target.value);
                }}
                placeholder="ناو"
                style={{ ...input, ...lockedFieldStyle }}
              />

              <input
                value={tempCustomerPhone}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setTempCustomerPhone(e.target.value);
                }}
                placeholder="ژمارە تەلەفۆن"
                style={{ ...input, ...lockedFieldStyle }}
              />

              <input
                value={tempCustomerAddress}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setTempCustomerAddress(e.target.value);
                }}
                placeholder="ناونیشان"
                style={{ ...input, ...lockedFieldStyle }}
              />
            </div>
          )}

          {selectedAccount && activeBalances.length > 1 && !isInvoiceLocked && (
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

          {selectedAccount && !isTemporaryCustomer && (
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

          {selectedAccount && showAccountInfo && !isTemporaryCustomer && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری هەژمار</div>

              <InfoRow label="جۆری هەژمار">
                {getAccountTypeName(selectedAccount.accountTypeId)}
              </InfoRow>

              <InfoRow label="ژمارەی تەلەفۆن">
                {selectedAccount.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{selectedAccount.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {selectedAccount.address || "-"}
              </InfoRow>

              <InfoRow label="سنووری قەرز">
                {selectedAccount.creditLimit || 0}{" "}
                {getCurrencySymbol(selectedAccount.creditLimitCurrencyId)}
              </InfoRow>

              <InfoRow label="قەرز">
                {formatCurrencyMapWithColors(screenAccountBalanceBeforeByCurrency)}
              </InfoRow>

              <InfoRow label="ئاگاداری دواکەوتن">
                {selectedAccount.debtAlertDays
                  ? `${selectedAccount.debtAlertDays} ڕۆژ`
                  : "-"}
              </InfoRow>

              <InfoRow label="کەفیل">
                {selectedAccount.guarantorName || "-"}
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="گشتی"
                value={formatMoneyJSX(total)}
                color="#16a34a"
              />
              <StatBox
                title="کۆی ماوەی ئەم پسووڵە"
                value={formatMoneyJSX(remaining)}
              />
            </div>

            <Field label="قاسە">
              <select
                value={cashboxId || ""}
                disabled={isInvoiceLocked}
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
                disabled={isInvoiceLocked}
                onChange={(val) => {
                  if (blockIfLocked()) return;
                  setInvoiceDate(val);
                }}
                style={{ ...input, ...lockedFieldStyle }}
              />
            </Field>

            <div style={discountToggleBox}>
              <button
                type="button"
                disabled={isInvoiceLocked}
                style={{
                  ...noteToggleBtn,
                  opacity: isInvoiceLocked ? 0.55 : 1,
                  cursor: isInvoiceLocked ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  if (blockIfLocked()) return;
                  setShowInvoiceDiscount((prev) => !prev);
                }}
              >
                {showInvoiceDiscount
                  ? "▲ شاردنەوەی داشکاندن"
                  : "▼ داشکاندنی سەر پسوڵە"}
              </button>

              {showInvoiceDiscount && (
                <div style={discountInsidePayment}>
                  <div style={twoCol}>
                    <select
                      value={invoiceDiscountMode}
                      disabled={isInvoiceLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setInvoiceDiscountMode(e.target.value as DiscountMode);
                      }}
                      style={{ ...input, ...lockedFieldStyle }}
                    >
                      <option value="amount">بڕ</option>
                      <option value="percent">%</option>
                    </select>

                    <FormattedNumberInput
                      value={invoiceDiscountValue}
                      disabled={isInvoiceLocked}
                      onChange={(val) => {
                        if (blockIfLocked()) return;
                        setInvoiceDiscountValue(val);
                      }}
                      placeholder="0"
                      style={{ ...input, ...lockedFieldStyle }}
                    />
                  </div>
                </div>
              )}
            </div>

            
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {currencies.filter((c: any) => c.id === paidCurrencyId || (paidAmounts[c.id] && paidAmounts[c.id].trim() !== "" && parseFloat(paidAmounts[c.id]) !== 0)).map((currency: any) => {
                const isCurrent = currency.id === paidCurrencyId;
                const showRate = paidCurrencyId !== invoiceCurrencyId || getPaidCurrencies().some(x => x.currencyId !== invoiceCurrencyId);
                const isConverted = showRate && currency.id !== invoiceCurrencyId;

                const amountInput = (
                  <Field label={isCurrent ? "پارەی دراو" : `پارەی دراو (${currency.name})`}>
                    <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", width: "100%" }}>
                      <select
                        value={currency.id}
                        disabled={isInvoiceLocked}
                        onChange={(e) => setPaidCurrencyId(Number(e.target.value))}
                        style={{ border: "none", borderLeft: "1px solid #d1d5db", background: "#f8fafc", padding: "0 12px", outline: "none", fontWeight: "bold", color: "#1e293b", cursor: isInvoiceLocked ? "not-allowed" : "pointer", minWidth: "90px" }}
                      >
                        {currencies.map((curr: any) => (
                          <option key={curr.id} value={curr.id}>
                            {curr.name}
                          </option>
                        ))}
                      </select>

                      <FormattedNumberInput
                        value={paidAmounts[currency.id] || ""}
                        disabled={isInvoiceLocked}
                        onChange={(val) => updatePaidAmount(currency.id, val)}
                        placeholder="0"
                        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 12px", background: isInvoiceLocked ? "#f3f4f6" : "#fff", cursor: isInvoiceLocked ? "not-allowed" : "text", textAlign: "left" }}
                      />

                      <span style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#475569", fontSize: "13px" }}>
                        {currency.name}
                      </span>
                    </div>
                  </Field>
                );

                const rateInput = isConverted ? (
                  <Field label="ڕەیتی 100 دۆلار">
                    <div style={{ display: "flex", border: "1px solid #93c5fd", borderRadius: 8, overflow: "hidden", background: "#f0f9ff" }}>
                      <FormattedNumberInput
                        value={exchangeRate}
                        disabled={isInvoiceLocked}
                        onChange={(val) => {
                          if (blockIfLocked()) return;
                          setExchangeRate(val);
                        }}
                        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 10px", background: "transparent", cursor: isInvoiceLocked ? "not-allowed" : "text", color: "#1e40af", fontWeight: "bold" }}
                      />
                      <span style={{ border: "none", borderRight: "1px solid #bfdbfe", background: "#e0f2fe", padding: "0 8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#0369a1", fontSize: "12px", minWidth: "45px" }}>
                        دینار
                      </span>
                    </div>
                  </Field>
                ) : null;

                return (
                  <div key={currency.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 200px" }}>
                      {amountInput}
                    </div>
                    {rateInput && (
                      <div style={{ flex: "1 1 145px", minWidth: "145px" }}>
                        {rateInput}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>


            {getPaidCurrencies().length > 0 && (
              <div style={paidSummaryBox}>
                <strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>پارەی دراو:</strong>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  {getPaidCurrencies().map((item: any) => {
                    const cur = currencies.find((c: any) => c.id === item.currencyId);
                    return (
                      <div key={item.currencyId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 12px" }}>
                        <span style={{ fontWeight: 700, color: "#374151", fontSize: 13 }}>{cur?.name || "دراو"} ({cur?.symbol || ""})</span>
                        <span style={{ fontWeight: 900, color: "#16a34a", fontSize: 16 }}>{Number(item.amount).toLocaleString("en-US")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



            <div style={noteToggleBox}>
              <button
                type="button"
                disabled={isInvoiceLocked}
                style={{
                  ...noteToggleBtn,
                  opacity: isInvoiceLocked ? 0.55 : 1,
                  cursor: isInvoiceLocked ? "not-allowed" : "pointer",
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
                      disabled={isInvoiceLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setInternalNote(e.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                      placeholder="تێبینی ناوخۆیی..."
                    />
                  </Field>

                  <Field label="تێبینی بۆ چاپ / بۆ کڕیار">
                    <textarea
                      value={printNote}
                      disabled={isInvoiceLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setPrintNote(e.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                      placeholder="تێبینی چاپ..."
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
                opacity: (isInvoiceLocked || (!!editId && isInvoiceSaved) || isSaving) ? 0.55 : 1,
                cursor: (isInvoiceLocked || (!!editId && isInvoiceSaved) || isSaving) ? "not-allowed" : "pointer",
              }}
              onClick={handleSaveInvoice}
              disabled={isInvoiceLocked || (!!editId && isInvoiceSaved) || isSaving}
            >
              {isSaving ? "چاوەڕوان بە..." : isInvoiceLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}
            </button>

            <button style={outlineBlueBtn} onClick={handlePrint}>
              پرێنتکردن
            </button>

            <button style={outlineBlueBtn} onClick={() => setShowSettings(true)}>
              ڕێکخستن
            </button>
          </div>

          {!isInvoiceSaved && rows.length > 0 && !isInvoiceLocked && (
            <div style={unsavedNotice}>{editId ? "ئەم پسووڵەیە نوێ نەکراوەتەوە." : "ئەم پسووڵەیە هێشتا خەزن نەکراوە."}</div>
          )}

          {isInvoiceLocked && (
            <div style={lockedNotice}>
              پسوڵەکە قوفڵ کراوە؛ تەنها ڕێکخستن، پرێنت و پسوڵەی نوێ کار دەکات.
            </div>
          )}

          {isInvoiceSaved && !isInvoiceLocked && (
            <div style={savedNotice}>پسوڵەکە خەزن کراوە و ئامادەی پرێنتە.</div>
          )}
        </aside>

        <main style={mainContent}>
          <div style={headerCard}>
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>{invoiceType}</h2>}
            <div style={currentPriceTypeBadge}>جۆری نرخ: {invoicePriceType}</div>
          </div>

          <div style={tableCard}>
            <div style={productSearchBox}>
              <input
                value={productSearch}
                disabled={isInvoiceLocked}
                onFocus={() => {
                  if (!isInvoiceLocked) setShowProductList(true);
                }}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setProductSearch(e.target.value);
                  setShowProductList(true);
                }}
                placeholder="کەرەستە / ناو، کۆد، بارکۆد تایپ بکە..."
                style={{ ...input, ...lockedFieldStyle }}
              />

              {showProductList && !isInvoiceLocked && (
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
                    {tableColumns.product && <th style={th}>کەرەستە</th>}
                    {tableColumns.code && <th style={th}>کۆد</th>}
                    {tableColumns.qty && <th style={th}>عەدد</th>}
                    {tableColumns.price && <th style={th}>نرخ</th>}
                    {tableColumns.discount && <th style={th}>داشکاندن</th>}
                    {tableColumns.total && <th style={th}>کۆی گشتی</th>}
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
                              id={`product-name-${row.id}`}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDetailCoords({
                                  top: rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                });
                                setOpenedDetailRowId(
                                  openedDetailRowId === row.id ? null : row.id
                                );
                              }}
                              style={productNameBlock}
                            >
                              <strong>{row.productName}</strong>
                              <div style={smallMuted}>
                                {row.packageName} / {row.warehouseName} /{" "}
                                {row.priceType}
                              </div>

                              {row.note && <div style={itemNote}>{row.note}</div>}
                            </div>

                            {openedDetailRowId === row.id && (
                              <>
                                {/* Backdrop */}
                                <div
                                  style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    width: "100vw",
                                    height: "100vh",
                                    background: "rgba(0, 0, 0, 0.01)",
                                    zIndex: 9998,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenedDetailRowId(null);
                                  }}
                                />
                                <div
                                  style={{
                                    ...detailPanel,
                                    position: "fixed",
                                    top: detailCoords?.top ?? "10%",
                                    right: detailCoords?.right ?? "24px",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div style={detailTitle}>{row.productName}</div>

                                <div style={detailGrid}>
                                  <DetailField label="پێچانەوە">
                                    <select
                                      value={row.packageName}
                                      disabled={isInvoiceLocked}
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
                                  </DetailField>

                                  <DetailField label="کۆگا">
                                    <select
                                      value={row.warehouseName}
                                      disabled={isInvoiceLocked}
                                      onChange={(e) => {
                                        const nextWhName = e.target.value;
                                        const nextAvail = getRowAvailableQty(row.productId, nextWhName);
                                        updateRow(row.id, {
                                          warehouseName: nextWhName,
                                          availableQty: nextAvail,
                                        });
                                      }}
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
                                  </DetailField>

                                  <DetailField label="بەردەست">
                                    <div style={compactReadonlyBox}>
                                      {availableText(row)}
                                    </div>
                                  </DetailField>

                                  <DetailField label="کۆست">
                                    {row.showCost ? (
                                      <div style={compactReadonlyBox}>
                                        {formatMoney(
                                          row.costPrice || 0,
                                          getCurrencySymbol(row.currencyId)
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        style={{
                                          ...showCostBtn,
                                          opacity: isInvoiceLocked ? 0.45 : 1,
                                          cursor: isInvoiceLocked
                                            ? "not-allowed"
                                            : "pointer",
                                          fontSize: "11px",
                                          padding: "4px 8px",
                                          height: "26px",
                                        }}
                                        disabled={isInvoiceLocked}
                                        onClick={() =>
                                          updateRow(row.id, { showCost: true })
                                        }
                                      >
                                        پیشاندان
                                      </button>
                                    )}
                                  </DetailField>

                                  <DetailField label="جۆری نرخ">
                                    <select
                                      value={row.priceType}
                                      disabled={isInvoiceLocked}
                                      onChange={(e) =>
                                        changeRowPriceType(row, e.target.value)
                                      }
                                      style={{
                                        ...compactInput,
                                        ...lockedFieldStyle,
                                      }}
                                    >
                                      {priceTypes.map((type: any) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                  </DetailField>

                                  <DetailField label="دراو">
                                    <select
                                      value={row.currencyId}
                                      disabled={isInvoiceLocked}
                                      onChange={(e) =>
                                        changeRowCurrency(
                                          row,
                                          Number(e.target.value)
                                        )
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
                                  </DetailField>

                                  <DetailField label="نرخی فرۆشتن">
                                    <FormattedNumberInput
                                      value={row.price}
                                      disabled={isInvoiceLocked}
                                      onChange={(val) =>
                                        updateRow(row.id, {
                                          price: val,
                                        })
                                      }
                                      style={{
                                        ...compactInput,
                                        ...lockedFieldStyle,
                                      }}
                                    />
                                  </DetailField>

                                  <DetailField label="نرخی پێشوو">
                                    <div style={compactReadonlyBox}>
                                      {row.previousPrice !== undefined
                                        ? formatMoney(
                                            row.previousPrice,
                                            getCurrencySymbol(row.currencyId)
                                          )
                                        : "نییە"}
                                    </div>
                                  </DetailField>
                                </div>

                                <div style={{ marginTop: 6 }}>
                                  <DetailField label="تێبینی">
                                    <input
                                      type="text"
                                      value={row.note}
                                      disabled={isInvoiceLocked}
                                      onChange={(e) =>
                                        updateRow(row.id, {
                                          note: e.target.value,
                                        })
                                      }
                                      style={{
                                        ...compactInput,
                                        ...lockedFieldStyle,
                                      }}
                                      placeholder="تێبینی..."
                                    />
                                  </DetailField>
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
                            </>
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
                              disabled={isInvoiceLocked}
                              onChange={(e) => updateRowQty(row, e.target.value)}
                              inputMode="decimal"
                              lang="en"
                              dir="ltr"
                              style={{ ...smallInput, ...lockedFieldStyle }}
                            />
                          </td>
                        )}

                        {tableColumns.price && (
                          <td style={tdCenter}>
                            <FormattedNumberInput
                              value={row.price}
                              disabled={isInvoiceLocked}
                              onChange={(val) =>
                                updateRow(row.id, {
                                  price: val,
                                })
                              }
                              style={{ ...smallInput, ...lockedFieldStyle }}
                            />
                          </td>
                        )}

                        {tableColumns.discount && (
                          <td style={tdCenter}>
                            <div style={discountCell}>
                              <select
                                value={row.discountMode}
                                disabled={isInvoiceLocked}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    discountMode: e.target.value as DiscountMode,
                                  })
                                }
                                style={{ ...miniSelect, ...lockedFieldStyle }}
                              >
                                <option value="amount">بڕ</option>
                                <option value="percent">%</option>
                              </select>

                              <FormattedNumberInput
                                value={row.discountValue}
                                disabled={isInvoiceLocked}
                                onChange={(val) =>
                                  updateRow(row.id, {
                                    discountValue: val,
                                  })
                                }
                                style={{ ...miniInput, ...lockedFieldStyle }}
                              />
                            </div>
                          </td>
                        )}

                        {tableColumns.total && (
                          <td style={tdCenter}>
                            <strong>
                              {formatMoneyJSX(
                                getRowNetTotalInRowCurrency(row),
                                getCurrencySymbol(row.currencyId)
                              )}
                            </strong>
                          </td>
                        )}

                        {tableColumns.action && (
                          <td style={tdCenter}>
                            <button
                              style={{
                                ...deleteBtn,
                                opacity: isInvoiceLocked ? 0.45 : 1,
                                cursor: isInvoiceLocked
                                  ? "not-allowed"
                                  : "pointer",
                              }}
                              disabled={isInvoiceLocked}
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

          <div style={sectionCard}>
            <label style={checkboxRow}>
              <input
                type="checkbox"
                checked={hasDelivery}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setHasDelivery(e.target.checked);
                }}
              />
              دلیڤەری هەیە؟
            </label>

            {hasDelivery && (
              <div style={deliveryGrid}>
                <Field label="ناوی شۆفێر / دلیڤەری">
                  <input
                    value={deliveryName}
                    disabled={isInvoiceLocked}
                    onChange={(e) => {
                      if (blockIfLocked()) return;
                      setDeliveryName(e.target.value);
                    }}
                    style={{ ...input, ...lockedFieldStyle }}
                  />
                </Field>

                <Field label="ژمارەی تەلەفۆن">
                  <input
                    value={deliveryPhone}
                    disabled={isInvoiceLocked}
                    onChange={(e) => {
                      if (blockIfLocked()) return;
                      setDeliveryPhone(e.target.value);
                    }}
                    style={{ ...input, ...lockedFieldStyle }}
                  />
                </Field>

                <Field label="شار">
                  <input
                    value={deliveryCity}
                    disabled={isInvoiceLocked}
                    onChange={(e) => {
                      if (blockIfLocked()) return;
                      setDeliveryCity(e.target.value);
                    }}
                    style={{ ...input, ...lockedFieldStyle }}
                  />
                </Field>

                <Field label="ناونیشان">
                  <input
                    value={deliveryAddress}
                    disabled={isInvoiceLocked}
                    onChange={(e) => {
                      if (blockIfLocked()) return;
                      setDeliveryAddress(e.target.value);
                    }}
                    style={{ ...input, ...lockedFieldStyle }}
                  />
                </Field>

                <Field label="کرێی دلیڤەری (دینار)">
                  <FormattedNumberInput
                    value={deliveryFee}
                    disabled={isInvoiceLocked}
                    onChange={(val) => {
                      if (blockIfLocked()) return;
                      setDeliveryFee(val);
                    }}
                    style={{ ...input, ...lockedFieldStyle }}
                  />
                </Field>

                <Field label="تێبینی دلیڤەری">
                  <input
                    value={deliveryNote}
                    disabled={isInvoiceLocked}
                    onChange={(e) => {
                      if (blockIfLocked()) return;
                      setDeliveryNote(e.target.value);
                    }}
                    style={{ ...input, ...lockedFieldStyle }}
                  />
                </Field>
              </div>
            )}
          </div>

          <div style={summaryCard}>
            <SummaryItem label="کۆی کەرەستەکان" value={`${itemCount}`} />

            {invoiceDiscountAmount > 0 && (
              <SummaryItem
                label="داشکاندن"
                value={formatMoneyJSX(invoiceDiscountAmount)}
              />
            )}

            {hasDelivery && deliveryFee.trim() && deliveryFeeAmount > 0 && (
              <SummaryItem
                label="کرێی دلیڤەری"
                value={formatMoneyJSX(deliveryFeeAmount)}
              />
            )}

            <SummaryItem
              label="کۆی گشتی پسوڵە"
              value={formatMoneyJSX(total)}
              strong
            />
            <SummaryItem label="پارەی دراو" value={getPaidSummaryTextJSX()} />
            <SummaryItem label="ماوە" value={formatMoneyJSX(remaining)} strong />
          </div>
        </main>
      </div>

      <div id="invoice-print-area" style={printArea}>
        <div style={{
          ...printPage,
          ...(activeTemplate?.watermarkImage ? {
            backgroundImage: `url(${activeTemplate.watermarkImage})`,
            backgroundSize: "300px 300px",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          } : {})
        }}>
          <PrintWatermark />
          <PrintHeader />

                    {(printOptions.showInvoiceInfo || printOptions.showAccountInfo) && (
            <div style={printInfoGrid}>
              {/* Right Column: Invoice Info Box */}
              {printOptions.showInvoiceInfo ? (
                <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                  <PrintInfoLine label="جۆری پسوڵە" value={invoiceType} />
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
                </div>
              ) : (
                <div />
              )}

              {/* Left Column: Stack of Account Info & Employee Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {printOptions.showAccountInfo && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                    <PrintInfoLine
                      label={isTemporaryCustomer ? "کڕیار" : "هەژمار"}
                      value={
                        isTemporaryCustomer
                          ? tempCustomerName || "-"
                          : selectedAccount?.name || "-"
                      }
                    />
                    <PrintInfoLine
                      label="ژمارەی تەلەفۆن"
                      value={
                        isTemporaryCustomer
                          ? tempCustomerPhone || "-"
                          : selectedAccount?.phone || "-"
                      }
                    />
                    <PrintInfoLine
                      label="ناونیشان"
                      value={
                        isTemporaryCustomer
                          ? tempCustomerAddress || "-"
                          : [selectedAccount?.city, selectedAccount?.address]
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
                <th style={dynamicThStyle}>#</th>
                <th style={dynamicThStyle}>کەرەستە</th>
                {printOptions.showCode && <th style={dynamicThStyle}>کۆد</th>}
                <th style={dynamicThStyle}>عەدد</th>
                <th style={dynamicThStyle}>نرخ</th>
                {printOptions.showDiscount &&
                  rows.some((r) => getRowDiscountAmount(r) > 0) && (
                    <th style={dynamicThStyle}>داشکاندن</th>
                  )}
                {printOptions.showPriceType && (
                  <th style={dynamicThStyle}>جۆری نرخ</th>
                )}
                <th style={dynamicThStyle}>کۆ</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td style={printTd}>{index + 1}</td>

                  <td style={printTdWide}>
                    <div>{row.productName}</div>

                    {printOptions.showNotes && row.note && (
                      <div style={printSmallNote}>{row.note}</div>
                    )}
                  </td>

                  {printOptions.showCode && (
                    <td style={printTd}>{row.code || "-"}</td>
                  )}

                  <td style={printTd}>
                    {row.qty} {row.packageName}
                  </td>

                  <td style={printTd}>
                    {formatMoney(
                      toNumber(row.price),
                      getCurrencySymbol(row.currencyId)
                    )}
                  </td>

                  {printOptions.showDiscount &&
                    rows.some((r) => getRowDiscountAmount(r) > 0) && (
                      <td style={printTd}>
                        {getRowDiscountAmount(row) > 0
                          ? formatMoney(
                              getRowDiscountAmount(row),
                              getCurrencySymbol(row.currencyId)
                            )
                          : ""}
                      </td>
                    )}

                  {printOptions.showPriceType && (
                    <td style={printTd}>{row.priceType}</td>
                  )}

                  <td style={printTd}>
                    {formatMoney(
                      getRowNetTotalInRowCurrency(row),
                      getCurrencySymbol(row.currencyId)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={printBottomGrid}>
            {/* Left Box: Account Balances */}
            {printOptions.showPrintBalance && !isTemporaryCustomer && selectedAccount && (
              <div style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "10px 14px",
                background: "white",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxSizing: "border-box",
                justifyContent: "space-between",
                fontSize: "12px"
              }}>
                {/* Previous Debt (قەرزی پێشوو) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  {/* Left: Stack of currency values */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left", fontWeight: "bold" }}>
                    {prevBalances.map((b, i) => (
                      <span key={i} style={{ color: b.val > 0.01 ? "#dc2626" : "#1e293b", fontFamily: "monospace" }}>
                        {b.formatted}
                      </span>
                    ))}
                  </div>
                  {/* Right: Label */}
                  <span style={{ fontWeight: "bold", color: "#374151" }}>قەرزی پێشوو</span>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: 0 }} />

                {/* New Debt (کۆی گشتی قەرز) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  {/* Left: Stack of currency values */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left", fontWeight: "bold" }}>
                    {newBalances.map((b, i) => (
                      <span key={i} style={{ color: b.val > 0.01 ? "#dc2626" : "#1e293b", fontFamily: "monospace" }}>
                        {b.formatted}
                      </span>
                    ))}
                  </div>
                  {/* Right: Label */}
                  <span style={{ fontWeight: "bold", color: "#374151" }}>کۆی گشتی قەرز</span>
                </div>
              </div>
            )}

            {/* Right Box: Invoice Totals */}
            <div style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              background: "white",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxSizing: "border-box",
              fontSize: "12px",
              justifyContent: "center"
            }}>
              <PrintSummaryLine
                label="کۆی گشتی"
                value={formatMoney(total)}
                bold
              />

              {invoiceDiscountAmount > 0 && (
                <PrintSummaryLine
                  label="داشکاندن"
                  value={formatMoney(invoiceDiscountAmount)}
                />
              )}

              {hasDelivery && printOptions.showDelivery && deliveryFeeAmount > 0 && (
                <PrintSummaryLine
                  label="کرێی دلیڤەری"
                  value={formatMoney(deliveryFeeAmount)}
                />
              )}

              {getPaidSummaryText() !== "0" && (
                <PrintSummaryLine
                  label="پارەی دراو"
                  value={getPaidSummaryText()}
                />
              )}

              <PrintSummaryLine
                label="ماوە"
                value={formatMoney(remaining)}
                bold
              />

              {printOptions.showDelivery && hasDelivery && (
                <div style={{ marginTop: 8, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                  <PrintSummaryLine
                    label="ناوی دلیڤەری"
                    value={deliveryName || "-"}
                  />
                  <PrintSummaryLine label="ژمارە" value={deliveryPhone || "-"} />
                  <PrintSummaryLine
                    label="ناونیشانی دلیڤەری"
                    value={
                      [deliveryCity, deliveryAddress].filter(Boolean).join(" - ") ||
                      "-"
                    }
                  />
                </div>
              )}

            </div>
          </div>

          {printOptions.showNotes && printNote && (
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

      {showSettings && (
        <div style={modalOverlay}>
          <div style={settingsModal}>
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
                <h3 style={settingsTitle}>جۆری نرخی ئەم پسوڵەیە</h3>

                <div style={priceTypeBox}>
                  {priceTypes.map((type: any) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInvoicePriceType(type)}
                      style={{
                        ...priceTypeBtn,
                        ...(invoicePriceType === type
                          ? priceTypeBtnActive
                          : {}),
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

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
                    label="جۆری پسوڵە"
                    checked={printOptions.showInvoiceType}
                    onChange={() => togglePrintOption("showInvoiceType")}
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
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری هەژمار</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" }}>
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
                    label="ژمارەی تەلەفۆن"
                    checked={printOptions.showAccountPhone}
                    onChange={() => togglePrintOption("showAccountPhone")}
                  />
                    <SettingCheck
                    label="ناونیشان"
                    checked={printOptions.showAccountAddress}
                    onChange={() => togglePrintOption("showAccountAddress")}
                  />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری کارمەند</h4>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8, backgroundColor: "#f9fafb", display: "flex", flexDirection: "column", gap: 12 }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
                </div>
              </div>

              <div style={settingsSection}>
                <h3 style={settingsTitle}>کۆڵۆمەکانی ناو پەڕە</h3>

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
                    label="نرخ"
                    checked={tableColumns.price}
                    onChange={() => toggleColumn("price")}
                  />
                  <SettingCheck
                    label="داشکاندن"
                    checked={tableColumns.discount}
                    onChange={() => toggleColumn("discount")}
                  />
                  <SettingCheck
                    label="کۆی گشتی"
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
                <h3 style={settingsTitle}>باڵانسی چاپ</h3>

                <SettingCheck
                  label="باڵانسی پسوڵە پیشان بدرێت"
                  checked={printOptions.showPrintBalance}
                  onChange={() => togglePrintOption("showPrintBalance")}
                />
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

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={detailLabel}>{label}</div>
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
      <div style={{ color, fontWeight: 900, fontSize: 20, marginTop: 6 }}>
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
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div style={summaryItem}>
      <div style={{ color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontWeight: strong ? 900 : 700,
          fontSize: strong ? 20 : 16,
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

  #invoice-print-area,
  #invoice-print-area * {
    visibility: visible !important;
  }

  #invoice-print-area {
    display: block !important;
    position: relative !important;
    width: 100% !important;
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
  padding: "12px 14px",
  height: "100%",
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

const toastError: CSSProperties = {
  background: "#ef4444",
};

const toastSuccess: CSSProperties = {
  background: "#16a34a",
};

const toastInfo: CSSProperties = {
  background: "#2563eb",
};

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
  gridTemplateColumns: "var(--page-grid-cols, 500px 1fr)",
  gap: 12,
  alignItems: "stretch",
};

const leftPanel: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
};

const mainContent: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
};

const sideHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  marginBottom: 12,
};

const tempCustomerCheck: CSSProperties = {
  width: 26,
  height: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 2,
};

const tempCustomerBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  marginBottom: 12,
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
  padding: "5px 8px",
  borderRadius: 7,
  border: "1px solid #cbd5e1",
  fontSize: "12px",
  outline: "none",
  background: "white",
  boxSizing: "border-box",
  fontFamily: appFont,
  height: "30px",
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

const miniSelect: CSSProperties = {
  padding: "9px 6px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "white",
  fontFamily: appFont,
};

const miniInput: CSSProperties = {
  width: 70,
  padding: "9px 6px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  textAlign: "center",
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

const detailLabel: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#4b5563",
  marginBottom: "4px",
  fontFamily: appFont,
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
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "10px 12px",
  marginBottom: 14,
  fontSize: 13,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const infoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "105px 1fr",
  gap: 6,
  padding: "5px 0",
  borderBottom: "1px solid #f1f5f9",
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
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#111827",
};

const noteToggleBox: CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: 10,
};

const discountToggleBox: CSSProperties = {
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

const discountInsidePayment: CSSProperties = {
  marginTop: 12,
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

const savedNotice: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
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
  minWidth: 600,
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

const discountCell: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  justifyContent: "center",
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
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 9999,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  width: "330px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
  maxHeight: "none",
  overflowY: "visible",
};

const detailTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 8,
  color: "#1d4ed8",
  textAlign: "center",
};

const detailGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 8,
};

const compactReadonlyBox: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 7,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  fontWeight: 700,
  fontSize: "12px",
  minHeight: "30px",
  display: "flex",
  alignItems: "center",
};

const showCostBtn: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 7,
  padding: "6px 8px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
  fontSize: 12,
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

const deliveryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  marginTop: 12,
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

const confirmBox: CSSProperties = {
  width: 460,
  maxWidth: "92vw",
  background: "white",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 25px 70px rgba(15,23,42,0.28)",
};

const confirmText: CSSProperties = {
  color: "#475569",
  fontSize: 14,
  margin: "12px 0 20px",
  textAlign: "center",
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

const settingsModal: CSSProperties = {
  width: 760,
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 16,
  padding: 22,
  fontFamily: appFont,
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 12,
  marginBottom: 16,
};

const modalCloseBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "1px solid #d1d5db",
  background: "white",
  fontSize: 20,
  cursor: "pointer",
};

const settingsStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const settingsSection: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#fafafa",
};

const settingsTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 17,
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
};

const modalFooter: CSSProperties = {
  marginTop: 20,
  display: "flex",
  gap: 10,
  justifyContent: "flex-start",
};

const priceTypeBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
};

const priceTypeBtn: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "white",
  borderRadius: 12,
  padding: "12px",
  cursor: "pointer",
  fontWeight: 800,
  fontFamily: appFont,
};

const priceTypeBtnActive: CSSProperties = {
  background: "#2563eb",
  color: "white",
  borderColor: "#2563eb",
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
  border: "1px solid #ffffff",
  background: "#0b5ed7",
  color: "white",
  padding: "6px 5px",
  textAlign: "center",
  fontWeight: 800,
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

const printNoteBox: CSSProperties = {
  marginTop: 8,
  lineHeight: 1.8,
};

const printSectionSmall: CSSProperties = {
  marginBottom: 8,
};
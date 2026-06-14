"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "../../store/store";
import DateInput from "../../components/DateInput";

// TypeScript Interfaces for DB Vouchers & Relations
interface Product {
  id: number;
  name: string;
  code: string | null;
  barcode: string | null;
  costPrice: number | null;
}

interface VoucherLine {
  id: number;
  productId: number;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  note: string | null;
  product: Product;
}

interface VoucherPaidAmount {
  id: number;
  currencyId: number;
  amount: number;
  exchangeRate: number;
  currency: {
    id: number;
    code: string;
    name: string;
    symbol: string;
  };
}

interface VoucherExpense {
  id: number;
  amount: number;
  currencyId: number;
  note: string | null;
}

interface LedgerEntry {
  id: number;
  debit: number;
  credit: number;
  currencyId: number;
  date?: string;
  currency: {
    code: string;
    symbol: string;
  };
}

interface Account {
  id: number;
  name: string;
  accountTypeId: number;
  isShareholder: boolean;
}

interface Cashbox {
  id: number;
  name: string;
}

interface RawVoucher {
  id: number;
  type: string;
  referenceNo: string | null;
  date: string;
  createdAt: string;
  accountId: number | null;
  cashboxId: number | null;
  fromCashboxId: number | null;
  toCashboxId: number | null;
  currencyId: number | null;
  exchangeRate: number;
  totalAmount: number;
  totalDiscount: number;
  netAmount: number;
  internalNote: string | null;
  printNote: string | null;
  hasDelivery: boolean;
  deliveryFee: number | null;
  account: Account | null;
  cashbox: Cashbox | null;
  currency: {
    id: number;
    code: string;
    name: string;
    symbol: string;
  } | null;
  lines: VoucherLine[];
  paidAmounts: VoucherPaidAmount[];
  expenses: VoucherExpense[];
  ledgerEntries: LedgerEntry[];
  employeeName: string | null;
  versions?: any[];
  inventoryTransactions?: Array<{
    productId: number;
    qtyChange: number;
    unitCost: number;
  }>;
}

function InvoiceReportContent() {
  const router = useRouter();

  // Store items
  const {
    accounts,
    accountTypes,
    cashboxes,
    currencies,
    products,
    fetchAccounts,
    fetchAccountTypes,
    fetchCashboxes,
    fetchCurrencies,
    fetchProducts,
  } = useStore();

  // Local state
  const [vouchers, setVouchers] = useState<RawVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [voucherType, setVoucherType] = useState("all");
  const [deleteVoucherId, setDeleteVoucherId] = useState<number | null>(null);

  // Reference for clicking outside dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Date Filters (default: 6 months ago → today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Modal displays
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  const searchParams = useSearchParams();
  const [filterInvoiceType, setFilterInvoiceType] = useState(searchParams.get("type") || "all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active"); // active / all
  const [filterAccountType, setFilterAccountType] = useState("all");
  const [filterAccountId, setFilterAccountId] = useState("all");
  const [filterCashboxId, setFilterCashboxId] = useState("all");
  const [filterInvoiceNo, setFilterInvoiceNo] = useState("");
  const [filterDiscountType, setFilterDiscountType] = useState("all"); // all, discounted, none
  const [filterEmployee, setFilterEmployee] = useState("all"); // employee filter
  const [filterCurrencyId, setFilterCurrencyId] = useState("all"); // currency filter

  // Table Sorting
  const [sortField, setSortField] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Table pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expanded details rows
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Row Action Dropdowns and Comparison Modal States
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedVoucherForVersions, setSelectedVoucherForVersions] = useState<RawVoucher | null>(null);
  const [versionAIndex, setVersionAIndex] = useState<number>(0);
  const [versionBIndex, setVersionBIndex] = useState<number>(0);

  // Visible Columns state (16 columns matching the screenshot)
  const [visibleColumns, setVisibleColumns] = useState({
    invoiceId: true,
    type: true,
    paymentStatus: true,
    account: true,
    total: true,
    discount: true,
    paid: true,
    remaining: true,
    deliveryFee: true,
    expenses: true,
    profit: false,
    cashbox: true,
    offer: false,
    notes: true,
    date: true,
    actions: true,
  });

  // Load dependency data on mount
  useEffect(() => {
    fetchAccounts();
    fetchAccountTypes();
    fetchCashboxes();
    fetchCurrencies();
    fetchProducts();
    loadVouchers();
  }, []);

  // Click listener to close dropdowns when clicking outside
  useEffect(() => {
    const handleCloseDropdowns = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener("click", handleCloseDropdowns);
    return () => window.removeEventListener("click", handleCloseDropdowns);
  }, []);

  // API Call to retrieve complete vouchers
  const loadVouchers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vouchers");
      if (res.ok) {
        const data = await res.json();
        const filtered = (data || []).filter((v: any) => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange" && v.rawType !== "cashbox_transfer" && v.rawType !== "cashbox_exchange");
        setVouchers(filtered);
      }
    } catch (err) {
      console.error("Failed to load vouchers for report page:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async () => {
    if (!deleteVoucherId) return;
    try {
      const res = await fetch(`/api/vouchers/${deleteVoucherId}`, { method: 'DELETE' });
      if (res.ok) {
        setVouchers(vouchers.filter((v) => v.id !== deleteVoucherId));
        setDeleteVoucherId(null);
      } else {
        alert("سڕینەوە سەرکەوتوو نەبوو!");
      }
    } catch (err) {
      console.error(err);
      alert("سڕینەوە سەرکەوتوو نەبوو!");
    }
  };


  // Kurdish mappings for UI types
  const getKurdishType = (type: string) => {
    switch (type) {
      case "sales":
        return "فرۆشتن";
      case "purchase":
        return "کڕین";
      case "money_in":
        return "پارەی هاتوو";
      case "money_out":
        return "پارەی ڕۆشتوو";
      case "expense":
        return "خەرجی";
      case "sales_return":
        return "گەڕانەوەی فرۆشتن";
      case "purchase_return":
        return "گەڕانەوەی کڕین";
      case "cashbox_transfer":
        return "گواستنەوەی پارە";
      case "cashbox_exchange":
        return "گۆڕینەوەی پارە";
      case "shareholder_deposit":
        return "دانانی پارە";
      case "shareholder_withdrawal":
        return "کشانەوەی پارە";
      case "my_debt_discount":
        return "داشکاندن لە قەرزی من";
      case "people_debt_discount":
      case "debt_discount":
      case "debt discount":
        return "داشکاندن لە قەرزی خەڵک";
      default:
        return type;
    }
  };

  // Date Formatting Helper (Day-Month-Year)
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = String(hours).padStart(2, "0");
    
    return `${day}-${month}-${year} ${hourStr}:${minutes} ${ampm}`;
  };

  // Get active system base currency
  const getBaseCurrency = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("systemBaseCurrency");
      if (stored) {
        const found = currencies.find((c: any) => c.code === stored || String(c.id) === stored);
        if (found) return found;
      }
    }
    return currencies.find((c: any) => c.code === "USD") || currencies[0] || { id: 1, code: "USD", symbol: "$" };
  };

  // Helper: Currency conversion utility
  const convertAmount = (amount: number, fromCurrencyId: number | null, targetCode = "USD", rate = 1500) => {
    if (!fromCurrencyId) return amount;
    const currency = currencies.find((c: any) => Number(c.id) === Number(fromCurrencyId));
    if (!currency || currency.code.toUpperCase() === targetCode.toUpperCase()) return amount;

    if (currency.code === "IQD" && targetCode === "USD") return amount / rate;
    if (currency.code === "USD" && targetCode === "IQD") return amount * rate;
    return amount;
  };

  // Robust currency converter between any two currency IDs
  const convertBetweenCurrencies = (amount: number, fromCurrencyId: number | null, toCurrencyId: number | null, rate = 1500) => {
    if (!fromCurrencyId || !toCurrencyId || Number(fromCurrencyId) === Number(toCurrencyId)) return amount;
    const fromCurrency = currencies.find((c: any) => Number(c.id) === Number(fromCurrencyId));
    const toCurrency = currencies.find((c: any) => Number(c.id) === Number(toCurrencyId));
    if (!fromCurrency || !toCurrency || fromCurrency.code.toUpperCase() === toCurrency.code.toUpperCase()) return amount;

    let usdAmount = amount;
    if (fromCurrency.code === "IQD") {
      usdAmount = amount / rate;
    }
    if (toCurrency.code === "IQD") {
      return usdAmount * rate;
    }
    return usdAmount;
  };

  // Format currency dynamically based on original and filter settings
  const formatCurrencyValue = (amount: number, currencyId: number) => {
    const currencyObj = currencies.find((c: any) => c.id === currencyId);
    const formattedNumber = amount.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
    
    if (filterCurrencyId !== "all") {
      if (currencyObj?.code === "USD") {
        return `$ ${formattedNumber}`;
      } else if (currencyObj?.code === "IQD") {
        return `${formattedNumber} د.ع`;
      }
      return `${formattedNumber} ${currencyObj?.symbol || ""}`;
    } else {
      if (currencyObj?.code === "IQD") {
        return `${formattedNumber} دینار`;
      } else if (currencyObj?.code === "USD") {
        return `${formattedNumber} دۆلار`;
      }
      return `${formattedNumber} ${currencyObj?.name || ""}`;
    }
  };

  // Format values in base currency
  const formatBaseCurrency = (val: number) => {
    const baseCurrency = getBaseCurrency();
    const formattedNumber = val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (baseCurrency.code === "USD") {
      return `$ ${formattedNumber}`;
    } else if (baseCurrency.code === "IQD") {
      return `${formattedNumber} دینار`;
    }
    return `${formattedNumber} ${baseCurrency.symbol}`;
  };

  // Dynamic KPI Formatter converting USD to active filtered currency if chosen
  const formatKPI = (valUSD: number) => {
    const baseCurrency = getBaseCurrency();
    const targetCurrency = filterCurrencyId !== "all" 
      ? currencies.find((c: any) => c.id === Number(filterCurrencyId)) 
      : baseCurrency;
    
    const targetCode = targetCurrency ? targetCurrency.code : "USD";
    const targetId = targetCurrency ? targetCurrency.id : 1;
    
    const converted = convertAmount(valUSD, currencies.find((c: any) => c.code === "USD")?.id || 1, targetCode, 1500);
    return formatCurrencyValue(converted, targetId);
  };

  // Multi-currency KPI formatter: when no currency filter is active, show per-currency breakdown
  const formatKPIMultiCurrency = (perCurrencyTotals: Record<number, number>) => {
    if (filterCurrencyId !== "all") {
      // When a specific currency is filtered, sum all in that currency
      const targetId = Number(filterCurrencyId);
      const targetCurrency = currencies.find((c: any) => c.id === targetId);
      const targetCode = targetCurrency?.code || "USD";
      let total = 0;
      Object.entries(perCurrencyTotals).forEach(([curIdStr, amount]) => {
        const curId = Number(curIdStr);
        total += convertBetweenCurrencies(amount, curId, targetId, 1500);
      });
      return <span>{formatCurrencyValue(total, targetId)}</span>;
    }
    
    // When "all" currencies, show each currency separately
    const parts: any[] = [];
    Object.entries(perCurrencyTotals).forEach(([curIdStr, amount]) => {
      const curId = Number(curIdStr);
      if (Math.abs(amount) > 0.01) {
        parts.push(
          <div key={curId} className="text-sm md:text-[15px] font-bold leading-normal">
            {formatCurrencyValue(amount, curId)}
          </div>
        );
      }
    });
    
    if (parts.length === 0) {
      return <span>{formatCurrencyValue(0, currencies.find((c: any) => c.code === "USD")?.id || 1)}</span>;
    }
    return <div className="flex flex-col gap-0.5">{parts}</div>;
  };

  // Helper: Calculate paid sum in original currency, converted to USD
  const getVoucherPaidUSD = (voucher: RawVoucher) => {
    return voucher.paidAmounts.reduce((sum, pa) => {
      const paUSD = convertAmount(pa.amount, pa.currencyId, "USD", voucher.exchangeRate);
      return sum + paUSD;
    }, 0);
  };

  // Helper: Calculate voucher expenses in USD
  const getVoucherExpensesUSD = (voucher: RawVoucher) => {
    return voucher.expenses.reduce((sum, exp) => {
      const expUSD = convertAmount(exp.amount, exp.currencyId, "USD", voucher.exchangeRate);
      return sum + expUSD;
    }, 0);
  };

  // Helper: Calculate cost of goods sold (COGS) in USD
  const getVoucherCostUSD = (voucher: RawVoucher) => {
    if (voucher.type !== "sales") return 0;

    // Use transaction unitCost if available
    if (voucher.inventoryTransactions && voucher.inventoryTransactions.length > 0) {
      return voucher.inventoryTransactions.reduce((sum, tx) => {
        if (tx.qtyChange < 0) {
          return sum + Math.abs(tx.qtyChange) * (tx.unitCost || 0);
        }
        return sum;
      }, 0);
    }

    // Fallback: lookup costPrice from products loaded in store
    return voucher.lines.reduce((sum, line) => {
      const storeProduct = (products || []).find((p: any) => p.id === line.productId);
      const cost = storeProduct?.costPrice || 0;
      return sum + line.qty * cost;
    }, 0);
  };

  // Helper: Calculate net profit in base currency
  const getVoucherProfitBase = (voucher: RawVoucher) => {
    if (voucher.type !== "sales") return 0;
    
    const baseCurrency = getBaseCurrency();
    const netUSD = convertAmount(voucher.netAmount, voucher.currencyId, "USD", voucher.exchangeRate);
    const netBase = convertAmount(netUSD, currencies.find((c: any) => c.code === "USD")?.id || 1, baseCurrency.code, voucher.exchangeRate);
    
    const costUSD = getVoucherCostUSD(voucher);
    const costBase = convertAmount(costUSD, currencies.find((c: any) => c.code === "USD")?.id || 1, baseCurrency.code, voucher.exchangeRate);
    
    return Math.max(netBase - costBase, 0);
  };

  // Helper: Calculate payment status
  const getPaymentStatus = (voucher: RawVoucher) => {
    const netUSD = convertAmount(voucher.netAmount, voucher.currencyId, "USD", voucher.exchangeRate);
    const paidUSD = getVoucherPaidUSD(voucher);

    if (paidUSD <= 0.01) {
      return { label: "قەرز", color: "bg-red-100 text-red-700 border-red-200" };
    }
    if (paidUSD >= netUSD - 0.01) {
      return { label: "نەقد", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    }
    return { label: "بەشەکی", color: "bg-amber-100 text-amber-700 border-amber-200" };
  };

  // Helper: Get display currency ID for a voucher
  const getDisplayCurrencyId = (voucher: RawVoucher) => {
    if (filterCurrencyId !== "all") {
      return Number(filterCurrencyId);
    }
    return voucher.currencyId || currencies.find((c: any) => c.code === "USD")?.id || 1;
  };

  // Group ledger entries by accountId and compute running balance chronologically
  const voucherRunningBalances = useMemo(() => {
    const runningBals: Record<string, number> = {};
    if (vouchers.length === 0) return runningBals;

    const entriesByAccount: Record<number, Array<{
      date: Date;
      voucherId: number;
      debit: number;
      credit: number;
      currencyId: number;
    }>> = {};

    vouchers.forEach(v => {
      if (!v.accountId) return;
      v.ledgerEntries.forEach(le => {
        if (!entriesByAccount[v.accountId!]) {
          entriesByAccount[v.accountId!] = [];
        }
        entriesByAccount[v.accountId!].push({
          date: new Date(le.date || v.date),
          voucherId: v.id,
          debit: le.debit || 0,
          credit: le.credit || 0,
          currencyId: le.currencyId,
        });
      });
    });

    Object.keys(entriesByAccount).forEach(accIdStr => {
      const accId = Number(accIdStr);
      const list = entriesByAccount[accId];
      
      list.sort((a, b) => {
        const timeDiff = a.date.getTime() - b.date.getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.voucherId - b.voucherId;
      });

      const running: Record<number, number> = {};
      
      list.forEach(entry => {
        const curId = entry.currencyId;
        if (running[curId] === undefined) {
          running[curId] = 0;
        }
        running[curId] += (entry.debit - entry.credit);
        runningBals[`${entry.voucherId}_${curId}`] = running[curId];
      });
    });

    return runningBals;
  }, [vouchers]);

  const getVoucherRunningBalance = (voucher: RawVoucher) => {
    if (!voucher.accountId) return null;
    const targetCurId = voucher.currencyId || 1;
    const key = `${voucher.id}_${targetCurId}`;
    if (voucherRunningBalances[key] !== undefined) {
      return voucherRunningBalances[key];
    }

    // Chronological fallback
    const accEntries = vouchers
      .filter(v => v.accountId === voucher.accountId)
      .flatMap(v => v.ledgerEntries.map(le => ({
        date: new Date(le.date || v.date),
        voucherId: v.id,
        currencyId: le.currencyId,
      })))
      .filter(e => e.currencyId === targetCurId);

    accEntries.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.voucherId - b.voucherId;
    });

    let latestBal = 0;
    const voucherTime = new Date(voucher.date).getTime();
    for (const entry of accEntries) {
      const entryTime = entry.date.getTime();
      if (entryTime < voucherTime || (entryTime === voucherTime && entry.voucherId <= voucher.id)) {
        const k = `${entry.voucherId}_${targetCurId}`;
        if (voucherRunningBalances[k] !== undefined) {
          latestBal = voucherRunningBalances[k];
        }
      } else {
        break;
      }
    }
    return latestBal;
  };

  // Dynamic Employee List
  const employeeOptions = useMemo(() => {
    const fromVouchers = vouchers.map((v) => v.employeeName).filter(Boolean) as string[];
    const defaults = ["کۆساری مەلا فەرهاد", "کاک زاھیر ھەڵەبجە", "کۆسار سەنتەری لەندەن", "هێمن حەمە فەرهاد"];
    return Array.from(new Set([...defaults, ...fromVouchers]));
  }, [vouchers]);

  // Sorting & Filtering logic
  const processedVouchers = useMemo(() => {
    let list = [...vouchers];
    
    // Exclude cashbox transfers and exchanges from invoices report
    list = list.filter(v => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange");

    // Date Filters
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter((v) => new Date(v.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((v) => new Date(v.date) <= end);
    }

    // Invoice ID Filter
    if (filterInvoiceNo) {
      list = list.filter(
        (v) =>
          v.id.toString().includes(filterInvoiceNo) ||
          (v.referenceNo && v.referenceNo.includes(filterInvoiceNo))
      );
    }

    // Search term / General Search
    const search = (searchTerm || generalSearch).trim().toLowerCase();
    if (search) {
      list = list.filter((v) => {
        const empName = v.employeeName || "کۆساری مەلا فەرهاد";
        return (
          v.id.toString().includes(search) ||
          (v.referenceNo && v.referenceNo.toLowerCase().includes(search)) ||
          (v.account && v.account.name.toLowerCase().includes(search)) ||
          (v.cashbox && v.cashbox.name.toLowerCase().includes(search)) ||
          empName.toLowerCase().includes(search) ||
          (v.internalNote && v.internalNote.toLowerCase().includes(search))
        );
      });
    }

    // Invoice Type Filter
    if (filterInvoiceType !== "all") {
      list = list.filter((v) => v.type === filterInvoiceType);
    }

    // Payment Status Filter
    if (filterPaymentStatus !== "all") {
      list = list.filter((v) => {
        const ps = getPaymentStatus(v);
        return ps.label === filterPaymentStatus;
      });
    }

    // Account Type Filter
    if (filterAccountType !== "all") {
      list = list.filter(
        (v) => v.account && v.account.accountTypeId === Number(filterAccountType)
      );
    }

    // Specific Account Filter
    if (filterAccountId !== "all") {
      list = list.filter((v) => v.accountId === Number(filterAccountId));
    }

    // Specific Cashbox Filter
    if (filterCashboxId !== "all") {
      list = list.filter((v) => v.cashboxId === Number(filterCashboxId));
    }

    // Specific Currency Filter
    if (filterCurrencyId !== "all") {
      list = list.filter((v) => v.currencyId === Number(filterCurrencyId));
    }

    // Discount Filter
    if (filterDiscountType === "discounted") {
      list = list.filter((v) => v.totalDiscount > 0);
    } else if (filterDiscountType === "none") {
      list = list.filter((v) => v.totalDiscount === 0);
    }

    // Employee Filter
    if (filterEmployee !== "all") {
      list = list.filter((v) => {
        const empName = v.employeeName || "کۆساری مەلا فەرهاد";
        return empName === filterEmployee;
      });
    }

    // Sort
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof RawVoucher];
      let bVal: any = b[sortField as keyof RawVoucher];

      // Handle nested values
      if (sortField === "accountName") {
        aVal = a.account?.name || "";
        bVal = b.account?.name || "";
      } else if (sortField === "cashboxName") {
        aVal = a.cashbox?.name || "";
        bVal = b.cashbox?.name || "";
      } else if (sortField === "paid") {
        aVal = getVoucherPaidUSD(a);
        bVal = getVoucherPaidUSD(b);
      } else if (sortField === "remaining") {
        aVal = convertAmount(a.netAmount, a.currencyId, "USD", a.exchangeRate) - getVoucherPaidUSD(a);
        bVal = convertAmount(b.netAmount, b.currencyId, "USD", b.exchangeRate) - getVoucherPaidUSD(b);
      } else if (sortField === "expenses") {
        aVal = getVoucherExpensesUSD(a);
        bVal = getVoucherExpensesUSD(b);
      } else if (sortField === "profit") {
        aVal = getVoucherProfitBase(a);
        bVal = getVoucherProfitBase(b);
      }

      if (aVal === undefined || aVal === null) aVal = "";
      if (bVal === undefined || bVal === null) bVal = "";

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [
    vouchers,
    startDate,
    endDate,
    filterInvoiceNo,
    searchTerm,
    generalSearch,
    filterInvoiceType,
    filterPaymentStatus,
    filterAccountType,
    filterAccountId,
    filterCashboxId,
    filterCurrencyId,
    filterDiscountType,
    filterEmployee,
    sortField,
    sortDirection,
  ]);

  // Aggregate Calculations for Top Cards - now per-currency for correct display
  const totals = useMemo(() => {
    let totalValueUSD = 0;
    let totalDiscountUSD = 0;
    let totalPaidUSD = 0;
    let totalRemainingUSD = 0;
    let totalExpensesUSD = 0;
    let totalProfitUSD = 0;

    // Per-currency tracking for multi-currency display
    const valueByCurrency: Record<number, number> = {};
    const discountByCurrency: Record<number, number> = {};
    const paidByCurrency: Record<number, number> = {};
    const remainingByCurrency: Record<number, number> = {};
    const expensesByCurrency: Record<number, number> = {};
    const profitByCurrency: Record<number, number> = {};

    processedVouchers.forEach((v) => {
      const curId = v.currencyId || currencies.find((c: any) => c.code === "USD")?.id || 1;
      const val = convertAmount(v.netAmount, v.currencyId, "USD", v.exchangeRate);
      const disc = convertAmount(v.totalDiscount, v.currencyId, "USD", v.exchangeRate);
      const paid = getVoucherPaidUSD(v);
      const rem = Math.max(val - paid, 0);
      const exp = getVoucherExpensesUSD(v);
      const prof = getVoucherProfitBase(v);

      totalValueUSD += val;
      totalDiscountUSD += disc;
      totalPaidUSD += paid;
      totalRemainingUSD += rem;
      totalExpensesUSD += exp;
      totalProfitUSD += prof;

      // Per-currency accumulation (in original currency)
      valueByCurrency[curId] = (valueByCurrency[curId] || 0) + v.netAmount;
      discountByCurrency[curId] = (discountByCurrency[curId] || 0) + v.totalDiscount;
      
      const paidInVoucherCurrency = v.paidAmounts.reduce((sum, pa) => {
        return sum + convertBetweenCurrencies(pa.amount, pa.currencyId, curId, pa.exchangeRate || v.exchangeRate || 1500);
      }, 0);
      paidByCurrency[curId] = (paidByCurrency[curId] || 0) + paidInVoucherCurrency;
      remainingByCurrency[curId] = (remainingByCurrency[curId] || 0) + Math.max(v.netAmount - paidInVoucherCurrency, 0);
      
      // Expenses: use same approach
      const expInVoucherCurrency = v.expenses.reduce((sum, e) => {
        if (e.currencyId === curId) {
          return sum + e.amount;
        }
        return sum + convertBetweenCurrencies(e.amount, e.currencyId, curId, v.exchangeRate);
      }, 0);
      expensesByCurrency[curId] = (expensesByCurrency[curId] || 0) + expInVoucherCurrency;
      
      // Profit is always in base currency
      const baseCurId = getBaseCurrency().id;
      profitByCurrency[baseCurId] = (profitByCurrency[baseCurId] || 0) + prof;
    });

    return {
      count: processedVouchers.length,
      value: totalValueUSD,
      discount: totalDiscountUSD,
      paid: totalPaidUSD,
      remaining: totalRemainingUSD,
      expenses: totalExpensesUSD,
      profit: totalProfitUSD,
      valueByCurrency,
      discountByCurrency,
      paidByCurrency,
      remainingByCurrency,
      expensesByCurrency,
      profitByCurrency,
    };
  }, [processedVouchers]);

  // Paginated List
  const paginatedVouchers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedVouchers.slice(startIndex, startIndex + pageSize);
  }, [processedVouchers, currentPage, pageSize]);

  // Total pages
  const totalPages = Math.ceil(processedVouchers.length / pageSize) || 1;

  // Formatting helpers
  const formatUSD = (val: number) => {
    return `$ ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }

    // Auto-activate the related column if it's hidden
    const sortFieldToColumnMap: Record<string, keyof typeof visibleColumns> = {
      id: "invoiceId",
      type: "type",
      accountName: "account",
      netAmount: "total",
      totalDiscount: "discount",
      paid: "paid",
      remaining: "remaining",
      deliveryFee: "deliveryFee",
      expenses: "expenses",
      profit: "profit",
      cashboxName: "cashbox",
      date: "date",
    };
    const columnKey = sortFieldToColumnMap[field];
    if (columnKey && !visibleColumns[columnKey]) {
      setVisibleColumns(prev => ({ ...prev, [columnKey]: true }));
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const clearFilters = () => {
    setFilterInvoiceType("all");
    setFilterPaymentStatus("all");
    setFilterStatus("active");
    setFilterAccountType("all");
    setFilterAccountId("all");
    setFilterCashboxId("all");
    setFilterCurrencyId("all");
    setFilterInvoiceNo("");
    setFilterDiscountType("all");
    setFilterEmployee("all");
    setSearchTerm("");
    setGeneralSearch("");
    const d = new Date();
    d.setDate(1);
    setStartDate(d.toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
  };

  const getVersionData = (index: number) => {
    if (!selectedVoucherForVersions || !selectedVoucherForVersions.versions) return null;
    const ver = selectedVoucherForVersions.versions[index];
    if (!ver) return null;
    try {
      const parsed = JSON.parse(ver.data);
      
      // Fallback: If parsed data has no netAmount (or paidAmounts is missing and it is version 1),
      // let's populate it with the earliest version that has full data, or the current voucher fields.
      const getEarliestFullData = () => {
        if (selectedVoucherForVersions.versions) {
          for (const v of selectedVoucherForVersions.versions) {
            try {
              const p = JSON.parse(v.data);
              if (p && p.netAmount !== undefined) {
                return p;
              }
            } catch {}
          }
        }
        return selectedVoucherForVersions;
      };

      const baseFallback = getEarliestFullData();
      
      const fallbackData = (ver.version === 1 && parsed.netAmount === undefined) ? {
        type: baseFallback.type,
        referenceNo: baseFallback.referenceNo,
        date: baseFallback.date,
        accountId: baseFallback.accountId,
        cashboxId: baseFallback.cashboxId,
        fromCashboxId: baseFallback.fromCashboxId,
        toCashboxId: baseFallback.toCashboxId,
        currencyId: baseFallback.currencyId,
        exchangeRate: baseFallback.exchangeRate,
        totalAmount: baseFallback.totalAmount,
        totalDiscount: baseFallback.totalDiscount,
        netAmount: baseFallback.netAmount,
        internalNote: baseFallback.internalNote,
        printNote: baseFallback.printNote,
        employeeName: baseFallback.employeeName,
        paidAmounts: baseFallback.paidAmounts?.map((pa: any) => ({
          currencyId: pa.currencyId,
          amount: pa.amount,
          exchangeRate: pa.exchangeRate
        })) || []
      } : {};

      return {
        versionNum: ver.version,
        updatedAt: ver.updatedAt,
        employeeName: ver.employeeName,
        ...fallbackData,
        ...parsed,
      };
    } catch (e) {
      console.error("Failed to parse version data:", e);
      return null;
    }
  };

  const formatPaidAmounts = (paidAmounts: any[]) => {
    if (!paidAmounts || !Array.isArray(paidAmounts) || paidAmounts.length === 0) return "هیچ (سفر)";
    return paidAmounts
      .map(pa => formatCurrencyValue(Number(pa.amount || 0), pa.currencyId || 1))
      .join(" + ");
  };

  const renderComparisonRow = (label: string, valA: any, valB: any, formatter?: (val: any) => string, alwaysShow = false) => {
    const displayA = formatter ? formatter(valA) : (valA !== undefined && valA !== null ? String(valA) : "-");
    const displayB = formatter ? formatter(valB) : (valB !== undefined && valB !== null ? String(valB) : "-");
    const isDifferent = formatter
      ? formatter(valA) !== formatter(valB)
      : String(valA !== undefined && valA !== null ? valA : "") !== String(valB !== undefined && valB !== null ? valB : "");

    if (!isDifferent && !alwaysShow) return null;

    return (
      <tr className={isDifferent ? "bg-amber-50/75 text-amber-900 border-l-4 border-l-amber-500 font-bold" : "border-b border-slate-100 hover:bg-slate-50"}>
        <td className="py-2.5 px-4 text-right font-black text-xs text-slate-500">{label}</td>
        <td className="py-2.5 px-4 text-center text-xs">{displayA}</td>
        <td className="py-2.5 px-4 text-center text-xs">{displayB}</td>
      </tr>
    );
  };

  const renderItemsTableComparison = () => {
    const verA = getVersionData(versionAIndex);
    const verB = getVersionData(versionBIndex);
    const linesA: any[] = verA?.lines || [];
    const linesB: any[] = verB?.lines || [];

    if (linesA.length === 0 && linesB.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Version A Items */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 text-right">
          <h5 className="text-xs font-black text-slate-800 mb-3 border-b border-slate-200 pb-1.5 flex justify-between">
            <span>📦 کەرەستەکانی وەشانی {verA?.versionNum}</span>
            <span className="text-[10px] text-slate-400">کۆی جۆرەکان: {linesA.length}</span>
          </h5>
          {linesA.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">کەرەستە بوونی نییە</p>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="text-slate-400 text-[10px] border-b border-slate-200">
                  <th className="pb-1 text-right">ناو</th>
                  <th className="pb-1 text-center">عەدد</th>
                  <th className="pb-1 text-center">کۆ</th>
                </tr>
              </thead>
              <tbody>
                {linesA.map((line: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-100">
                    <td className="py-2 font-bold text-slate-800">{line.productName || line.product?.name || `کەرەستەی #${line.productId}`}</td>
                    <td className="py-2 text-center font-extrabold">{line.qty}</td>
                    <td className="py-2 text-center font-black">{formatCurrencyValue(line.lineTotal, selectedVoucherForVersions?.currencyId || 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Version B Items */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 text-right">
          <h5 className="text-xs font-black text-slate-800 mb-3 border-b border-slate-200 pb-1.5 flex justify-between">
            <span>📦 کەرەستەکانی وەشانی {verB?.versionNum}</span>
            <span className="text-[10px] text-slate-400">کۆی جۆرەکان: {linesB.length}</span>
          </h5>
          {linesB.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">کەرەستە بوونی نییە</p>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="text-slate-400 text-[10px] border-b border-slate-200">
                  <th className="pb-1 text-right">ناو</th>
                  <th className="pb-1 text-center">عەدد</th>
                  <th className="pb-1 text-center">کۆ</th>
                </tr>
              </thead>
              <tbody>
                {linesB.map((line: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-100">
                    <td className="py-2 font-bold text-slate-800">{line.productName || line.product?.name || `کەرەستەی #${line.productId}`}</td>
                    <td className="py-2 text-center font-extrabold">{line.qty}</td>
                    <td className="py-2 text-center font-black">{formatCurrencyValue(line.lineTotal, selectedVoucherForVersions?.currencyId || 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 rtl select-none">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-report-area, #print-report-area * {
            visibility: visible;
          }
          #print-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Top Header / Actions Area ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shadow-sm flex-shrink-0 no-print">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
              className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
              title="گەورەکردنی سایدبار"
            >
              ☰
            </button>
            <span className="text-3xl">📈</span>
            <h1 className="text-2xl font-black text-slate-900 m-0">ڕاپۆرتی پسوڵە</h1>
          </div>
        </div>

        {/* Filters and Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-700">لە بەرواری:</span>
              <DateInput
                value={startDate}
                onChange={(val) => setStartDate(val)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-700">بۆ بەرواری:</span>
              <DateInput
                value={endDate}
                onChange={(val) => setEndDate(val)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFiltersModal(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 font-black px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-sm shadow-md"
            >
              ⚙️ ئۆپشنەکانی فلتەرکردن
            </button>

            <button
              onClick={() => setShowColumnsModal(true)}
              className="bg-slate-200 text-slate-800 hover:bg-slate-300 font-black px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-sm shadow-sm border border-slate-300"
            >
              🗂️ کۆڵۆمەکان
            </button>

            <button
              onClick={handlePrint}
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-black px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-sm shadow-md"
            >
              🖨️ پرینت
            </button>

            <button
              onClick={loadVouchers}
              className="bg-[#0f172a] text-white hover:bg-slate-800 font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer text-sm shadow-sm"
            >
              نوێکردنەوە 🔄
            </button>
          </div>
        </div>

        {/* General Search Bar underneath */}
        <div className="w-full transition-all duration-500 ease-in-out overflow-hidden max-h-24 opacity-100 mt-4">
          <input
            type="text"
            placeholder="🔍 گەڕانی گشتی لە پسوڵە، بەکارهێنەر، قاسە، تێبینیەکان..."
            value={searchTerm || generalSearch}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setGeneralSearch(e.target.value);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full border border-slate-300 rounded-2xl px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm bg-white"
          />
        </div>
      </div>

      {/* ── Main Scrollable Body ── */}
      <div 
        id="print-report-area" 
        className="flex-1 overflow-y-auto p-6 space-y-6"
        onScroll={(e) => {
          const st = e.currentTarget.scrollTop;
          setLastScrollTop(st <= 0 ? 0 : st);
        }}
      >
        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {/* Card: Total Vouchers */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">کۆی پسوڵەکان</span>
            <span className="text-blue-900 text-xl font-black mt-2">
              {visibleColumns.invoiceId ? totals.count : "ناچالاکە"}
            </span>
          </div>

          {/* Card: Total Value */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">کۆی گشتی پارەی جوڵاو</span>
            <span className="text-indigo-900 text-xl font-black mt-2" style={{ fontSize: Object.keys(totals.valueByCurrency).length > 1 && filterCurrencyId === 'all' ? '14px' : undefined }}>
              {visibleColumns.total ? formatKPIMultiCurrency(totals.valueByCurrency) : "ناچالاکە"}
            </span>
          </div>

          {/* Card: Paid */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">پارەی دراو</span>
            <span className="text-emerald-900 text-xl font-black mt-2" style={{ fontSize: Object.keys(totals.paidByCurrency).length > 1 && filterCurrencyId === 'all' ? '14px' : undefined }}>
              {visibleColumns.paid ? formatKPIMultiCurrency(totals.paidByCurrency) : "ناچالاکە"}
            </span>
          </div>

          {/* Card: Remaining */}
          <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">باقیاتی ماوە</span>
            <span className="text-rose-900 text-xl font-black mt-2" style={{ fontSize: Object.keys(totals.remainingByCurrency).length > 1 && filterCurrencyId === 'all' ? '14px' : undefined }}>
              {visibleColumns.remaining ? formatKPIMultiCurrency(totals.remainingByCurrency) : "ناچالاکە"}
            </span>
          </div>

          {/* Card: Expenses */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">خەرجی پسووڵەی کڕین</span>
            <span className="text-purple-900 text-xl font-black mt-2" style={{ fontSize: Object.keys(totals.expensesByCurrency).length > 1 && filterCurrencyId === 'all' ? '14px' : undefined }}>
              {visibleColumns.expenses ? formatKPIMultiCurrency(totals.expensesByCurrency) : "ناچالاکە"}
            </span>
          </div>

          {/* Card: Discounts */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">داشکاندن</span>
            <span className="text-slate-900 text-xl font-black mt-2" style={{ fontSize: Object.keys(totals.discountByCurrency).length > 1 && filterCurrencyId === 'all' ? '14px' : undefined }}>
              {visibleColumns.discount ? formatKPIMultiCurrency(totals.discountByCurrency) : "ناچالاکە"}
            </span>
          </div>

          {/* Card: Profits */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
            <span className="text-slate-600 text-xs font-bold">قازانج (فرۆشتن)</span>
            <span className="text-amber-900 text-xl font-black mt-2">
              {visibleColumns.profit ? formatKPIMultiCurrency(totals.profitByCurrency) : "ناچالاکە"}
            </span>
          </div>
        </div>

        {/* ── Table Component ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-[#0f172a] text-white">
                <tr>
                  {visibleColumns.invoiceId && (
                    <th onClick={() => handleSort("id")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      پسوڵە {sortField === "id" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.type && (
                    <th onClick={() => handleSort("type")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      جۆر {sortField === "type" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.paymentStatus && (
                    <th className="px-4 py-3.5 text-center text-xs font-bold select-none">
                      دۆخی پارەدان
                    </th>
                  )}
                  {visibleColumns.account && (
                    <th onClick={() => handleSort("accountName")} className="px-4 py-3.5 text-right text-xs font-bold cursor-pointer select-none">
                      ھەژمار {sortField === "accountName" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.total && (
                    <th onClick={() => handleSort("netAmount")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      کۆی گشتی {sortField === "netAmount" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.discount && (
                    <th onClick={() => handleSort("totalDiscount")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      داشکاندن {sortField === "totalDiscount" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.paid && (
                    <th onClick={() => handleSort("paid")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      پارەی دراو {sortField === "paid" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.remaining && (
                    <th onClick={() => handleSort("remaining")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      ماوە {sortField === "remaining" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.deliveryFee && (
                    <th onClick={() => handleSort("deliveryFee")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      نرخی گەیاندن {sortField === "deliveryFee" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.expenses && (
                    <th onClick={() => handleSort("expenses")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      خەرجی {sortField === "expenses" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.profit && (
                    <th onClick={() => handleSort("profit")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      قازانج {sortField === "profit" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.cashbox && (
                    <th onClick={() => handleSort("cashboxName")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      قاسە {sortField === "cashboxName" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.offer && (
                    <th className="px-4 py-3.5 text-center text-xs font-bold select-none">
                      ئۆفەر
                    </th>
                  )}
                  {visibleColumns.notes && (
                    <th className="px-4 py-3.5 text-center text-xs font-bold select-none align-middle max-w-[200px]">
                      تێبینی
                    </th>
                  )}
                  {visibleColumns.date && (
                    <th onClick={() => handleSort("date")} className="px-4 py-3.5 text-center text-xs font-bold cursor-pointer select-none">
                      بەروار {sortField === "date" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="px-4 py-3.5 text-center text-xs font-bold select-none no-print">
                      چالاکی
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-sm font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan={20} className="px-6 py-12 text-center text-slate-400">
                      باردەکرێت... 🔄
                    </td>
                  </tr>
                ) : paginatedVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="px-6 py-12 text-center text-slate-400">
                      هیچ داتایەک نەدۆزرایەوە بەگوێرەی فلتەرەکان 📭
                    </td>
                  </tr>
                ) : (
                  paginatedVouchers.map((voucher) => {
                    const payStatus = getPaymentStatus(voucher);
                    const isExpanded = expandedRowId === voucher.id;

                    const displayCurrencyId = getDisplayCurrencyId(voucher);
                    const displayCurrencyObj = currencies.find((c: any) => c.id === displayCurrencyId);

                    const voucherCurrencyId = voucher.currencyId || currencies.find((c: any) => c.code === "USD")?.id || 1;

                    const valVal = convertBetweenCurrencies(voucher.netAmount, voucherCurrencyId, displayCurrencyId, voucher.exchangeRate);
                    const discountVal = convertBetweenCurrencies(voucher.totalDiscount, voucherCurrencyId, displayCurrencyId, voucher.exchangeRate);
                    const deliveryFeeVal = voucher.deliveryFee 
                      ? convertBetweenCurrencies(voucher.deliveryFee, voucherCurrencyId, displayCurrencyId, voucher.exchangeRate)
                      : 0;

                    const paidVal = voucher.paidAmounts.reduce((sum, pa) => {
                      const paInDisplay = convertBetweenCurrencies(pa.amount, pa.currencyId, displayCurrencyId, voucher.exchangeRate);
                      return sum + paInDisplay;
                    }, 0);

                    const expensesVal = voucher.expenses.reduce((sum, exp) => {
                      const expInDisplay = convertBetweenCurrencies(exp.amount, exp.currencyId, displayCurrencyId, voucher.exchangeRate);
                      return sum + expInDisplay;
                    }, 0);

                    const remainingVal = Math.max(valVal - paidVal, 0);
                    const profitVal = getVoucherProfitBase(voucher);

                    const isDebtVoucherType = [
                      "money_in", "money_out", "my_debt_discount", "people_debt_discount",
                      "debt_discount", "debt discount",
                      "پارەی هاتوو", "پارەی ڕۆشتوو", "داشکاندن لە قەرزی من", "داشکاندن لە قەرزی خەڵک"
                    ].includes(voucher.type);

                    return (
                      <>
                        <tr
                          key={voucher.id}
                          onDoubleClick={() => setExpandedRowId(isExpanded ? null : voucher.id)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer select-none ${
                            isExpanded ? "bg-blue-50/20" : ""
                          }`}
                        >
                          {visibleColumns.invoiceId && (
                            <td className="px-4 py-3.5 text-center">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/invoices?editId=${voucher.id}&type=${voucher.type}`);
                                }}
                                title="دەستکاریکردنی پسوڵە"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-lg px-6 py-2 rounded-xl cursor-pointer shadow-md transition-all inline-block hover:scale-105"
                              >
                                {voucher.id}
                              </span>
                            </td>
                          )}
                          {visibleColumns.type && (
                            <td className="px-4 py-3.5 text-center">
                              {getKurdishType(voucher.type)}
                            </td>
                          )}
                          {visibleColumns.paymentStatus && (
                            <td className="px-4 py-3.5 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${payStatus.color}`}
                              >
                                {payStatus.label}
                              </span>
                            </td>
                          )}
                          {visibleColumns.account && (
                            <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                              {voucher.account?.name || "-"}
                            </td>
                          )}
                          {visibleColumns.total && (
                            <td className="px-4 py-3.5 text-center font-black">
                              {formatCurrencyValue(valVal, displayCurrencyId)}
                            </td>
                          )}
                          {visibleColumns.discount && (
                            <td className="px-4 py-3.5 text-center text-rose-600">
                              {voucher.totalDiscount > 0
                                ? formatCurrencyValue(discountVal, displayCurrencyId)
                                : "-"}
                            </td>
                          )}
                          {visibleColumns.paid && (
                            <td className="px-4 py-3.5 text-center text-emerald-600">
                              {paidVal > 0 ? formatCurrencyValue(paidVal, displayCurrencyId) : "-"}
                            </td>
                          )}
                          {visibleColumns.remaining && (
                            <td className="px-4 py-3.5 text-center text-rose-700 font-bold">
                              {isDebtVoucherType ? (
                                (() => {
                                  const runningBal = getVoucherRunningBalance(voucher);
                                  return runningBal !== null ? formatCurrencyValue(runningBal, voucher.currencyId || 1) : "-";
                                })()
                              ) : (
                                remainingVal > 0 ? formatCurrencyValue(remainingVal, displayCurrencyId) : "-"
                              )}
                            </td>
                          )}
                          {visibleColumns.deliveryFee && (
                            <td className="px-4 py-3.5 text-center">
                              {voucher.deliveryFee
                                ? formatCurrencyValue(deliveryFeeVal, displayCurrencyId)
                                : "-"}
                            </td>
                          )}
                          {visibleColumns.expenses && (
                            <td className="px-4 py-3.5 text-center text-purple-700">
                              {expensesVal > 0 ? formatCurrencyValue(expensesVal, displayCurrencyId) : "-"}
                            </td>
                          )}
                          {visibleColumns.profit && (
                            <td className="px-4 py-3.5 text-center text-amber-700 font-bold">
                              {voucher.type === "sales" ? formatBaseCurrency(profitVal) : "-"}
                            </td>
                          )}
                          {visibleColumns.cashbox && (
                            <td className="px-4 py-3.5 text-center">
                              {voucher.cashbox?.name || "-"}
                            </td>
                          )}
                          {visibleColumns.offer && (
                            <td className="px-4 py-3.5 text-center">-</td>
                          )}
                          {visibleColumns.notes && (
                            <td className="px-4 py-3.5 text-center text-xs font-medium align-middle max-w-[200px] break-words whitespace-normal">
                              {voucher.internalNote || "-"}
                            </td>
                          )}
                          {visibleColumns.date && (
                            <td className="px-4 py-3.5 text-center text-xs text-slate-600 font-medium">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm" title={`وەشانی ${voucher.versions?.length || 1}`}>
                                    {voucher.versions?.length || 1}
                                  </span>
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-xl text-[10px] font-extrabold shadow-sm">
                                    {voucher.employeeName || "کۆساری مەلا فەرهاد"}
                                  </span>
                                </div>
                                <span className="text-slate-500 font-bold">
                                  {formatDateTime(voucher.date)}
                                </span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td className="px-4 py-3.5 text-center no-print relative">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setExpandedRowId(isExpanded ? null : voucher.id)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  {isExpanded ? "ناوەڕۆکی پسوڵە 🔼" : "ناوەڕۆکی پسوڵە 🔽"}
                                </button>
                                
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownId(activeDropdownId === voucher.id ? null : voucher.id);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                  >
                                    زیاتر ⚙️
                                  </button>
                                  
                                  {activeDropdownId === voucher.id && (
                                    <div className="absolute left-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-right">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdownId(null);
                                          window.location.href = `/invoices?editId=${voucher.id}&type=${voucher.type}`;
                                        }}
                                        className="w-full text-right px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <span>✏️</span> نوێکردنەوە
                                      </button>
                                      {(voucher.versions?.length || 0) > 1 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdownId(null);
                                            setSelectedVoucherForVersions(voucher);
                                            setVersionAIndex(0);
                                            setVersionBIndex((voucher.versions?.length || 1) - 1);
                                            setShowVersionsModal(true);
                                          }}
                                          className="w-full text-right px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                                        >
                                          <span>📜</span> وەشان
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdownId(null);
                                          setDeleteVoucherId(voucher.id);
                                        }}
                                        className="w-full text-right px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                                      >
                                        <span>🗑️</span> سڕینەوە
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Nested Detail View */}
                        {isExpanded && (
                          <tr className="bg-blue-50/10">
                            <td colSpan={20} className="px-6 py-4">
                              <div className="border border-blue-100 rounded-2xl bg-white shadow-inner overflow-hidden">
                                {voucher.lines.length > 0 ? (
                                  <>
                                    {/* Header for product vouchers */}
                                    <div className="flex justify-between items-center px-5 py-3 bg-gradient-to-l from-blue-50 to-indigo-50 border-b border-blue-100">
                                      <h4 className="text-sm font-black text-slate-800 m-0 flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm">📦</span>
                                        <span>وردەکاری کاڵاکانی پسوڵەی ژمارە</span>
                                        <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg text-xs">#{voucher.id}</span>
                                      </h4>
                                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                        <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">ڕێژەی گۆڕینەوە: <b className="text-slate-700">{voucher.exchangeRate}</b></span>
                                        <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">دراو: <b className="text-slate-700">{voucher.currency?.name || "دۆلار"}</b></span>
                                      </div>
                                    </div>
                                    {/* Product lines table */}
                                    <div className="px-5 py-3">
                                      <table className="min-w-full text-xs font-semibold">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-2.5 text-center w-10 text-slate-400">#</th>
                                            <th className="py-2.5 text-right">کەرەستە</th>
                                            <th className="py-2.5 text-center w-24">کۆد</th>
                                            <th className="py-2.5 text-center w-20">عەدد</th>
                                            <th className="py-2.5 text-center w-28">نرخی تاک</th>
                                            <th className="py-2.5 text-center w-28">داشکاندن</th>
                                            <th className="py-2.5 text-center w-28">کۆی بەها</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {voucher.lines.map((line, idx) => (
                                            <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                                              <td className="py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                                              <td className="py-2.5 text-right font-bold text-slate-800">{line.product?.name || "نەناسراو"}</td>
                                              <td className="py-2.5 text-center text-slate-500 font-mono text-[11px]">{line.product?.code || "-"}</td>
                                              <td className="py-2.5 text-center font-extrabold text-slate-800">{line.qty}</td>
                                              <td className="py-2.5 text-center">{formatCurrencyValue(line.unitPrice, voucher.currencyId || 1)}</td>
                                              <td className="py-2.5 text-center text-rose-500">{line.discountAmount > 0 ? formatCurrencyValue(line.discountAmount, voucher.currencyId || 1) : "-"}</td>
                                              <td className="py-2.5 text-center font-black text-slate-900">{formatCurrencyValue(line.lineTotal, voucher.currencyId || 1)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Beautiful header for non-product vouchers */}
                                    {(() => {
                                      const typeStyles: Record<string, { bg: string; border: string; icon: string; desc: string }> = {
                                        money_in: { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", icon: "💰", desc: "پارەیەک هاتووەتە ناو ئەم هەژمارە" },
                                        money_out: { bg: "from-rose-50 to-pink-50", border: "border-rose-200", icon: "💸", desc: "پارەیەک لەم هەژمارە دەرچووە" },
                                        expense: { bg: "from-purple-50 to-violet-50", border: "border-purple-200", icon: "🧾", desc: "خەرجییەک تۆمار کراوە" },
                                        cashbox_transfer: { bg: "from-blue-50 to-cyan-50", border: "border-blue-200", icon: "🔄", desc: "پارە لە قاسەیەکەوە گوازراوەتەوە بۆ قاسەیەکی تر" },
                                        cashbox_exchange: { bg: "from-amber-50 to-yellow-50", border: "border-amber-200", icon: "💱", desc: "گۆڕینەوەی دراو ئەنجام دراوە" },
                                        shareholder_deposit: { bg: "from-emerald-50 to-green-50", border: "border-emerald-200", icon: "🏦", desc: "پارە دانراوە لەلایەن هاوبەش" },
                                        shareholder_withdrawal: { bg: "from-orange-50 to-red-50", border: "border-orange-200", icon: "🏧", desc: "هاوبەش پارەی کشاندووەتەوە" },
                                        sales_return: { bg: "from-amber-50 to-orange-50", border: "border-amber-200", icon: "↩️", desc: "کاڵا گەڕاوەتەوە لە فرۆشتن" },
                                        purchase_return: { bg: "from-teal-50 to-cyan-50", border: "border-teal-200", icon: "↩️", desc: "کاڵا گەڕاوەتەوە لە کڕین" },
                                        my_debt_discount: { bg: "from-sky-50 to-blue-50", border: "border-sky-200", icon: "✂️", desc: "داشکاندن لە قەرزی ئێمە" },
                                        people_debt_discount: { bg: "from-indigo-50 to-violet-50", border: "border-indigo-200", icon: "✂️", desc: "داشکاندن لە قەرزی خەڵکی" },
                                        debt_discount: { bg: "from-sky-50 to-blue-50", border: "border-sky-200", icon: "✂️", desc: "داشکاندن لە قەرزی خەڵکی" },
                                        "debt discount": { bg: "from-sky-50 to-blue-50", border: "border-sky-200", icon: "✂️", desc: "داشکاندن لە قەرزی خەڵکی" },
                                      };
                                      const style = typeStyles[voucher.type] || { bg: "from-slate-50 to-gray-50", border: "border-slate-200", icon: "📋", desc: "مامەڵەیەک تۆمار کراوە" };

                                      return (
                                        <div className={`bg-gradient-to-l ${style.bg} border-b ${style.border} px-5 py-4`}>
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                              <span className="w-10 h-10 rounded-xl bg-white/80 border border-white shadow-sm flex items-center justify-center text-xl">{style.icon}</span>
                                              <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                  <h4 className="text-sm font-black text-slate-800 m-0">{getKurdishType(voucher.type)}</h4>
                                                  <span className="text-slate-500 bg-white/70 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-slate-200">#{voucher.id}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 m-0 font-semibold">{style.desc}</p>
                                              </div>
                                            </div>
                                            <div className="text-left">
                                              <span className="text-lg font-black text-slate-800">{formatCurrencyValue(voucher.netAmount, voucher.currencyId || 1)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Info grid for non-product vouchers */}
                                    <div className="px-5 py-3">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {voucher.account && (
                                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-bold block mb-1">ھەژمار</span>
                                            <span className="text-xs font-black text-slate-800">{voucher.account.name}</span>
                                          </div>
                                        )}
                                        {voucher.cashbox && (
                                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-bold block mb-1">قاسە</span>
                                            <span className="text-xs font-black text-slate-800">{voucher.cashbox.name}</span>
                                          </div>
                                        )}
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                          <span className="text-[10px] text-slate-400 font-bold block mb-1">دراو</span>
                                          <span className="text-xs font-black text-slate-800">{voucher.currency?.name || "دۆلار"} ({voucher.currency?.symbol || "$"})</span>
                                        </div>
                                        {voucher.exchangeRate > 1 && (
                                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-bold block mb-1">ڕێژەی گۆڕینەوە</span>
                                            <span className="text-xs font-black text-slate-800">{voucher.exchangeRate.toLocaleString()}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Cash box / payments & expenses nested summary */}
                                <div className="px-5 pb-4">
                                  <div className="flex flex-wrap gap-6 pt-3 border-t border-slate-100">
                                    {/* Payments block */}
                                    <div className="w-full sm:w-auto min-w-[280px] max-w-[350px]">
                                      <h5 className="text-[11px] font-extrabold text-slate-500 mb-2 flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">💵</span>
                                        پارەی دراو
                                      </h5>
                                      {voucher.paidAmounts.length === 0 ? (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-dashed border-slate-200">
                                          <span>⚠️</span>
                                          <span>هیچ پارەیەک نەدراوە — قەرزی تەواوە</span>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {voucher.paidAmounts.map((pa) => (
                                            <div key={pa.id} className="flex items-center justify-start gap-4 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-xs">
                                              <span className="text-slate-600 font-semibold">{pa.currency?.name} ({pa.currency?.symbol})</span>
                                              <span className="font-black text-emerald-700">{formatCurrencyValue(pa.amount, pa.currencyId)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Expenses block */}
                                    {voucher.expenses.length > 0 && (
                                      <div className="w-full sm:w-auto min-w-[280px] max-w-[350px]">
                                        <h5 className="text-[11px] font-extrabold text-slate-500 mb-2 flex items-center gap-1.5">
                                          <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center text-[10px]">💸</span>
                                          خەرجیەکان
                                        </h5>
                                        <div className="space-y-1.5">
                                          {voucher.expenses.map((exp) => (
                                            <div key={exp.id} className="flex items-center justify-between bg-purple-50/50 p-2.5 rounded-xl border border-purple-100 text-xs">
                                              <span className="text-slate-600 font-semibold">{exp.note || "خەرجی گشتی"}</span>
                                              <span className="font-black text-purple-700">{formatCurrencyValue(exp.amount, exp.currencyId)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Notes Section */}
                                  {(voucher.internalNote || voucher.printNote) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-100">
                                      {voucher.internalNote && (
                                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                          <h6 className="text-[10px] font-extrabold text-amber-600 mb-1 flex items-center gap-1">📝 تێبینی ناوخۆیی</h6>
                                          <p className="text-xs text-slate-700 m-0 font-medium whitespace-pre-wrap leading-relaxed">{voucher.internalNote}</p>
                                        </div>
                                      )}
                                      {voucher.printNote && (
                                        <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                                          <h6 className="text-[10px] font-extrabold text-sky-600 mb-1 flex items-center gap-1">🖨️ تێبینی چاپ</h6>
                                          <p className="text-xs text-slate-700 m-0 font-medium whitespace-pre-wrap leading-relaxed">{voucher.printNote}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Table Pagination Footer ── */}
          {!loading && processedVouchers.length > 0 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 no-print bg-slate-50">
              <div className="text-xs text-slate-500 font-bold">
                پیشاندانی {Math.min(processedVouchers.length, (currentPage - 1) * pageSize + 1)} تا{" "}
                {Math.min(processedVouchers.length, currentPage * pageSize)} لە کۆی{" "}
                {processedVouchers.length} پسوڵەی تۆمارکراو
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c: any) => Math.max(c - 1, 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  پێشوو
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((c: any) => Math.min(c + 1, totalPages))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  دواتر
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">بڕی داتا:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value={10}>١٠ دانە</option>
                  <option value={25}>٢٥ دانە</option>
                  <option value={50}>٥٠ دانە</option>
                  <option value={100}>١٠٠ دانە</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Filtering Options (ئۆپشنەکانی فلتەرکردن) ── */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#0f172a] text-white">
              <h2 className="text-lg font-black m-0 flex items-center gap-2">
                <span>⚙️ ئۆپشنەکانی فلتەرکردن</span>
              </h2>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="w-8 h-8 rounded-full border-none cursor-pointer bg-white/10 hover:bg-white/20 text-white font-black text-lg flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex-1 text-sm font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {/* Invoice Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">جۆری پسوڵە</label>
                  <select
                    value={filterInvoiceType}
                    onChange={(e) => setFilterInvoiceType(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو</option>
                    <option value="sales">فرۆشتن</option>
                    <option value="purchase">کڕین</option>
                    <option value="money_in">پارەی هاتوو</option>
                    <option value="money_out">پارەی ڕۆشتوو</option>
                    <option value="expense">خەرجی</option>
                    <option value="sales_return">گەڕانەوەی فرۆشتن</option>
                    <option value="purchase_return">گەڕانەوەی کڕین</option>
                    
                    
                    <option value="shareholder_deposit">دانانی پارە</option>
                    <option value="shareholder_withdrawal">کشانەوەی پارە</option>
                    <option value="my_debt_discount">داشکاندن لە قەرزی من</option>
                    <option value="people_debt_discount">داشکاندن لە قەرزی خەڵک</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">دۆخی پارەدان</label>
                  <select
                    value={filterPaymentStatus}
                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو</option>
                    <option value="قەرز">قەرز</option>
                    <option value="بەشەکی">بەشەکی</option>
                    <option value="نەقد">نەقد</option>
                  </select>
                </div>

                {/* Employee / Created By Filter (لەلایەن) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">لەلایەن (کارمەند)</label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو کارمەندەکان</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">جۆری ھەژمار</label>
                  <select
                    value={filterAccountType}
                    onChange={(e) => {
                      setFilterAccountType(e.target.value);
                      setFilterAccountId("all"); // Reset specific account
                    }}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو</option>
                    {accountTypes.map((type: any) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specific Account */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">ھەژماری تایبەت</label>
                  <select
                    value={filterAccountId}
                    onChange={(e) => setFilterAccountId(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو</option>
                    {accounts
                      .filter((acc: any) => filterAccountType === "all" || acc.accountTypeId === Number(filterAccountType))
                      .map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Specific Cashbox */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">قاسە</label>
                  <select
                    value={filterCashboxId}
                    onChange={(e) => setFilterCashboxId(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو</option>
                    {cashboxes.map((cb: any) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specific Invoice Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">ژمارەی پسوڵە</label>
                  <input
                    type="text"
                    value={filterInvoiceNo}
                    onChange={(e) => setFilterInvoiceNo(e.target.value)}
                    placeholder="نموونە: 288"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">حاڵەتی پسوڵە</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="active">تەنها چالاکەکان</option>
                    <option value="all">ھەموو پسوڵەکان</option>
                  </select>
                </div>

                {/* Discount Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">فلتەری داشکاندن</label>
                  <select
                    value={filterDiscountType}
                    onChange={(e) => setFilterDiscountType(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو</option>
                    <option value="discounted">تەنیا پسوڵەکانی خاوەن داشکاندن</option>
                    <option value="none">تەنیا پسوڵەکانی بێ داشکاندن</option>
                  </select>
                </div>

                {/* Currency Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-600 font-bold text-xs">دراوی پسوڵە</label>
                  <select
                    value={filterCurrencyId}
                    onChange={(e) => setFilterCurrencyId(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="all">ھەموو دراوەکان</option>
                    {currencies.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* General Search Input inside advanced filters */}
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-slate-600 font-bold text-xs">تێبینی یان گەڕانی گشتی</label>
                <input
                  type="text"
                  value={generalSearch}
                  onChange={(e) => setGeneralSearch(e.target.value)}
                  placeholder="گەڕان بەدوای تێبینیەکان، ناو ناونیشان..."
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-3xl">
              <button
                onClick={clearFilters}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                🗑️ لادانی هەموو فلتەرەکان
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="bg-[#0f172a] text-white hover:bg-slate-800 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  ✓ جێبەجێکردنی فلتەرەکان
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Selected Columns (کۆڵۆمە دیاریکراوەکان) ── */}
      {showColumnsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#0f172a] text-white">
              <h2 className="text-lg font-black m-0 flex items-center gap-2">
                <span>🗂️ کۆڵۆمە دیاریکراوەکان</span>
              </h2>
              <button
                onClick={() => setShowColumnsModal(false)}
                className="w-8 h-8 rounded-full border-none cursor-pointer bg-white/10 hover:bg-white/20 text-white font-black text-lg flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content Checkboxes */}
            <div className="p-6 grid grid-cols-2 gap-3 text-sm font-bold max-h-[60vh] overflow-y-auto">
              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.invoiceId}
                  onChange={() => toggleColumn("invoiceId")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                پسوڵە
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.type}
                  onChange={() => toggleColumn("type")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                جۆر
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.paymentStatus}
                  onChange={() => toggleColumn("paymentStatus")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                دۆخی پارەدان
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.account}
                  onChange={() => toggleColumn("account")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                ھەژمار
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.total}
                  onChange={() => toggleColumn("total")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                کۆی گشتی
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.discount}
                  onChange={() => toggleColumn("discount")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                داشکاندن
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.paid}
                  onChange={() => toggleColumn("paid")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                پارەی دراو
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.remaining}
                  onChange={() => toggleColumn("remaining")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                ماوە
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.deliveryFee}
                  onChange={() => toggleColumn("deliveryFee")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                نرخی گەیاندن
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.expenses}
                  onChange={() => toggleColumn("expenses")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                خەرجی
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.profit}
                  onChange={() => toggleColumn("profit")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                قازانج
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.cashbox}
                  onChange={() => toggleColumn("cashbox")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                قاسە
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.offer}
                  onChange={() => toggleColumn("offer")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                ئۆفەر
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.notes}
                  onChange={() => toggleColumn("notes")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                تێبینی
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.date}
                  onChange={() => toggleColumn("date")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                بەروار
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.actions}
                  onChange={() => toggleColumn("actions")}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                چالاکی
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-3xl">
              <button
                onClick={() => setShowColumnsModal(false)}
                className="bg-[#0f172a] text-white hover:bg-slate-800 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                ✓ تەواو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Version Comparison (وەشانەکان) ── */}
      {showVersionsModal && selectedVoucherForVersions && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-text">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#0f172a] text-white">
              <h2 className="text-lg font-black m-0 flex items-center gap-2">
                <span>📜 مێژووی گۆڕانکاری و وەشانەکانی پسوڵەی ژمارە #{selectedVoucherForVersions.id}</span>
              </h2>
              <button
                onClick={() => setShowVersionsModal(false)}
                className="w-8 h-8 rounded-full border-none cursor-pointer bg-white/10 hover:bg-white/20 text-white font-black text-lg flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Selector Row */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">بەراوردکردنی:</span>
                <select
                  value={versionAIndex}
                  onChange={(e) => setVersionAIndex(Number(e.target.value))}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white text-xs font-bold"
                >
                  {selectedVoucherForVersions.versions?.map((v: any, idx: number) => (
                    <option key={v.id} value={idx}>
                      وەشانی {v.version} ({v.employeeName || "نەناسراو"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-slate-400 font-extrabold">◀ ─── بەراوردکردن لەگەڵ ─── ▶</div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600">وەشانی دووەم:</span>
                <select
                  value={versionBIndex}
                  onChange={(e) => setVersionBIndex(Number(e.target.value))}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white text-xs font-bold"
                >
                  {selectedVoucherForVersions.versions?.map((v: any, idx: number) => (
                    <option key={v.id} value={idx}>
                      وەشانی {v.version} ({v.employeeName || "نەناسراو"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Content */}
            <div className="p-6 space-y-6 flex-grow">
              {/* Values Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 text-xs font-bold text-center">
                    <tr>
                      <th className="py-2.5 px-4 text-right w-1/4">خانە / زانیاری</th>
                      <th className="py-2.5 px-4 w-3/8">وەشانی {getVersionData(versionAIndex)?.versionNum}</th>
                      <th className="py-2.5 px-4 w-3/8">وەشانی {getVersionData(versionBIndex)?.versionNum}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-right">
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-right font-black text-xs text-slate-500">بەرواری دروستکردنی پسوڵە</td>
                      <td colSpan={2} className="py-2.5 px-4 text-center text-xs font-bold text-slate-800">
                        {selectedVoucherForVersions?.createdAt ? formatDateTime(selectedVoucherForVersions.createdAt) : "-"}
                      </td>
                    </tr>
                    {renderComparisonRow("کاتی گۆڕانکاری", getVersionData(versionAIndex)?.updatedAt, getVersionData(versionBIndex)?.updatedAt, (d) => d ? formatDateTime(d) : "-", true)}
                    {renderComparisonRow("کارمەند / ئەنجامدەر", getVersionData(versionAIndex)?.employeeName, getVersionData(versionBIndex)?.employeeName, undefined, true)}
                    {renderComparisonRow("کۆی گشتی پارەی جوڵاو", getVersionData(versionAIndex)?.netAmount, getVersionData(versionBIndex)?.netAmount, (v) => formatCurrencyValue(Number(v || 0), selectedVoucherForVersions?.currencyId || 1))}
                    {renderComparisonRow("داشکاندن", getVersionData(versionAIndex)?.totalDiscount, getVersionData(versionBIndex)?.totalDiscount, (v) => formatCurrencyValue(Number(v || 0), selectedVoucherForVersions?.currencyId || 1))}
                    {renderComparisonRow("تێبینی ناوخۆیی", getVersionData(versionAIndex)?.internalNote || getVersionData(versionAIndex)?.note, getVersionData(versionBIndex)?.internalNote || getVersionData(versionBIndex)?.note)}
                    {renderComparisonRow("تێبینی چاپ", getVersionData(versionAIndex)?.printNote, getVersionData(versionBIndex)?.printNote)}
                    {renderComparisonRow("هەژماری پسوڵە", getVersionData(versionAIndex)?.accountId, getVersionData(versionBIndex)?.accountId, (id) => accounts.find((a: any) => a.id === Number(id))?.name || "-")}
                    {renderComparisonRow("قاسەی پسوڵە", getVersionData(versionAIndex)?.cashboxId, getVersionData(versionBIndex)?.cashboxId, (id) => cashboxes.find((c: any) => c.id === Number(id))?.name || "-")}
                    {renderComparisonRow("بڕی دراو (پارەی دراو)", getVersionData(versionAIndex)?.paidAmounts, getVersionData(versionBIndex)?.paidAmounts, (paid) => formatPaidAmounts(paid))}
                    {renderComparisonRow("ڕێژەی گۆڕینەوە", getVersionData(versionAIndex)?.exchangeRate, getVersionData(versionBIndex)?.exchangeRate)}
                    {renderComparisonRow("دراوی پسوڵە", getVersionData(versionAIndex)?.currencyId, getVersionData(versionBIndex)?.currencyId, (id) => currencies.find((c: any) => c.id === Number(id))?.name || "-")}
                  </tbody>
                </table>
              </div>

              {/* Items Table Comparison */}
              {renderItemsTableComparison()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-3xl">
              <button
                onClick={() => setShowVersionsModal(false)}
                className="bg-[#0f172a] text-white hover:bg-slate-800 font-bold px-6 py-2 rounded-xl transition-all cursor-pointer text-xs"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteVoucherId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">دڵنیایت لە سڕینەوە؟</h2>
            <p className="text-sm text-slate-500 mb-6">ئەم کردارە ناتوانرێت پێچەوانە بکرێتەوە.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDeleteVoucher}
                className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition cursor-pointer"
              >
                بەڵێ، بیڕەوە
              </button>
              <button
                onClick={() => setDeleteVoucherId(null)}
                className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                نەخێر، پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceReportPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">لە بارکردندایە...</div>}>
      <InvoiceReportContent />
    </Suspense>
  );
}

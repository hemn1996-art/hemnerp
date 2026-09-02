"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/store";
import PrintHeader from "../../components/PrintHeader";
import MultiSelectDropdown, { Option } from "../../components/MultiSelectDropdown";
import DateInput from "../../components/DateInput";
import { exportTableToExcel } from "../../utils/excelExport";
import { normalizeKurdishSearchText } from "../../utils/digits";

interface ExpenseVoucherLine {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  note: string | null;
}

interface ExpenseVoucher {
  id: number;
  referenceNo: string;
  type: string;
  date: string;
  accountId: number | null;
  accountName: string;
  accountType: string;
  cashboxId: number | null;
  cashboxName: string;
  currencyId: number;
  currencySymbol: string;
  currencyCode: string;
  exchangeRate: number;
  amount: number;
  totalDiscount: number;
  employeeName: string;
  note: string;
  itemNames: string[];
  itemSummaries: string[];
  mainItemName: string;
  lines: ExpenseVoucherLine[];
}

export default function ExpensesReportPage() {
  const router = useRouter();
  const { currencies, fetchCurrencies, accounts, fetchAccounts, cashboxes, fetchCashboxes } = useStore() as any;

  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [expenseProducts, setExpenseProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activePeriod, setActivePeriod] = useState<"today" | "week" | "month" | "year" | "all" | "custom">("month");

  // Helper date functions
  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return formatDateStr(d);
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return formatDateStr(d);
  });

  // Multi-select filters
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [selectedCashboxIds, setSelectedCashboxIds] = useState<number[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>("all");

  // Modals
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<ExpenseVoucher | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  // Column Visibility state (persisted to localStorage)
  const [visibleColumns, setVisibleColumns] = useState({
    index: true,
    referenceNo: true,
    date: true,
    productName: true,
    accountName: true,
    cashboxName: true,
    amount: true,
    note: true,
    employeeName: true,
    actions: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("expenses_report_visible_columns");
    if (saved) {
      try {
        setVisibleColumns(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {}
    }
  }, []);

  const handleToggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [col]: !prev[col] };
      localStorage.setItem("expenses_report_visible_columns", JSON.stringify(next));
      return next;
    });
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(50);

  useEffect(() => {
    fetchCurrencies();
    fetchAccounts();
    fetchCashboxes();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedAccountIds.length > 0) params.set("accountIds", selectedAccountIds.join(","));
      if (selectedProductIds.length > 0) params.set("productIds", selectedProductIds.join(","));
      if (selectedCashboxIds.length > 0) params.set("cashboxIds", selectedCashboxIds.join(","));
      if (selectedCurrencyId !== "all") params.set("currencyId", selectedCurrencyId);

      const res = await fetch(`/api/reports/expenses?${params.toString()}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.vouchers || []);
        if (data.expenseProducts) {
          setExpenseProducts(data.expenseProducts);
        }
      }
    } catch (err) {
      console.error("Failed to load expenses report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [startDate, endDate, selectedAccountIds, selectedProductIds, selectedCashboxIds, selectedCurrencyId]);

  // Quick period change handlers
  const handleSetPeriod = (period: "today" | "week" | "month" | "year" | "all" | "custom") => {
    setActivePeriod(period);
    if (period === "custom") return;

    const today = new Date();
    const todayStr = formatDateStr(today);

    if (period === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === "week") {
      const d = new Date(today);
      const day = d.getDay();
      const diff = (day + 1) % 7;
      d.setDate(d.getDate() - diff);
      setStartDate(formatDateStr(d));
      setEndDate(todayStr);
    } else if (period === "month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDateStr(d));
      setEndDate(todayStr);
    } else if (period === "year") {
      const d = new Date(today.getFullYear(), 0, 1);
      setStartDate(formatDateStr(d));
      setEndDate(todayStr);
    } else if (period === "all") {
      setStartDate("2020-01-01");
      setEndDate(todayStr);
    }
  };

  const handleCustomDateChange = (type: "start" | "end", val: string) => {
    setActivePeriod("custom");
    if (type === "start") setStartDate(val);
    if (type === "end") setEndDate(val);
  };

  // Product options for multi-select
  const productOptions: Option[] = useMemo(() => {
    return expenseProducts.map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [expenseProducts]);

  // Account options for multi-select
  const accountOptions: Option[] = useMemo(() => {
    return (accounts || []).map((a: any) => ({
      value: a.id,
      label: a.name,
    }));
  }, [accounts]);

  // Cashbox options for multi-select
  const cashboxOptions: Option[] = useMemo(() => {
    return (cashboxes || []).map((c: any) => ({
      value: c.id,
      label: c.name,
    }));
  }, [cashboxes]);

  // Client-side search and filtering
  const filteredVouchers = useMemo(() => {
    if (!searchTerm) return vouchers;
    const q = normalizeKurdishSearchText(searchTerm);
    return vouchers.filter((v) => {
      const matchRef = normalizeKurdishSearchText(v.referenceNo || "").includes(q);
      const matchAcc = normalizeKurdishSearchText(v.accountName || "").includes(q);
      const matchItems = normalizeKurdishSearchText(v.itemNames?.join(" ") || v.mainItemName || "").includes(q);
      const matchCashbox = normalizeKurdishSearchText(v.cashboxName || "").includes(q);
      const matchNote = normalizeKurdishSearchText(v.note || "").includes(q);
      const matchEmp = normalizeKurdishSearchText(v.employeeName || "").includes(q);
      return matchRef || matchAcc || matchItems || matchCashbox || matchNote || matchEmp;
    });
  }, [vouchers, searchTerm]);

  // Summary statistics (Converting all expenses into USD using each voucher's exchange rate)
  const summaryStats = useMemo(() => {
    let totalIQD = 0;
    let totalUSD = 0;
    let totalUSDConverted = 0;
    let count = filteredVouchers.length;

    filteredVouchers.forEach((v) => {
      const isIQD = v.currencyCode === "IQD" || v.currencySymbol === "دینار" || v.currencyId === 2 || v.currencyId === 12;
      if (isIQD) {
        totalIQD += v.amount;
        const rate = v.exchangeRate > 10000 ? v.exchangeRate / 100 : (v.exchangeRate > 0 ? v.exchangeRate : 1500);
        totalUSDConverted += v.amount / rate;
      } else {
        totalUSD += v.amount;
        totalUSDConverted += v.amount;
      }
    });

    return { totalIQD, totalUSD, totalUSDConverted, count };
  }, [filteredVouchers]);

  // Pagination slicing
  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredVouchers.length / (pageSize as number)) || 1;
  const paginatedVouchers = useMemo(() => {
    if (pageSize === "all") return filteredVouchers;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredVouchers.slice(start, start + (pageSize as number));
  }, [filteredVouchers, currentPage, pageSize]);

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportTableToExcel("expenses-report-table", `ڕاپۆرتی_خەرجی_${startDate}_بۆ_${endDate}`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    handleSetPeriod("month");
    setSelectedProductIds([]);
    setSelectedAccountIds([]);
    setSelectedCashboxIds([]);
    setSelectedCurrencyId("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Count modal sub-filters
  const modalFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedAccountIds.length > 0) count += selectedAccountIds.length;
    if (selectedCashboxIds.length > 0) count += selectedCashboxIds.length;
    if (selectedCurrencyId !== "all") count += 1;
    return count;
  }, [selectedAccountIds, selectedCashboxIds, selectedCurrencyId]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      {/* Print Only Header */}
      <div className="hidden print:block mb-6">
        <PrintHeader />
        <div className="text-center font-black text-lg py-2 border-b-2 border-slate-900 my-2">
          ڕاپۆرتی خەرجییەکان
        </div>
        <div className="flex justify-between items-center text-xs text-slate-700 border-b border-slate-300 pb-2 mb-4 font-semibold">
          <div>لە بەرواری: <span className="font-bold">{startDate}</span></div>
          <div>تا بەرواری: <span className="font-bold">{endDate}</span></div>
          <div>ژمارەی پسووڵەکان: <span className="font-bold">{summaryStats.count}</span></div>
          <div>کۆی خەرجی بە دۆلار: <span className="font-bold">$ {summaryStats.totalUSDConverted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      {/* Screen Header & Top Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl ring-1 ring-rose-100 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            ڕاپۆرتی خەرجییەکان
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            پیشاندان و پۆلێنکردنی سەرجەم پسووڵە و کەرەستە خەرجییەکان
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Filters Button (Modal Trigger with rich distinct color) */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 border ${
              modalFiltersCount > 0
                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-200"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
            }`}
            title="فلتەرە زیاترەکان"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>فلتەرەکان</span>
            {modalFiltersCount > 0 && (
              <span className="w-5 h-5 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs">
                {modalFiltersCount}
              </span>
            )}
          </button>

          {/* Columns Toggle Button */}
          <button
            onClick={() => setShowColumnsModal(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 border border-slate-200"
            title="دیاریکردنی کۆڵۆمەکان"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            کۆڵۆمەکان
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
            title="دەرهێنان بۆ ئێکسڵ"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ئێکسڵ
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            چاپکردن
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards (2 Boxes: Total USD converted, Total Count) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        {/* Total USD (All expenses converted to USD at voucher exchange rates) */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 p-4 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-500 mb-1">کۆی خەرجی بە دۆلار</div>
          <div className="text-2xl font-black text-blue-700 tracking-tight flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-blue-500">$</span>
            <span>
              {summaryStats.totalUSDConverted.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            (سەرجەم خەرجییەکان بە ڕەیتی کاتی پسووڵەکان)
          </div>
          <div className="absolute top-3 left-3 text-blue-200">
            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Total Count */}
        <div className="bg-gradient-to-br from-white to-amber-50/40 p-4 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-500 mb-1">ژمارەی پسووڵەکان</div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {summaryStats.count.toLocaleString("en-US")}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            (کۆی گشتی پسووڵە خەرجییە دۆزراوەکان)
          </div>
          <div className="absolute top-3 left-3 text-amber-200">
            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 print:hidden">
        {/* Main Row: Period Select + From Date + To Date + Expense Product Multi-Select */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 1 Box for Period - Reordered: Today, This Week, This Month, This Year, All, Custom */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">ماوە:</span>
              <select
                value={activePeriod}
                onChange={(e) => handleSetPeriod(e.target.value as any)}
                className="text-xs font-bold py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer text-slate-800"
              >
                <option value="today">ئەمڕۆ</option>
                <option value="week">ئەم هەفتەیە</option>
                <option value="month">ئەم مانگە</option>
                <option value="year">ئەمساڵ</option>
                <option value="all">کۆی گشتی</option>
                <option value="custom">دیاریکراو</option>
              </select>
            </div>

            {/* From Date (Wider unified DateInput box) */}
            <DateInput
              value={startDate}
              onChange={(val) => handleCustomDateChange("start", val)}
              label="لە بەرواری"
              className="w-48 text-xs font-bold py-1 px-1 bg-slate-50 border-slate-200 rounded-xl"
            />

            {/* To Date (Wider unified DateInput box) */}
            <DateInput
              value={endDate}
              onChange={(val) => handleCustomDateChange("end", val)}
              label="تا بەرواری"
              className="w-48 text-xs font-bold py-1 px-1 bg-slate-50 border-slate-200 rounded-xl"
            />

            {/* Multi-Select Expense Items (کەرەستەی خەرجی) */}
            <div className="min-w-[240px]">
              <MultiSelectDropdown
                label="هەموو کەرەستەکان"
                options={productOptions}
                selectedValues={selectedProductIds}
                onChange={setSelectedProductIds}
                pluralLabel="کەرەستە دیاریکراوە"
              />
            </div>
          </div>

          <div>
            {(selectedProductIds.length > 0 || modalFiltersCount > 0 || searchTerm.trim() !== "" || activePeriod !== "month") && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="پاککردنەوەی هەموو فلتەرەکان"
              >
                پاککردنەوەی فلتەر
              </button>
            )}
          </div>
        </div>

        {/* Live Search & Page Size */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="گەڕان بەدوای ژمارەی پسووڵە، کەرەستە، هەژمار، تێبینی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium py-2.5 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>نیشاندانی:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === "all" ? "all" : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold"
            >
              <option value={25}>٢٥</option>
              <option value={50}>٥٠</option>
              <option value={100}>١٠٠</option>
              <option value="all">هەمووی</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-500">خەریکی هێنانی داتای خەرجییەکان...</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm font-bold text-slate-700">هیچ پسووڵەیەکی خەرجی نەدۆزرایەوە</div>
            <p className="text-xs text-slate-400">فلتەرەکان بگۆڕە یان بەروارێکی تر دیاری بکە</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="expenses-report-table" className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-black">
                  {visibleColumns.index && <th className="py-3.5 px-3 text-center w-12">#</th>}
                  {visibleColumns.referenceNo && <th className="py-3.5 px-3 text-center w-24">ژمارەی پسووڵە</th>}
                  {visibleColumns.date && <th className="py-3.5 px-3 text-center w-28">بەروار</th>}
                  {visibleColumns.productName && <th className="py-3.5 px-4 text-center font-black text-rose-800">کەرەستەی خەرجی</th>}
                  {visibleColumns.accountName && <th className="py-3.5 px-4 text-center">هەژمار / لایەن</th>}
                  {visibleColumns.cashboxName && <th className="py-3.5 px-3 text-center">سندوق</th>}
                  {visibleColumns.amount && <th className="py-3.5 px-4 text-center font-black text-slate-900">بڕی خەرجی</th>}
                  {visibleColumns.note && <th className="py-3.5 px-4 text-center">تێبینی</th>}
                  {visibleColumns.employeeName && <th className="py-3.5 px-3 text-center w-24">کارمەند</th>}
                  {visibleColumns.actions && <th className="py-3.5 px-3 text-center w-20 print:hidden">کردار</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {paginatedVouchers.map((v, index) => {
                  const rowIndex = pageSize === "all" ? index + 1 : (currentPage - 1) * (pageSize as number) + index + 1;
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-default"
                    >
                      {/* Index */}
                      {visibleColumns.index && (
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">{rowIndex}</td>
                      )}

                      {/* Reference No - Clickable to open invoice in /invoices */}
                      {visibleColumns.referenceNo && (
                        <td className="py-3 px-3 text-center font-black">
                          <button
                            onClick={() => router.push(`/invoices?editId=${v.id}&type=${v.type}`)}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-lg transition-colors font-mono cursor-pointer shadow-xs border border-blue-100"
                            title="کردنەوەی پسووڵە بۆ نوێکردنەوە"
                          >
                            {v.referenceNo || v.id}
                          </button>
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3 px-3 text-center text-slate-600 font-mono whitespace-nowrap">
                          {v.date ? new Date(v.date).toLocaleDateString("en-CA") : "-"}
                        </td>
                      )}

                      {/* Expense Item (Centered & Product Name ONLY, no price attached) */}
                      {visibleColumns.productName && (
                        <td className="py-3 px-4 text-center font-bold text-rose-900">
                          {v.itemNames && v.itemNames.length > 0 ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              {v.itemNames.map((name, i) => (
                                <span key={i} className="inline-block bg-rose-50/80 text-rose-800 border border-rose-100 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-700">{v.mainItemName || "-"}</span>
                          )}
                        </td>
                      )}

                      {/* Account */}
                      {visibleColumns.accountName && (
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {v.accountName}
                        </td>
                      )}

                      {/* Cashbox */}
                      {visibleColumns.cashboxName && (
                        <td className="py-3 px-3 text-center font-bold text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {v.cashboxName}
                          </span>
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-3 px-4 text-center font-black text-slate-950 whitespace-nowrap">
                          <span className="text-sm">{Number(v.amount).toLocaleString("en-US")}</span>{" "}
                          <span className="text-[11px] font-bold text-slate-500">{v.currencySymbol}</span>
                        </td>
                      )}

                      {/* Notes (Centered) */}
                      {visibleColumns.note && (
                        <td className="py-3 px-4 text-center text-slate-600 max-w-xs truncate" title={v.note}>
                          {v.note || "-"}
                        </td>
                      )}

                      {/* Employee */}
                      {visibleColumns.employeeName && (
                        <td className="py-3 px-3 text-center text-slate-600 font-bold">
                          {v.employeeName}
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3 px-3 text-center print:hidden">
                          <button
                            onClick={() => setSelectedVoucherForModal(v)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-all cursor-pointer"
                            title="بینینی وردەکاری"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                  <td colSpan={visibleColumns.productName ? 4 : 3} className="py-3 px-4 text-left font-black">
                    کۆی گشتی خەرجییەکان:
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-center font-black">
                    <div className="space-y-0.5">
                      {summaryStats.totalIQD > 0 && (
                        <div>
                          {summaryStats.totalIQD.toLocaleString("en-US")}{" "}
                          <span className="text-[10px] text-slate-500">دینار</span>
                        </div>
                      )}
                      {summaryStats.totalUSD > 0 && (
                        <div>
                          ${" "}
                          {summaryStats.totalUSD.toLocaleString("en-US")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-center text-slate-500 font-bold">
                    {summaryStats.count} پسووڵە
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pageSize !== "all" && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs font-bold text-slate-600 print:hidden">
            <div>
              پەڕەی {currentPage} لە {totalPages} ({filteredVouchers.length} پسووڵە)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer transition-all"
              >
                پێشوو
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer transition-all ${
                      currentPage === pageNum
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer transition-all"
              >
                دواتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Filters (فلتەرەکان: سندوق، هەژمار، دراو) */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                فلتەرە زیاترەکان
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Multi-Select Accounts (هەژمار / لایەن) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  هەژمار / لایەن (چەندین هەڵبژاردن)
                </label>
                <MultiSelectDropdown
                  label="هەموو هەژمارەکان"
                  options={accountOptions}
                  selectedValues={selectedAccountIds}
                  onChange={setSelectedAccountIds}
                  pluralLabel="هەژمار دیاریکراوە"
                />
              </div>

              {/* Multi-Select Cashboxes (سندوق) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سندوق (چەندین هەڵبژاردن)
                </label>
                <MultiSelectDropdown
                  label="هەموو سندوقەکان"
                  options={cashboxOptions}
                  selectedValues={selectedCashboxIds}
                  onChange={setSelectedCashboxIds}
                  pluralLabel="سندوق دیاریکراوە"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دراو</label>
                <select
                  value={selectedCurrencyId}
                  onChange={(e) => setSelectedCurrencyId(e.target.value)}
                  className="w-full text-xs font-bold py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">هەموو دراوەکان</option>
                  {(currencies || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedAccountIds([]);
                  setSelectedCashboxIds([]);
                  setSelectedCurrencyId("all");
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                پاککردنەوەی ئەم فلتەرانە
              </button>

              <button
                onClick={() => setShowFilterModal(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                جێبەجێکردن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Columns (کۆڵۆمەکان) */}
      {showColumnsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                کۆڵۆمە دیاریکراوەکان
              </h3>
              <button
                onClick={() => setShowColumnsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {[
                { key: "index", label: "# (ڕیزبەندی)" },
                { key: "referenceNo", label: "ژمارەی پسووڵە" },
                { key: "date", label: "بەروار" },
                { key: "productName", label: "کەرەستەی خەرجی" },
                { key: "accountName", label: "هەژمار / لایەن" },
                { key: "cashboxName", label: "سندوق" },
                { key: "amount", label: "بڕی خەرجی" },
                { key: "note", label: "تێبینی" },
                { key: "employeeName", label: "کارمەند" },
                { key: "actions", label: "کردار" },
              ].map((col) => (
                <label
                  key={col.key}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold text-slate-700">{col.label}</span>
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                    onChange={() => handleToggleColumn(col.key as keyof typeof visibleColumns)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowColumnsModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                جێبەجێکردن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedVoucherForModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                وردەکاری پسووڵەی خەرجی #{selectedVoucherForModal.referenceNo || selectedVoucherForModal.id}
              </h3>
              <button
                onClick={() => setSelectedVoucherForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl text-xs font-bold">
              <div>
                <span className="text-slate-400 block text-[10px]">بەروار</span>
                <span className="text-slate-800 font-mono">
                  {selectedVoucherForModal.date ? new Date(selectedVoucherForModal.date).toLocaleString("en-GB") : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">هەژمار / لایەن</span>
                <span className="text-slate-800">{selectedVoucherForModal.accountName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">سندوق</span>
                <span className="text-slate-800">{selectedVoucherForModal.cashboxName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">بڕی گشتی</span>
                <span className="text-slate-950 font-black text-sm">
                  {Number(selectedVoucherForModal.amount).toLocaleString("en-US")} {selectedVoucherForModal.currencySymbol}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ڕەیتی دراو</span>
                <span className="text-slate-800 font-mono">
                  {selectedVoucherForModal.exchangeRate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">کارمەند</span>
                <span className="text-slate-800">{selectedVoucherForModal.employeeName}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-slate-400 block text-[10px]">تێبینی</span>
                <span className="text-slate-800">{selectedVoucherForModal.note || "-"}</span>
              </div>
            </div>

            {selectedVoucherForModal.lines && selectedVoucherForModal.lines.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-slate-700 mb-2">لیستی کەرەستە و بڕگەکان:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black">
                        <th className="py-2 px-3">کەرەستە</th>
                        <th className="py-2 px-3 text-center">ژمارە</th>
                        <th className="py-2 px-3 text-center">نرخی تاک</th>
                        <th className="py-2 px-3 text-center">کۆی گشتی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedVoucherForModal.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-bold text-slate-800">{l.productName}</td>
                          <td className="py-2 px-3 text-center font-bold">{l.qty}</td>
                          <td className="py-2 px-3 text-center font-bold">
                            {Number(l.unitPrice).toLocaleString("en-US")} {selectedVoucherForModal.currencySymbol}
                          </td>
                          <td className="py-2 px-3 text-center font-black text-slate-900">
                            {Number(l.lineTotal).toLocaleString("en-US")} {selectedVoucherForModal.currencySymbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedVoucherForModal(null);
                  router.push(`/invoices?editId=${selectedVoucherForModal.id}&type=${selectedVoucherForModal.type}`);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                دەستکاریکردنی ئەم پسووڵەیە
              </button>

              <button
                onClick={() => setSelectedVoucherForModal(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

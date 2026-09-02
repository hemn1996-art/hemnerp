"use client";

import MultiSelectDropdown from "../../components/MultiSelectDropdown";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { store, useStore } from "../../store/store";
import DateInput from "../../components/DateInput";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";

type DebtReportData = {
  id: number;
  name: string;
  phone: string;
  city: string;
  district: string;
  accountTypeName: string;
  exchangeRateType?: string;
  customExchangeRate?: number;
  totalDebt: number;
  balanceByCurrency: Record<string, number>;
  lastPaymentAmount: number;
  lastPaymentCurrencyId: number;
  lastPaymentDate: string | null;
  debtBeforeLastPaymentByCurrency: Record<string, number>;
};

interface Option {
  value: string | number;
  label: string;
}



export default function DebtReportPage() {
  const router = useRouter();
  const { accounts, accountTypes, fetchAccounts, fetchAccountTypes, currencies, fetchCurrencies } = useStore() as any;
  const [data, setData] = useState<DebtReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportStats, setShowReportStats] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<"totalDebt" | "lastPaymentDate" | null>("totalDebt"); // Default sort by totalDebt
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default descending

  const toggleSort = (field: "totalDebt" | "lastPaymentDate") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    const sorted = [...data];
    sorted.sort((a, b) => {
      if (sortField === "totalDebt") {
        const valA = a.totalDebt || 0;
        const valB = b.totalDebt || 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      } else if (sortField === "lastPaymentDate") {
        const timeA = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
        const timeB = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });
    return sorted;
  }, [data, sortField, sortDirection]);

  useEffect(() => {
    fetchAccounts();
    fetchAccountTypes();
    fetchCurrencies?.();

    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.showReportStats === "boolean") {
          setShowReportStats(parsed.showReportStats);
        }
      } catch (e) {}
    }
  }, []);

  const cityOptions = Array.from(new Set(accounts.map((a: any) => a.city).filter(Boolean))) as string[];

  const formatMoneyJSX = (val: number, curId: number) => {
    const currencyObj = currencies?.find((c: any) => c.id === curId);
    const code = currencyObj?.code;
    const isIQD = code === "IQD" || curId === 12 || currencyObj?.symbol === "دینار";
    const symbol = isIQD ? "دینار" : (currencyObj?.symbol || "$");

    if (isIQD) {
      const roundedVal = Math.round(Math.abs(val)).toLocaleString("en-US");
      return (
        <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: "3px" }} dir="ltr">
          <span style={{ fontSize: "0.85em" }} className="text-amber-600 font-bold">{symbol}</span>
          <span>{roundedVal}</span>
        </span>
      );
    }

    const formatted = Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const parts = formatted.split(".");
    const whole = parts[0];
    const dec = parts[1];

    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: "2px" }} dir="ltr">
        <span style={{ fontSize: "0.85em", opacity: 0.8 }}>{symbol}</span>
        <span>
          <span>{whole}</span>
          {dec && dec !== "0" && dec !== "00" && (
            <span style={{ fontSize: "0.7em", opacity: 0.8 }}>.{dec}</span>
          )}
        </span>
      </span>
    );
  };

  const isMicroBalance = (val: number, curIdText: string) => {
    const curId = Number(curIdText);
    const currencyObj = currencies?.find((c: any) => c.id === curId);
    const isIQD = curId === 2 || curId === 12 || currencyObj?.code === "IQD";
    if (isIQD) return Math.abs(val) < 1000;
    return Math.abs(val) < 1.0;
  };

  const renderBalance = (map: Record<string, number>) => {
    const entries = Object.entries(map || {}).filter(([curIdText, val]) => !isMicroBalance(val, curIdText));
    if (entries.length === 0) return <span className="text-gray-500 font-bold">0</span>;
    return (
      <div className="flex flex-col gap-1 items-center text-center">
        {entries.map(([curIdText, val]) => {
          const curId = Number(curIdText);
          const color = val > 0 ? "text-green-600" : val < 0 ? "text-red-500" : "text-gray-700";
          return (
            <span key={curIdText} className={`font-black ${color}`}>
              {formatMoneyJSX(val, curId)}
            </span>
          );
        })}
      </div>
    );
  };

  const [search, setSearch] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  
  const [filterAccountType, setFilterAccountType] = useState("all");
  const [filterAccountIds, setFilterAccountIds] = useState<number[]>([]);
  const [filterCity, setFilterCity] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterBeforeDate, setFilterBeforeDate] = useState("");
  const [filterDebtType, setFilterDebtType] = useState("people"); // "people", "mine"
  const [filterRateType, setFilterRateType] = useState("all"); // "all", "FIXED", "DAILY_MARKET"

  const defaultDebtCols = {
    account: true,
    phone: true,
    city: false,
    district: false,
    creditLimitExceeded: true,
    debtBeforeLastPayment: true,
    lastPaymentAmount: true,
    lastPaymentDate: true,
    totalDebt: true,
  };
  const [visibleColumns, setVisibleColumns] = useState(defaultDebtCols);
  const colsLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_debts_report_cols");
      if (stored) {
        setVisibleColumns(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.error(e);
    }
    colsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!colsLoadedRef.current) return;
    try {
      localStorage.setItem("__erp_debts_report_cols", JSON.stringify(visibleColumns));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns]);

  const activeFiltersCount = [
    filterAccountType !== "all",
    filterAccountIds.length > 0,
    filterCity !== "all",
    filterDistrict !== "all",
    filterBeforeDate !== "",
    filterRateType !== "all",
  ].filter(Boolean).length;

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterAccountType !== "all") params.append("accountTypeId", filterAccountType);
      if (filterAccountIds.length > 0) params.append("accountIds", filterAccountIds.join(","));
      if (filterCity !== "all") params.append("city", filterCity);
      if (filterDistrict !== "all") params.append("district", filterDistrict);
      if (filterBeforeDate) params.append("beforeDate", filterBeforeDate);
      if (filterDebtType !== "all") params.append("debtType", filterDebtType);

      const res = await fetch(`/api/reports/debts?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [search, filterAccountType, filterAccountIds, filterCity, filterDistrict, filterBeforeDate, filterDebtType]);

  const filteredData = useMemo(() => {
    let list = sortedData;
    if (quickSearch && quickSearch.trim() !== "") {
      const q = quickSearch.toLowerCase().trim();
      list = list.filter((item: any) => {
        const nameMatch = (item.name || item.accountName || "")?.toLowerCase().includes(q);
        const codeMatch = String(item.code || item.id || "")?.toLowerCase().includes(q);
        const phoneMatch = String(item.phone || "")?.toLowerCase().includes(q);
        const cityMatch = String(item.city || "")?.toLowerCase().includes(q);
        const districtMatch = String(item.district || "")?.toLowerCase().includes(q);
        return nameMatch || codeMatch || phoneMatch || cityMatch || districtMatch;
      });
    }
    return list;
  }, [sortedData, quickSearch]);

  const filteredByRateData = useMemo(() => {
    if (filterRateType === "all") return filteredData;
    if (filterRateType === "IQD") {
      const iqdCurIds = currencies?.filter((c: any) => c.code === "IQD" || c.id === 2 || c.id === 12 || c.symbol === "دینار").map((c: any) => String(c.id)) || ["2", "12"];
      return filteredData.filter((item) => {
        const map = item.balanceByCurrency || {};
        return Object.entries(map).some(([curIdText, val]) => {
          const numVal = Number(val || 0);
          return Math.abs(numVal) > 0.01 && (iqdCurIds.includes(curIdText) || curIdText === "2" || curIdText === "12");
        });
      });
    }
    return filteredData.filter((item) => (item.exchangeRateType || "DAILY_MARKET") === filterRateType);
  }, [filteredData, filterRateType, currencies]);

  const marketRatePerDollar = useMemo(() => {
    const iqdCur = currencies?.find((c: any) => c.code === "IQD" || c.id === 2 || c.id === 12);
    const rate = iqdCur?.rate || 1520;
    if (rate > 10000) return rate / 100;
    if (rate > 100) return rate;
    return 1520;
  }, [currencies]);

  const totalMarketUsdDebt = useMemo(() => {
    let sumUsd = 0;
    filteredByRateData.forEach((item) => {
      const map = item.balanceByCurrency || {};
      let itemTotalIqd = 0;
      for (const [curIdText, val] of Object.entries(map)) {
        const curId = Number(curIdText);
        const numVal = Number(val || 0);
        if (curId === 2 || curId === 12) {
          itemTotalIqd += numVal;
        } else {
          let rateForThisItem = marketRatePerDollar;
          if (item.exchangeRateType === "FIXED") {
            const customRatePer100 = item.customExchangeRate || 132000;
            rateForThisItem = customRatePer100 / 100;
          }
          itemTotalIqd += numVal * rateForThisItem;
        }
      }
      sumUsd += itemTotalIqd / marketRatePerDollar;
    });
    return Math.abs(sumUsd);
  }, [filteredByRateData, marketRatePerDollar]);

  const totalsBreakdown = useMemo(() => {
    let iqdSum = 0;
    let fixedUsdSum = 0;
    let dailyUsdSum = 0;

    filteredByRateData.forEach((item) => {
      const map = item.balanceByCurrency || {};
      const isFixed = item.exchangeRateType === "FIXED";

      for (const [curIdText, val] of Object.entries(map)) {
        const curId = Number(curIdText);
        const numVal = Number(val || 0);
        const curObj = currencies?.find((c: any) => c.id === curId);
        const isIQD = curObj?.code === "IQD" || curId === 2 || curId === 12 || curObj?.symbol === "دینار";

        if (isIQD) {
          iqdSum += numVal;
        } else {
          if (isFixed) {
            fixedUsdSum += numVal;
          } else {
            dailyUsdSum += numVal;
          }
        }
      }
    });

    return { iqdSum, fixedUsdSum, dailyUsdSum };
  }, [filteredByRateData, currencies]);

  const renderTotalsBreakdown = () => {
    const { iqdSum, fixedUsdSum, dailyUsdSum } = totalsBreakdown;
    const hasIqd = Math.abs(iqdSum) >= 1000;
    const hasFixedUsd = Math.abs(fixedUsdSum) >= 0.01;
    const hasDailyUsd = Math.abs(dailyUsdSum) >= 0.01;

    if (!hasIqd && !hasFixedUsd && !hasDailyUsd) {
      return <span className="text-gray-500 font-bold text-sm">0</span>;
    }

    const isPeople = filterDebtType === "people";
    const baseColorClass = isPeople ? "text-emerald-700" : "text-rose-600";

    return (
      <div className="flex flex-wrap items-center gap-2 mt-1" dir="rtl">
        {/* IQD (Orange Theme 🟠 matching Stock report) */}
        {hasIqd && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border-2 border-orange-300 shadow-sm">
            <span className="text-[11px] font-black text-orange-950 bg-orange-200/90 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>🟠</span>
              <span>دینار</span>
            </span>
            <span className={`text-base font-black ${baseColorClass}`}>
              {formatMoneyJSX(iqdSum, 12)}
            </span>
          </div>
        )}

        {/* Fixed USD (Purple Theme 🟣) */}
        {hasFixedUsd && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border-2 border-purple-300 shadow-sm">
            <span className="text-[11px] font-black text-purple-950 bg-purple-200/90 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>🟣</span>
              <span>دۆلاری جێگیر</span>
            </span>
            <span className={`text-base font-black ${baseColorClass}`}>
              {formatMoneyJSX(fixedUsdSum, 1)}
            </span>
          </div>
        )}

        {/* Daily USD (Blue Theme 🔵) */}
        {hasDailyUsd && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border-2 border-blue-300 shadow-sm">
            <span className="text-[11px] font-black text-blue-950 bg-blue-200/90 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>🔵</span>
              <span>دۆلاری ڕۆژ</span>
            </span>
            <span className={`text-base font-black ${baseColorClass}`}>
              {formatMoneyJSX(dailyUsdSum, 1)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 gap-3 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
            title="گەورەکردنی سایدبار"
          >
            ☰
          </button>
          <h1 className="text-xl font-black text-gray-800 m-0 flex items-center gap-2">
            ڕاپۆرتی قەرز
          </h1>
        </div>

        {/* Quick Search for Account Name */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="گەڕانی خێرا بەپێی ناوی هەژمار... 🔍"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-300 bg-white font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#061f5f] focus:border-[#061f5f] shadow-sm transition-all"
          />
          {quickSearch && (
            <button
              onClick={() => setQuickSearch("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold text-xs bg-gray-100 hover:bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center transition-colors cursor-pointer border-none"
              title="سڕینەوەی گەڕان"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
           <button
            onClick={() => setShowColumnsModal(true)}
            className="flex items-center justify-center gap-2 text-white font-black px-4 py-2 rounded-lg transition-transform hover:scale-105 cursor-pointer text-sm shadow-md border-none"
            style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#bae6fd" }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
            <span>کۆڵۆمەکان</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 hover:bg-gray-50 shadow-sm"
          >
            🖨️ پرینت
          </button>

          <button
            onClick={() => exportTableToExcel("debts-report-table", "raporti_qarzekan.xlsx")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-none shadow-sm"
          >
            ناردن بۆ ئێکسڵ 📊
          </button>
           <button
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-2 bg-[#061f5f] hover:bg-[#03133f] text-white rounded-lg text-sm font-bold transition-colors border-none cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
             <span>فلترەکان</span>
             {activeFiltersCount > 0 && (
               <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                 {activeFiltersCount}
               </span>
             )}
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterAccountType("all");
                setFilterAccountIds([]);
                setFilterCity("all");
                setFilterDistrict("all");
                setFilterBeforeDate("");
                setFilterRateType("all");
                setQuickSearch("");
              }}
              className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-sm font-bold transition-colors border-none cursor-pointer shadow-sm"
            >
               ڕێکخستنەوە
            </button>
          )}
        </div>
      </div>

      <div id="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی قەرز</h2>
        </div>


        {(() => {
          const visibleColCount = Object.values(visibleColumns).filter(Boolean).length;
          const containerWidthClass = visibleColCount <= 2 ? "max-w-4xl mx-auto w-full" : visibleColCount <= 4 ? "max-w-5xl mx-auto w-full" : "w-full";
          return (
            <>
              <div className={`bg-white p-4 rounded-xl shadow-sm mb-4 text-left flex justify-between items-center ${containerWidthClass}`}>
                <div className="flex gap-2">
                  <button onClick={() => setFilterDebtType("people")} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer border-none ${filterDebtType === "people" ? "bg-[#061f5f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>قەرزم لای خەڵک</button>
                  <button onClick={() => setFilterDebtType("mine")} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer border-none ${filterDebtType === "mine" ? "bg-[#061f5f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>من قەرزارم</button>
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                    <span className="text-xs font-black text-purple-900">جۆری دراو:</span>
                    <select
                      value={filterRateType}
                      onChange={(e) => setFilterRateType(e.target.value)}
                      className="bg-white text-purple-950 font-black text-xs px-2.5 py-1 rounded-md border border-purple-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">هەمووی</option>
                      <option value="DAILY_MARKET">دۆلاری ڕۆژ</option>
                      <option value="FIXED">دۆلاری جێگیر</option>
                      <option value="IQD">دینار</option>
                    </select>
                  </div>
                </div>
                {showReportStats && (
                  <div className="animate-in fade-in duration-200 flex items-center gap-6">
                    <div>
                      <div className="text-xs text-gray-500 font-bold mb-0.5">رەسیدی ناوی کۆمپانیاکان ({filterDebtType === "people" ? "قەرزم لای خەڵکە" : "من قەرزارم"})</div>
                      {renderTotalsBreakdown()}
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-2.5 px-4 rounded-xl border-2 border-amber-300 shadow-sm text-center">
                      <div className="text-xs text-amber-900 font-black">کۆی گشتی قەرز بە دۆلاری ڕۆژ</div>
                      {(() => {
                        const formatted = totalMarketUsdDebt.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                        const parts = formatted.split(".");
                        const dec = parts[1];
                        return (
                          <div dir="ltr" style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: "2px", direction: "ltr" }} className="text-2xl font-black text-amber-700">
                            <span>$</span>
                            <span>{parts[0]}</span>
                            {dec && dec !== "0" && dec !== "00" && (
                              <span style={{ fontSize: "0.75em", opacity: 0.85, fontWeight: "bold" }}>.{dec}</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Legend Banner explaining Fixed Rate Badge Color */}
              <div className={`flex items-center gap-3 px-4 py-3 mb-3 rounded-xl text-xs no-print overflow-hidden ${containerWidthClass}`}
                style={{
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #f3e8ff 100%)",
                  borderRight: "4px solid #7c3aed",
                  boxShadow: "0 1px 3px rgba(124, 58, 237, 0.1), 0 1px 2px rgba(124, 58, 237, 0.06)",
                }}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-black text-purple-900" style={{ fontSize: "13px" }}>تێبینی</span>
                  <span className="text-purple-800 font-semibold leading-relaxed" style={{ fontSize: "12px" }}>
                    ئەو باڵانسانەی بە <span className="font-black text-purple-950">ڕەنگی بنەوشەیی</span> نیشانکراون، <span className="font-black text-purple-950">هەژماری دۆلاری جێگیرن</span>. ماوسەکە لەسەری ڕابگرە تاوەکو بڕی نرخە جێگیرەکە ببینیت.
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className={`overflow-x-auto flex-1 ${containerWidthClass}`}>
                  <table id="debts-report-table" className="w-full text-center border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#03133f] text-white">
                <th className="p-3 font-bold text-sm text-center w-12">#</th>
                {visibleColumns.account && <th className="p-3 font-bold text-sm text-center">هەژمار</th>}
                {visibleColumns.phone && <th className="p-3 font-bold text-sm text-center">ژمارە تەلەفۆن</th>}
                {visibleColumns.city && <th className="p-3 font-bold text-sm text-center">شار</th>}
                {visibleColumns.district && <th className="p-3 font-bold text-sm text-center">گەڕەک</th>}
                {visibleColumns.creditLimitExceeded && <th className="p-3 font-bold text-sm text-center">سنووری قەرزی تێپەڕاندووە</th>}
                {visibleColumns.debtBeforeLastPayment && <th className="p-3 font-bold text-sm text-center">قەرزی پێش کۆتا پارەدان</th>}
                {visibleColumns.lastPaymentAmount && <th className="p-3 font-bold text-sm text-center">کۆتا پارەدان</th>}
                {visibleColumns.lastPaymentDate && (
                  <th 
                    onClick={() => toggleSort("lastPaymentDate")}
                    className="p-3 font-bold text-sm cursor-pointer select-none hover:bg-[#061f5f] transition-colors text-center"
                    title="کلیک بکە بۆ ڕیزکردنی بەرواری کۆتا پارەدان"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>بەرواری کۆتایی پارەدان</span>
                      {sortField === "lastPaymentDate" && (
                        <span className="text-xs">{sortDirection === "desc" ? "▼" : "▲"}</span>
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.totalDebt && (
                  <th 
                    onClick={() => toggleSort("totalDebt")}
                    className="p-3 font-bold text-sm cursor-pointer select-none hover:bg-[#061f5f] transition-colors text-center"
                    title="کلیک بکە بۆ ڕیزکردنی قەرزەکان"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>گشتی قەرز</span>
                      {sortField === "totalDebt" && (
                        <span className="text-xs">{sortDirection === "desc" ? "▼" : "▲"}</span>
                      )}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-gray-500">لە بارکردندایە...</td>
                </tr>
              ) : filteredByRateData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-gray-500">هیچ داتایەک نەدۆزرایەوە</td>
                </tr>
              ) : (
                filteredByRateData.map((item, index) => (
                  <tr key={item.id} className={`border-b border-slate-200 hover:bg-blue-50/60 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#f1f5f9]'}`}>
                    <td className="p-3 text-sm font-bold text-gray-400 text-center w-12">{index + 1}</td>
                    {visibleColumns.account && (
                      <td className="p-3 text-sm font-bold text-center">
                        <a href={`/reports/account-statement?accountId=${item.id}`} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                          {item.name}
                        </a>
                      </td>
                    )}
                    {visibleColumns.phone && <td className="p-3 text-sm text-gray-600 text-center" dir="ltr">{item.phone}</td>}
                    {visibleColumns.city && <td className="p-3 text-sm text-gray-600 text-center">{item.city}</td>}
                    {visibleColumns.district && <td className="p-3 text-sm text-gray-600 text-center">{item.district}</td>}
                    {visibleColumns.creditLimitExceeded && <td className="p-3 text-sm text-gray-500 text-center">نەخێر</td>}
                    {visibleColumns.debtBeforeLastPayment && <td className="p-3 text-sm font-semibold text-gray-700 text-center">{renderBalance(item.debtBeforeLastPaymentByCurrency)}</td>}
                    {visibleColumns.lastPaymentAmount && <td className="p-3 text-sm font-semibold text-gray-700 text-center">{item.lastPaymentAmount > 0 ? formatMoneyJSX(item.lastPaymentAmount, item.lastPaymentCurrencyId) : "—"}</td>}
                    {visibleColumns.lastPaymentDate && <td className="p-3 text-sm text-gray-600 text-center">{item.lastPaymentDate ? new Date(item.lastPaymentDate).toLocaleDateString() : "نییە"}</td>}
                    {visibleColumns.totalDebt && (
                      <td className="p-3 text-sm font-black text-center">
                        {item.exchangeRateType === "FIXED" ? (
                          <div
                            className="inline-flex flex-col items-center px-3.5 py-1.5 rounded-xl border-2 shadow-sm cursor-help transition-transform hover:scale-105"
                            style={{ backgroundColor: "#f3e8ff", borderColor: "#c084fc", color: "#6b21a8" }}
                            title={`نرخی جێگیری 100$: ${((item.customExchangeRate || 132000) > 10000 ? (item.customExchangeRate || 132000) : (item.customExchangeRate || 132000) * 100).toLocaleString("en-US")} دینار`}
                          >
                            <div className="text-base font-black">
                              {renderBalance(item.balanceByCurrency)}
                            </div>
                            <span className="text-xs font-black mt-0.5" style={{ color: "#7e22ce" }}>
                              📌 جێگیر: 100$ = {((item.customExchangeRate || 132000) > 10000 ? (item.customExchangeRate || 132000) : (item.customExchangeRate || 132000) * 100).toLocaleString("en-US")} د.ع
                            </span>
                          </div>
                        ) : (
                          renderBalance(item.balanceByCurrency)
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
            </div>
            </>
          );
        })()}
      </div>

      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
             <div className="p-4 flex justify-between items-center bg-[#061f5f] text-white">
               <div className="flex items-center gap-3">
                 <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-slate-300 border-none bg-transparent cursor-pointer text-lg font-bold">✕</button>
                 <h2 className="m-0 text-sm font-black">تایبەتمەندیەکانی فلتەرکردن</h2>
               </div>
               <button 
                 onClick={() => {
                   setFilterAccountType("all");
                   setFilterAccountIds([]);
                   setFilterCity("all");
                   setFilterDistrict("all");
                   setFilterBeforeDate("");
                   setFilterDebtType("all");
                 }} 
                 className="text-white hover:text-slate-300 bg-transparent border-none text-sm font-bold cursor-pointer"
               >
                 لابردنی هەموو 🗑️
               </button>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-6 text-right flex-1" dir="rtl">
               <style dangerouslySetInnerHTML={{__html: `
                 .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 12px; padding: 13px 16px; background: white; transition: border-color 0.2s; }
                 .mui-outline:focus-within { border-color: #0b1f50; }
                 .mui-outline label { position: absolute; top: -10px; right: 12px; background: white; padding: 0 6px; color: #475569; font-size: 11px; font-weight: bold; }
                 .mui-outline select, .mui-outline input { width: 100%; border: none; outline: none; background: transparent; font-size: 14px; color: #1e293b; font-weight: bold; cursor: pointer; }
                 .section-title { display: flex; align-items: center; gap: 8px; color: #0f172a; font-weight: 900; font-size: 13px; margin-bottom: 16px; }
                 .section-title::before { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
               `}} />

                {/* Section 1: Debt Details */}
                <div>
                   <h3 className="section-title flex-row-reverse">وردەکاری قەرز <span>🗂️</span></h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="mui-outline">
                        <label>بەرواری پێش کۆتا پارەدان</label>
                        <DateInput className="w-full border-none outline-none text-[13px] font-bold text-slate-800 bg-transparent" value={filterBeforeDate} onChange={val => setFilterBeforeDate(val)} />
                      </div>
                      <div className="mui-outline">
                        <label>جۆری قەرز</label>
                        <select className="w-full border-none outline-none bg-transparent font-bold cursor-pointer text-sm text-slate-800" value={filterDebtType} onChange={e => setFilterDebtType(e.target.value)}>
                          <option value="all">هەموو</option>
                          <option value="people">قەرزم لای خەڵکە</option>
                          <option value="mine">من قەرزارم</option>
                        </select>
                      </div>
                   </div>
                </div>

                {/* Section 2: Account Details */}
                <div>
                   <h3 className="section-title flex-row-reverse">زانیاری هەژمار <span>👤</span></h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="mui-outline">
                        <label>جۆری هەژمار</label>
                        <select className="w-full border-none outline-none bg-transparent font-bold cursor-pointer text-sm text-slate-800" value={filterAccountType} onChange={e => setFilterAccountType(e.target.value)}>
                          <option value="all">هەموو</option>
                          {accountTypes.map((type: any) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mui-outline opacity-60">
                        <label>کۆلێکشن</label>
                        <select
                          disabled
                          className="w-full border-none outline-none bg-transparent font-bold text-sm text-slate-400 cursor-not-allowed"
                        >
                          <option value="">دیاری نەکراوە</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <MultiSelectDropdown
                          label="هەژمارەکان"
                          options={accounts
                            .filter((acc: any) => {
                              if (filterAccountType !== "all" && acc.accountTypeId !== Number(filterAccountType)) return false;
                              if (filterCity !== "all" && acc.city !== filterCity) return false;
                              if (filterDistrict !== "all" && acc.district !== filterDistrict) return false;
                              return true;
                            })
                            .map((acc: any) => ({ value: acc.id, label: acc.name }))}
                          selectedValues={filterAccountIds}
                          onChange={setFilterAccountIds}
                          searchable
                        />
                      </div>
                    </div>
                </div>

                {/* Section 3: Location Details */}
                <div>
                   <h3 className="section-title flex-row-reverse">شوێن <span>📍</span></h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="mui-outline">
                        <label>شار</label>
                        <select className="w-full border-none outline-none bg-transparent font-bold cursor-pointer text-sm text-slate-800" value={filterCity} onChange={e => {
                          setFilterCity(e.target.value);
                          setFilterDistrict("all");
                        }}>
                          <option value="all">هەموو شارەکان</option>
                          {cityOptions.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mui-outline">
                        <label>گەڕەک / ناوچە</label>
                        <select className="w-full border-none outline-none bg-transparent font-bold cursor-pointer text-sm text-slate-800" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                          <option value="all">هەموو گەڕەکەکان</option>
                          {(() => {
                            const filteredDistricts = accounts
                              .filter((acc: any) => filterCity === "all" || acc.city === filterCity)
                              .map((acc: any) => acc.district)
                              .filter(Boolean);
                            const uniqueDistricts = Array.from(new Set(filteredDistricts)) as string[];
                            return uniqueDistricts.map((dist) => (
                              <option key={dist} value={dist}>{dist}</option>
                            ));
                          })()}
                        </select>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-start gap-4">
                <button 
                  onClick={() => setShowFilterModal(false)} 
                  className="px-6 py-2.5 bg-[#061f5f] hover:bg-[#03133f] text-white rounded-xl text-sm font-black transition cursor-pointer shadow-md border-none"
                >
                  جێبەجێکردن ✔️
                </button>
                <button 
                  onClick={() => setShowFilterModal(false)} 
                  className="text-slate-600 hover:text-slate-900 text-sm font-bold border-none bg-transparent cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
             </div>
          </div>
        </div>
      )}

      {showColumnsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#061f5f] text-white rounded-t-xl">
               <div className="flex items-center gap-2">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#38bdf8" }}>
                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                   <line x1="12" y1="3" x2="12" y2="21" />
                   <path d="M3 9h18" />
                   <path d="M3 15h18" />
                 </svg>
                 <h2 className="m-0 text-lg font-bold">کۆڵۆمە دیاریکراوەکان</h2>
               </div>
               <button onClick={() => setShowColumnsModal(false)} className="text-white hover:text-gray-200 bg-transparent border-none text-xl cursor-pointer">×</button>
             </div>
             
             <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {Object.entries({
                  account: "هەژمار",
                  phone: "ژمارە تەلەفۆن",
                  city: "شار",
                  district: "گەڕەک",
                  creditLimitExceeded: "سنووری قەرزی تێپەڕاندووە",
                  debtBeforeLastPayment: "قەرزی پێش کۆتا پارەدان",
                  lastPaymentAmount: "کۆتا پارەدان",
                  lastPaymentDate: "بەرواری کۆتایی پارەدان",
                  totalDebt: "گشتی قەرز",
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={visibleColumns[key as keyof typeof visibleColumns]}
                      onChange={(e) => setVisibleColumns((prev: any) => ({...prev, [key]: e.target.checked}))}
                    />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
             </div>
             
             <div className="p-4 border-t border-gray-100">
                <button onClick={() => setShowColumnsModal(false)} className="w-full px-6 py-2 bg-[#061f5f] hover:bg-[#03133f] text-white font-bold rounded-lg border-none cursor-pointer transition-colors">جێبەجێکردن</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

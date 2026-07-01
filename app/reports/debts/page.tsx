"use client";

import MultiSelectDropdown from "../../components/MultiSelectDropdown";
import React, { useEffect, useState, useRef, useMemo } from "react";
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
    const isRounding = currencyObj ? currencyObj.rounding : false;
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: isRounding ? 0 : 2
    });
    const symbol = currencyObj?.code === "IQD" || curId === 12 ? "دینار" : "$";
    const isNegative = val < 0;

    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: "4px" }} dir="ltr">
        {isNegative && <span>-</span>}
        <span>{symbol}</span>
        <span>{formatted}</span>
      </span>
    );
  };

  const renderBalance = (map: Record<string, number>) => {
    const entries = Object.entries(map || {}).filter(([, val]) => Math.abs(val) > 0.01);
    if (entries.length === 0) return <span className="text-gray-500 font-bold">0</span>;
    return (
      <div className="flex flex-col gap-1 items-center">
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  
  const [filterAccountType, setFilterAccountType] = useState("all");
  const [filterAccountIds, setFilterAccountIds] = useState<number[]>([]);
  const [filterCity, setFilterCity] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterBeforeDate, setFilterBeforeDate] = useState("");
  const [filterDebtType, setFilterDebtType] = useState("people"); // "people", "mine"

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

  const totalOverallDebt = data.reduce((sum, item) => sum + item.totalDebt, 0);

  const totalOverallByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((item) => {
      if (item.balanceByCurrency) {
        for (const [curIdText, amount] of Object.entries(item.balanceByCurrency)) {
          const val = Number(amount || 0);
          map[curIdText] = (map[curIdText] || 0) + val;
        }
      }
    });
    return map;
  }, [data]);

  const formatTotalOverallJSX = (map: Record<string, number>) => {
    const entries = Object.entries(map).filter(([, val]) => Math.abs(val) > 0.01);
    if (entries.length === 0) return <span className="text-gray-500 font-bold">0</span>;
    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: "8px" }} dir="ltr">
        {entries.map(([curIdText, val], index) => {
          const curId = Number(curIdText);
          return (
            <React.Fragment key={curIdText}>
              {index > 0 && <span className="text-gray-400">+</span>}
              {formatMoneyJSX(val, curId)}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 no-print">
        <div className="flex items-center gap-3">
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
        
        <div className="flex gap-2">
           <button
            onClick={() => setShowColumnsModal(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors border-none cursor-pointer"
          >
             کۆڵۆمەکان
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5"
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
            className="px-4 py-2 bg-[#061f5f] hover:bg-[#03133f] text-white rounded-lg text-sm font-bold transition-colors border-none cursor-pointer flex items-center gap-1.5"
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
              }}
              className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-sm font-bold transition-colors border-none cursor-pointer"
            >
               ڕێکخستنەوە
            </button>
          )}
          <input
            type="text"
            placeholder="گەڕان بەدوای ناو، ژمارە تەلەفۆن..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div id="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی قەرز</h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 text-left flex justify-between items-center">
         <div className="flex gap-2">
           <button onClick={() => setFilterDebtType("people")} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer border-none ${filterDebtType === "people" ? "bg-[#061f5f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>قەرزم لای خەڵک</button>
           <button onClick={() => setFilterDebtType("mine")} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer border-none ${filterDebtType === "mine" ? "bg-[#061f5f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>من قەرزارم</button>
         </div>
         {showReportStats && (
           <div className="animate-in fade-in duration-200">
             <div className="text-sm text-gray-500">گشتی قەرز ({filterDebtType === "people" ? "قەرزی خەڵک" : "قەرزی من"})</div>
              <div className={`text-2xl font-black ${filterDebtType === "people" ? "text-green-600" : "text-red-500"}`}>{formatTotalOverallJSX(totalOverallByCurrency)}</div>
           </div>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table id="debts-report-table" className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#03133f] text-white">
                {visibleColumns.account && <th className="p-3 font-bold text-sm">هەژمار</th>}
                {visibleColumns.phone && <th className="p-3 font-bold text-sm">ژمارە تەلەفۆن</th>}
                {visibleColumns.city && <th className="p-3 font-bold text-sm">شار</th>}
                {visibleColumns.district && <th className="p-3 font-bold text-sm">گەڕەک</th>}
                {visibleColumns.creditLimitExceeded && <th className="p-3 font-bold text-sm">سنووری قەرزی تێپەڕاندووە</th>}
                {visibleColumns.debtBeforeLastPayment && <th className="p-3 font-bold text-sm">قەرزی پێش کۆتا پارەدان</th>}
                {visibleColumns.lastPaymentAmount && <th className="p-3 font-bold text-sm">کۆتا پارەدان</th>}
                {visibleColumns.lastPaymentDate && (
                  <th 
                    onClick={() => toggleSort("lastPaymentDate")}
                    className="p-3 font-bold text-sm cursor-pointer select-none hover:bg-[#061f5f] transition-colors"
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
                    className="p-3 font-bold text-sm cursor-pointer select-none hover:bg-[#061f5f] transition-colors"
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
                  <td colSpan={10} className="p-4 text-center text-gray-500">لە بارکردندایە...</td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">هیچ داتایەک نەدۆزرایەوە</td>
                </tr>
              ) : (
                sortedData.map((item, index) => (
                  <tr key={item.id} className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    {visibleColumns.account && (
                      <td className="p-3 text-sm font-bold">
                        <a href={`/reports/account-statement?accountId=${item.id}`} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                          {item.name}
                        </a>
                      </td>
                    )}
                    {visibleColumns.phone && <td className="p-3 text-sm text-gray-600" dir="ltr">{item.phone}</td>}
                    {visibleColumns.city && <td className="p-3 text-sm text-gray-600">{item.city}</td>}
                    {visibleColumns.district && <td className="p-3 text-sm text-gray-600">{item.district}</td>}
                    {visibleColumns.creditLimitExceeded && <td className="p-3 text-sm text-gray-500">نەخێر</td>}
                    {visibleColumns.debtBeforeLastPayment && <td className="p-3 text-sm font-semibold text-gray-700">{renderBalance(item.debtBeforeLastPaymentByCurrency)}</td>}
                    {visibleColumns.lastPaymentAmount && <td className="p-3 text-sm font-semibold text-gray-700">{item.lastPaymentAmount > 0 ? formatMoneyJSX(item.lastPaymentAmount, item.lastPaymentCurrencyId) : "—"}</td>}
                    {visibleColumns.lastPaymentDate && <td className="p-3 text-sm text-gray-600">{item.lastPaymentDate ? new Date(item.lastPaymentDate).toLocaleDateString() : "نییە"}</td>}
                    {visibleColumns.totalDebt && <td className="p-3 text-sm font-black">{renderBalance(item.balanceByCurrency)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                          <option value="people">قەرزی خەڵک</option>
                          <option value="mine">قەرزی من</option>
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
               <h2 className="m-0 text-lg font-bold">کۆڵۆمە دیاریکراوەکان</h2>
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

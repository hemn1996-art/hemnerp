"use client";

import { useEffect, useState, useRef } from "react";
import { store, useStore } from "../../store/store";
import DateInput from "../../components/DateInput";

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

export default function DebtReportPage() {
  const { accounts, accountTypes, fetchAccounts, fetchAccountTypes } = useStore();
  const [data, setData] = useState<DebtReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
    fetchAccountTypes();
  }, []);

  const cityOptions = Array.from(new Set(accounts.map((a: any) => a.city).filter(Boolean))) as string[];

  const formatMoney = (val: number, curId: number) => {
    if (curId === 2) {
      return `${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} دینار`;
    }
    return `$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
            <span key={curIdText} className={`font-black ${color}`} dir="ltr">
              {val < 0 ? "-" : ""}{formatMoney(val, curId)}
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

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterAccountType !== "all") params.append("accountTypeId", filterAccountType);
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
  }, [search, filterAccountType, filterCity, filterDistrict, filterBeforeDate, filterDebtType]);

  const totalOverallDebt = data.reduce((sum, item) => sum + item.totalDebt, 0);

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4">
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
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-2 bg-[#061f5f] hover:bg-[#03133f] text-white rounded-lg text-sm font-bold transition-colors border-none cursor-pointer"
          >
             فلترەکان
          </button>
          <input
            type="text"
            placeholder="گەڕان بەدوای ناو، ژمارە تەلەفۆن..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 text-left flex justify-between items-center">
         <div className="flex gap-2">
           <button onClick={() => setFilterDebtType("people")} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer border-none ${filterDebtType === "people" ? "bg-[#061f5f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>قەرزم لای خەڵک</button>
           <button onClick={() => setFilterDebtType("mine")} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer border-none ${filterDebtType === "mine" ? "bg-[#061f5f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>من قەرزارم</button>
         </div>
         <div>
           <div className="text-sm text-gray-500">گشتی قەرز ({filterDebtType === "people" ? "قەرزی خەڵک" : "قەرزی من"})</div>
           <div className={`text-2xl font-black ${filterDebtType === "people" ? "text-green-600" : "text-red-500"}`}>${Math.abs(totalOverallDebt).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#03133f] text-white">
                {visibleColumns.account && <th className="p-3 font-bold text-sm">هەژمار</th>}
                {visibleColumns.phone && <th className="p-3 font-bold text-sm">ژمارە تەلەفۆن</th>}
                {visibleColumns.city && <th className="p-3 font-bold text-sm">شار</th>}
                {visibleColumns.district && <th className="p-3 font-bold text-sm">گەڕەک</th>}
                {visibleColumns.creditLimitExceeded && <th className="p-3 font-bold text-sm">سنووری قەرزی تێپەڕاندووە</th>}
                {visibleColumns.debtBeforeLastPayment && <th className="p-3 font-bold text-sm">قەرزی پێش کۆتا پارەدان</th>}
                {visibleColumns.lastPaymentAmount && <th className="p-3 font-bold text-sm">کۆتا پارەدان</th>}
                {visibleColumns.lastPaymentDate && <th className="p-3 font-bold text-sm">بەرواری کۆتایی پارەدان</th>}
                {visibleColumns.totalDebt && <th className="p-3 font-bold text-sm">گشتی قەرز</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">لە بارکردندایە...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">هیچ داتایەک نەدۆزرایەوە</td>
                </tr>
              ) : (
                data.map((item, index) => (
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
                    {visibleColumns.lastPaymentAmount && <td className="p-3 text-sm font-semibold text-gray-700" dir="ltr">{item.lastPaymentAmount > 0 ? formatMoney(item.lastPaymentAmount, item.lastPaymentCurrencyId) : "—"}</td>}
                    {visibleColumns.lastPaymentDate && <td className="p-3 text-sm text-gray-600">{item.lastPaymentDate ? new Date(item.lastPaymentDate).toLocaleDateString() : "نییە"}</td>}
                    {visibleColumns.totalDebt && <td className="p-3 text-sm font-black">{renderBalance(item.balanceByCurrency)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#061f5f] text-white rounded-t-xl">
               <h2 className="m-0 text-lg font-bold">تایبەتمەندیەکانی فلتەرکردن</h2>
               <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-gray-200 bg-transparent border-none text-xl cursor-pointer">×</button>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-6 text-right" dir="rtl">
                {/* Section 1: Debt Details */}
                <div>
                   <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><span className="text-lg">🗂️</span> وردەکاری قەرز</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">بەرواری پێش کۆتا پارەدان</label>
                        <DateInput className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none bg-white" value={filterBeforeDate} onChange={val => setFilterBeforeDate(val)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">جۆری قەرز</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none bg-white font-bold" value={filterDebtType} onChange={e => setFilterDebtType(e.target.value)}>
                          <option value="all">هەموو</option>
                          <option value="people">قەرزی خەڵک</option>
                          <option value="mine">قەرزی من</option>
                        </select>
                      </div>
                   </div>
                </div>

                {/* Section 2: Account Details */}
                <div>
                   <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><span className="text-lg">👤</span> زانیاری هەژمار</h3>
                   <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">جۆری هەژمار</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none bg-white font-bold" value={filterAccountType} onChange={e => setFilterAccountType(e.target.value)}>
                          <option value="all">هەموو</option>
                          {accountTypes.map((type: any) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                </div>

                {/* Section 3: Location Details */}
                <div>
                   <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><span className="text-lg">📍</span> شوێن</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">شار</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none bg-white font-bold" value={filterCity} onChange={e => {
                          setFilterCity(e.target.value);
                          setFilterDistrict("all");
                        }}>
                          <option value="all">هەموو شارەکان</option>
                          {cityOptions.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">گەڕەک / ناوچە</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none bg-white font-bold" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
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
              
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => {
                  setFilterAccountType("all");
                  setFilterCity("all");
                  setFilterDistrict("all");
                  setFilterBeforeDate("");
                  setFilterDebtType("all");
                  setShowFilterModal(false);
                }} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg border-none cursor-pointer transition-colors flex-1">لابردنی هەموو</button>
                <button onClick={() => setShowFilterModal(false)} className="px-6 py-2 bg-[#061f5f] hover:bg-[#03133f] text-white font-bold rounded-lg border-none cursor-pointer transition-colors flex-1">جێبەجێکردن</button>
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

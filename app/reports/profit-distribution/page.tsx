"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "../../store/store";
import { useRouter } from "next/navigation";
import PrintHeader from "../../components/PrintHeader";

const formatDateToDMY = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // DD.MM.YYYY
  }
  return dateStr;
};

const formatRateWithCommas = (val: string) => {
  if (!val) return "";
  const clean = val.replace(/,/g, "");
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function CustomDatePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date(value || Date.now()));

  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value));
    }
  }, [value]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(year, month, day);
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const kurdishMonths = [
    "کانوونی دووەم (١)",
    "شوبات (٢)",
    "ئازار (٣)",
    "نیسان (٤)",
    "ئایار (٥)",
    "حوزەیران (٦)",
    "تەمووز (٧)",
    "ئاب (٨)",
    "ئەیلوول (٩)",
    "تشرینی یەکەم (١٠)",
    "تشرینی دووەم (١١)",
    "کانوونی یەکەم (١٢)"
  ];

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }

  const selectedDayNum = value ? new Date(value).getDate() : null;
  const selectedMonthNum = value ? new Date(value).getMonth() : null;
  const selectedYearNum = value ? new Date(value).getFullYear() : null;

  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = d === selectedDayNum && month === selectedMonthNum && year === selectedYearNum;
    days.push(
      <button
        key={`day-${d}`}
        type="button"
        onClick={() => handleDayClick(d)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
          isSelected 
            ? "bg-[#0b1f50] text-white shadow" 
            : "hover:bg-slate-100 text-slate-700"
        }`}
      >
        {d}
      </button>
    );
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.custom-calendar-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative custom-calendar-container">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm hover:border-[#0b1f50] transition-colors bg-white cursor-pointer select-none"
      >
        <span className="bg-gray-50 px-3 py-2 text-sm font-bold text-gray-500 border-l border-gray-300">
          بەروار
        </span>
        <span className="px-3 py-2 text-sm text-gray-700 font-bold text-center w-36">
          {formatDateToDMY(value)}
        </span>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 w-64 text-right select-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3 flex-row-reverse">
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              ◀
            </button>
            <div className="text-sm font-black text-slate-800">
              {kurdishMonths[month]} {year}
            </div>
            <button 
              type="button" 
              onClick={handleNextMonth} 
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] mb-2 flex-row-reverse">
            <div>ی</div>
            <div>د</div>
            <div>س</div>
            <div>چ</div>
            <div>پ</div>
            <div>ه</div>
            <div>ش</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
            {days}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfitDistributionPage() {
  const router = useRouter();
  const currentUser = useStore((s: any) => s.currentUser);
  const { currencies, fetchCurrencies } = useStore() as any;

  // Tabs: "distribute" (Form) and "history" (List/Receipt)
  const [activeTab, setActiveTab] = useState<"distribute" | "history">("distribute");

  // State for new distribution
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [distributionNote, setDistributionNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [profitBreakdownExpanded, setProfitBreakdownExpanded] = useState(false);

  // Custom Date and Rate filters
  const [asOfDate, setAsOfDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [dollarRate, setDollarRate] = useState<string>("");
  const [userEditedRate, setUserEditedRate] = useState(false);

  // State for history
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDist, setSelectedDist] = useState<any>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Redirect non-admins
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  useEffect(() => {
    fetchCurrencies?.();
    fetchHistory();
  }, []);

  useEffect(() => {
    fetchData(asOfDate, dollarRate);
  }, [asOfDate]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const fetchData = async (targetDate?: string, targetRate?: string) => {
    try {
      setLoading(true);
      const dateToUse = targetDate || asOfDate;
      const rateToUse = targetRate || dollarRate;

      let url = `/api/reports/balance-sheet?asOfDate=${dateToUse}`;
      if (rateToUse) {
        url += `&exchangeRate=${parseFloat(rateToUse) / 100}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!userEditedRate && json.exchangeRate) {
          setDollarRate(String(json.exchangeRate));
        } else if (json.exchangeRate && !rateToUse) {
          setDollarRate(String(json.exchangeRate));
        }
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/reports/profit-distribution");
      if (res.ok) {
        const json = await res.json();
        setHistoryData(json);
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveDistribution = async (calculatedProfit: number, distributedProfit: number, shareholders: any[]) => {
    if (shareholders.length === 0) {
      showToast("هیچ خاوەن پشکێک نییە بۆ دابەشکردن ❌", "error");
      return;
    }

    const totalSharePercentage = shareholders.reduce((sum: number, sh: any) => sum + (sh.sharePercentage || 0), 0);
    if (totalSharePercentage !== 100) {
      showToast("کۆی ڕێژەی پشکەکان دەبێت ١٠٠% بێت پێش دابەشکردن ⚠️", "error");
      return;
    }

    try {
      setIsSaving(true);
      const items = shareholders.map((sh: any) => {
        const previousBalance = sh.balanceUSD || 0;
        const profitShare = distributedProfit * ((sh.sharePercentage || 0) / 100);
        const finalBalance = previousBalance + profitShare;
        return {
          accountId: sh.id,
          accountName: sh.name,
          sharePercentage: sh.sharePercentage || 0,
          previousBalance,
          profitShare,
          finalBalance
        };
      });

      const res = await fetch("/api/reports/profit-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculatedProfit,
          distributedProfit,
          note: distributionNote,
          items,
          date: asOfDate,
        })
      });

      if (res.ok) {
        showToast("قازانج بە سەرکەوتوویی دابەشکرا و خەزن کرا ✅", "success");
        setDistributionNote("");
        fetchData();
        fetchHistory();
        setActiveTab("history");
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "خەزنکردن سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("خەزنکردن سەرکەوتوو نەبوو ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const fmt = (n: number) => {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + " $";
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="p-12 text-center text-slate-500 text-lg">
        ڕێگەت پێدراو نییە بۆ بینینی ئەم پەڕەیە
      </div>
    );
  }

  // Calculation variables
  const warehouseValue = data?.assets?.warehouseValue || 0;
  const cash = data?.assets?.cash || 0;
  const accountsReceivable = data?.assets?.accountsReceivable || 0;
  const otherAssets = data?.assets?.allInventory || 0;
  const myDebts = data?.liabilitiesEquity?.myDebts || 0;
  const capital = data?.liabilitiesEquity?.capital || 0;
  const calculatedProfit = warehouseValue + cash + accountsReceivable + otherAssets - myDebts - capital;
  const profitToDistribute = calculatedProfit;
  const shareholders = (data?.shareholders || []).filter((sh: any) => sh.isActive !== false);
  const totalSharePercentage = shareholders.reduce((sum: number, sh: any) => sum + (sh.sharePercentage || 0), 0);

  return (
    <div className="p-0 bg-[#f8f9fb] min-h-screen font-ckb text-slate-700">
      
      {/* Toast Banner */}
      {toastMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[9999] border backdrop-blur-md transition-all animate-bounce ${
          toastType === "success" 
            ? "bg-emerald-500/90 text-white border-emerald-400" 
            : "bg-red-500/90 text-white border-red-400"
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>{toastType === "success" ? "✅" : "❌"}</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-[#0b1f50] text-white p-4 flex items-center justify-between no-print">
        <h1 className="text-lg font-bold">📊 بەڕێوەبردنی دابەشکردنی قازانج</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab("distribute");
              setSelectedDist(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "distribute" ? "bg-emerald-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            دابەشکردنی نوێ 💰
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "history" ? "bg-emerald-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            مێژووی دابەشکاری 📋
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-bold">خەریکی بارکردنی داتایە...</div>
        ) : activeTab === "distribute" ? (
          /* TAB 1: FORM VIEW */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 no-print">
            
            {/* Header info */}
            <div className="text-right border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800">حیسابکردنی قازانجی دابەشکار پێش چوونە ناو هەژماری هاوبەشەکان</h2>
            </div>

            {/* Date and Rate Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-row-reverse text-right font-bold">
              <div className="flex items-center gap-3 flex-row-reverse">
                {/* Date Input */}
                <CustomDatePicker 
                  value={asOfDate}
                  onChange={(val) => {
                    setAsOfDate(val);
                    setUserEditedRate(false); // Reset userEditedRate so it pulls the day's default rate
                  }}
                />

                {/* Dollar Rate Input */}
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white flex-row-reverse">
                  <span className="bg-gray-50 px-3 py-2 text-sm font-bold text-gray-500 border-r border-gray-300">ڕەیتی دۆلار (١٠٠$)</span>
                  <input 
                    type="text" 
                    className="px-3 py-2 text-sm text-gray-700 outline-none w-32 font-bold text-center" 
                    value={formatRateWithCommas(dollarRate)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, "");
                      if (/^\d*$/.test(raw)) {
                        setDollarRate(raw);
                        setUserEditedRate(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        fetchData(asOfDate, dollarRate);
                      }
                    }}
                  />
                  <button 
                    onClick={() => fetchData(asOfDate, dollarRate)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 text-sm transition cursor-pointer border-none h-full"
                  >
                    بەکارهێنان
                  </button>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 font-bold">
                وردەکارییەکانی قازانج بەپێی بەروار و ڕەیتی دیاریکراو حیساب دەکرێن
              </div>
            </div>

            {/* Calculated profit */}
            <div
              id="profit-comp-box"
              onClick={() => {
                const nextState = !profitBreakdownExpanded;
                setProfitBreakdownExpanded(nextState);
                if (nextState) {
                  setTimeout(() => {
                    document.getElementById("profit-comp-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 100);
                }
              }}
              className="bg-gradient-to-l from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-5 cursor-pointer hover:border-emerald-500 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <div className="text-emerald-700 font-bold text-sm mb-1">قازانجی فعلی</div>
                  <div className="text-3xl font-black text-emerald-800" dir="ltr">
                    {fmt(calculatedProfit)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                  <span>{profitBreakdownExpanded ? '▲ شاردنەوەی وردەکاری' : '▼ کلیک بکە بۆ بینینی وردەکاری'}</span>
                </div>
              </div>

              {/* Breakdown */}
              {profitBreakdownExpanded && (
                <div className="mt-4 pt-4 border-t border-emerald-200 space-y-2 flex flex-col items-end">
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700" dir="ltr">{fmt(warehouseValue)}</span>
                      <span className="text-slate-500 font-bold">بەهای کۆگا 📦</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700" dir="ltr">{fmt(cash)}</span>
                      <span className="text-slate-500 font-bold">کاش 💵</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700" dir="ltr">{fmt(accountsReceivable)}</span>
                      <span className="text-slate-500 font-bold">قەرزی خەڵک 📋</span>
                    </div>
                    {otherAssets > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-700" dir="ltr">{fmt(otherAssets)}</span>
                        <span className="text-slate-500 font-bold">مەوجودات 🏢</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-red-600" dir="ltr">-{fmt(myDebts)}</span>
                      <span className="text-red-500 font-bold">قەرزی من 💳</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-red-600" dir="ltr">-{fmt(capital)}</span>
                      <span className="text-red-500 font-bold">سەرمایەی خاوەن پشکەکان 🏦</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-emerald-300">
                      <span className="font-black text-emerald-800 text-base" dir="ltr">{fmt(calculatedProfit)}</span>
                      <span className="text-emerald-700 font-black">کۆی قازانجی فعلی</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right">
              <label className="block text-sm font-bold text-slate-600 mb-2">تێبینی دابەشکردن:</label>
              <input
                type="text"
                value={distributionNote}
                onChange={(e) => setDistributionNote(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 bg-white text-right"
                placeholder="تێبینی بنووسە..."
              />
            </div>

            {/* Distribution Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200">
                    <th className="py-3 px-2 text-slate-500 font-bold text-xs w-10 text-center">#</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-right">خاوەن پشک</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">ڕێژەی پشکداری</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">باڵانسی پێشوو</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">بەشەی قازانج</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">باڵانسی کۆتایی</th>
                  </tr>
                </thead>
                <tbody>
                  {shareholders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                        هیچ خاوەن پشکێک نەدۆزرایەوە
                      </td>
                    </tr>
                  ) : (
                    shareholders.map((sh: any, index: number) => {
                      const previousBalance = sh.balanceUSD || 0;
                      const profitShare = profitToDistribute * ((sh.sharePercentage || 0) / 100);
                      const finalBalance = previousBalance + profitShare;

                      return (
                        <tr key={sh.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-2 text-slate-400 text-xs font-bold text-center">{index + 1}</td>
                          <td className="py-3 px-4 text-slate-800 font-bold text-sm text-right">{sh.name}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-blue-100 text-blue-700 font-black text-xs px-3 py-1 rounded-full">
                              {sh.sharePercentage || 0}%
                            </span>
                          </td>
                          <td className={`py-3 px-4 font-black text-sm text-center ${previousBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">
                            {previousBalance < 0 ? '-' : ''}$ {Math.abs(previousBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-black text-sm text-center text-blue-700" dir="ltr">
                            $ {profitShare.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-3 px-4 font-black text-sm text-center ${finalBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">
                            {finalBalance < 0 ? '-' : ''}$ {Math.abs(finalBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Total Row */}
                  {shareholders.length > 0 && (
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td className="py-3 px-2"></td>
                      <td className="py-3 px-4 text-slate-800 font-black text-sm text-right">کۆ</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-black text-xs px-3 py-1 rounded-full ${totalSharePercentage === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {totalSharePercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-sm text-center text-slate-700" dir="ltr">
                        {(() => {
                          const total = shareholders.reduce((sum: number, sh: any) => sum + (sh.balanceUSD || 0), 0);
                          return <>{total < 0 ? '-' : ''}$ {Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</>;
                        })()}
                      </td>
                      <td className="py-3 px-4 font-black text-sm text-center text-blue-700" dir="ltr">
                        $ {profitToDistribute.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-black text-sm text-center text-slate-700" dir="ltr">
                        {(() => {
                          const total = shareholders.reduce((sum: number, sh: any) => {
                            const prev = sh.balanceUSD || 0;
                            const profit = profitToDistribute * ((sh.sharePercentage || 0) / 100);
                            return sum + prev + profit;
                          }, 0);
                          return <>{total < 0 ? '-' : ''}$ {Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</>;
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalSharePercentage !== 100 && (
                <div className="mt-3 text-center text-amber-600 font-bold text-xs bg-amber-50 border border-amber-200 rounded-xl p-3">
                  ⚠️ کۆی ڕێژەکان {totalSharePercentage}% ە بەڵام دەبێت ١٠٠% بێت. دەتوانیت ڕێژەکان لە بەشی خاوەن پشکەکان لە میزانیە یان بەشی ڕاپۆرتەکە ڕێک بخەیت.
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex justify-start">
              <button
                disabled={isSaving || totalSharePercentage !== 100}
                onClick={() => handleSaveDistribution(calculatedProfit, profitToDistribute, shareholders)}
                className={`px-6 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition cursor-pointer border-none flex items-center gap-1.5 shadow-md ${
                  (isSaving || totalSharePercentage !== 100) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? "چاوەڕوانبە..." : "خەزنکردن و دابەشکردن 💾"}
              </button>
            </div>

          </div>
        ) : (
          /* TAB 2: HISTORY / RECEIPTS LIST */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            
            {selectedDist ? (
              /* RECEIPT VIEW */
              <div className="space-y-6">
                
                {/* Back button & print */}
                <div className="flex justify-between items-center no-print">
                  <button
                    onClick={() => setSelectedDist(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border-none cursor-pointer"
                  >
                    ⬅ گەڕانەوە بۆ لیست
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-[#0b1f50] hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition border-none cursor-pointer flex items-center gap-1"
                  >
                    پرینتکردنی پسووڵە 🖨️
                  </button>
                </div>

                <div id="print-area" className="space-y-6 text-right" dir="rtl">
                  {/* Watermark / Header for print */}
                  <div className="hidden print:block text-center border-b pb-4 mb-4">
                    <h1 className="text-xl font-bold text-slate-800">ڕاپۆرتی میزانیە</h1>
                    <p className="text-xs text-slate-500">پسووڵەی دابەشکردنی قازانج بەسەر خاوەن پشکەکاندا</p>
                  </div>

                  {/* Receipt Meta */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 print:bg-white p-4 rounded-2xl border border-slate-100">
                    <div>
                      <div className="text-xs text-slate-400 font-bold">بەرواری دابەشکردن</div>
                      <div className="text-sm font-bold text-slate-800">
                        {new Date(selectedDist.date).toLocaleDateString("en-US")} {new Date(selectedDist.date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-bold">ژمارەی پسووڵە</div>
                      <div className="text-sm font-bold text-slate-800">#{selectedDist.id}</div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-slate-400 font-bold">قازانجی فعلی</div>
                      <div className="text-sm font-bold text-slate-800" dir="ltr">${selectedDist.calculatedProfit.toLocaleString("en-US")}</div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-slate-400 font-bold">کۆی قازانجی دابەشکراو</div>
                      <div className="text-sm font-black text-emerald-700" dir="ltr">${selectedDist.distributedProfit.toLocaleString("en-US")}</div>
                    </div>
                    {selectedDist.note && (
                      <div className="col-span-2 mt-2 pt-2 border-t border-slate-200/60">
                        <div className="text-xs text-slate-400 font-bold">تێبینی</div>
                        <div className="text-sm font-medium text-slate-700">{selectedDist.note}</div>
                      </div>
                    )}
                  </div>

                  {/* Shareholders Breakdown */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-600 mb-3 print:mb-2">وردەکاری بەشی هاوبەشەکان:</h3>
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="py-2 px-2 text-slate-500 font-bold text-xs text-center">#</th>
                          <th className="py-2 px-4 text-slate-500 font-bold text-xs text-right">ناو</th>
                          <th className="py-2 px-4 text-slate-500 font-bold text-xs text-center">ڕێژە</th>
                          <th className="py-2 px-4 text-slate-500 font-bold text-xs text-center">باڵانسی پێشوو</th>
                          <th className="py-2 px-4 text-slate-500 font-bold text-xs text-center">بەشەی وەرگیراو</th>
                          <th className="py-2 px-4 text-slate-500 font-bold text-xs text-center">باڵانسی کۆتایی</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDist.items.map((item: any, i: number) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="py-2.5 px-2 text-slate-400 text-xs font-bold text-center">{i + 1}</td>
                            <td className="py-2.5 px-4 text-slate-800 font-bold text-sm text-right">{item.accountName}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full">
                                {item.sharePercentage}%
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-xs text-center" dir="ltr">
                              ${item.previousBalance.toLocaleString("en-US")}
                            </td>
                            <td className="py-2.5 px-4 font-black text-sm text-center text-emerald-600" dir="ltr">
                              +${item.profitShare.toLocaleString("en-US")}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-xs text-center" dir="ltr">
                              ${item.finalBalance.toLocaleString("en-US")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : loadingHistory ? (
              <div className="text-center py-12 text-slate-400 font-bold">خەریکی هێنانی داتاکانە...</div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold">هیچ مێژوویەکی دابەشکردن نییە</div>
            ) : (
              /* LIST VIEW */
              <div className="overflow-x-auto text-right" dir="rtl">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="py-3 px-2 text-slate-500 font-bold text-xs w-12 text-center">#</th>
                      <th className="py-3 px-4 text-slate-500 font-bold text-xs text-right">بەروار</th>
                      <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">قازانجی فعلی</th>
                      <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">قازانجی دابەشکراو</th>
                      <th className="py-3 px-4 text-slate-500 font-bold text-xs text-right">تێبینی</th>
                      <th className="py-3 px-4 text-slate-500 font-bold text-xs w-28 text-center">کردار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((dist, index) => (
                      <tr 
                        key={dist.id}
                        onClick={() => setSelectedDist(dist)}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-2 text-slate-400 text-xs font-bold text-center">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium text-xs text-right">
                          {new Date(dist.date).toLocaleDateString("en-US")} {new Date(dist.date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-bold text-xs text-center" dir="ltr">
                          ${dist.calculatedProfit.toLocaleString("en-US")}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 font-black text-sm text-center" dir="ltr">
                          ${dist.distributedProfit.toLocaleString("en-US")}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs text-right max-w-[200px] truncate">{dist.note || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDist(dist);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border-none"
                          >
                            پسووڵە 📄
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

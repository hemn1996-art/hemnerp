"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DateInput from "../../components/DateInput";
import { useStore } from "../../store/store";

export default function ProfitReportPage() {
  const router = useRouter();
  const { currencies, fetchCurrencies } = useStore() as any;
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number>(1);
  
  const [data, setData] = useState({
    sales: 0,
    cogs: 0,
    salesProfit: 0,
    myDebtDiscount: 0,
    expenses: 0,
    gifts: 0,
    peopleDebtDiscount: 0,
    losses: 0,
    finalProfit: 0,
    receivables: 0,
    payables: 0,
    cash: 0,
    bank: 0,
    warehouseValue: 0,
    currencySymbol: "$",
  });
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("currencyId", String(selectedCurrencyId));

      const res = await fetch(`/api/reports/profit?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedCurrencyId]);

  const handleCardClick = (type: string) => {
    if (type === "sales") {
      router.push("/reports/invoices?type=sales");
    }
  };

  // Format currency helper
  const formatCur = (num: number) => {
    const symbol = data.currencySymbol || "$";
    const formatted = Math.abs(num).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 2});
    const isNegative = num < 0;
    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", direction: "ltr" }}>
        {isNegative && <span style={{ marginRight: "2px" }}>-</span>}
        <span style={{ fontSize: "0.8em", opacity: 0.7, marginRight: "4px" }}>
          {symbol}
        </span>
        <span>{formatted}</span>
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-l from-[#061f5f] to-[#03133f] rounded-3xl shadow-xl mb-8 p-6 lg:p-8 text-white relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-400 opacity-10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
              className="sidebar-toggle-btn items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all cursor-pointer text-xl shadow-lg shrink-0"
              title="گەورەکردنی سایدبار"
            >
              ☰
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black m-0 tracking-tight flex items-center gap-3">
                <span>ڕاپۆرتی قازانجی گشتی</span>
                <span className="text-3xl">📊</span>
              </h1>
              <p className="text-blue-200 mt-1 text-sm md:text-base font-medium">پوختەی دارایی و قازانجی پاکی سیستەمەکە لەماوەی دیاریکراودا</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner w-full lg:w-auto">
            <div className="flex flex-1 md:flex-none items-center gap-3 bg-black/20 rounded-xl p-2 px-3 border border-white/5 min-w-[120px]">
              <label className="text-sm font-bold text-blue-100 whitespace-nowrap">دراو:</label>
              <select
                value={selectedCurrencyId}
                onChange={(e) => setSelectedCurrencyId(Number(e.target.value))}
                className="bg-transparent text-white border-none focus:outline-none focus:ring-0 font-bold cursor-pointer w-full text-sm outline-none"
                style={{ colorScheme: "dark" }}
              >
                {currencies && currencies.map((c: any) => (
                  <option key={c.id} value={c.id} className="text-slate-800">
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-1 md:flex-none items-center gap-3 bg-black/20 rounded-xl p-2 px-3 border border-white/5 min-w-[140px]">
              <label className="text-sm font-bold text-blue-100 whitespace-nowrap">لە:</label>
              <DateInput
                className="bg-transparent text-white border-none focus:outline-none focus:ring-0 font-bold cursor-pointer w-full text-sm"
                style={{ colorScheme: "dark" }}
                value={startDate}
                onChange={(val) => setStartDate(val)}
              />
            </div>
            
            <div className="hidden md:block text-blue-300 font-bold">»</div>
            
            <div className="flex flex-1 md:flex-none items-center gap-3 bg-black/20 rounded-xl p-2 px-3 border border-white/5 min-w-[140px]">
              <label className="text-sm font-bold text-blue-100 whitespace-nowrap">تا:</label>
              <DateInput
                className="bg-transparent text-white border-none focus:outline-none focus:ring-0 font-bold cursor-pointer w-full text-sm"
                style={{ colorScheme: "dark" }}
                value={endDate}
                onChange={(val) => setEndDate(val)}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 border-4 border-slate-200 border-t-[#061f5f] rounded-full animate-spin shadow-md"></div>
          <p className="mt-6 text-[#061f5f] font-black text-xl animate-pulse">لە بارکردندایە...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full pb-10 space-y-6">

          {/* TOP ROW - 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* فرۆش - Sales */}
            <div
              onClick={() => handleCardClick("sales")}
              className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-black text-lg m-0">فرۆش</h3>
                <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🛒</div>
              </div>
              <div className="text-2xl font-black text-slate-800 mb-2" dir="ltr">{formatCur(data.sales)}</div>
              <p className="text-xs text-slate-400 font-medium m-0">کۆی گشتی فرۆش دوای گەڕاندنەوە</p>
            </div>

            {/* دەسمایە - COGS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-black text-lg m-0">دەسمایە</h3>
                <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📦</div>
              </div>
              <div className="text-2xl font-black text-slate-800 mb-2" dir="ltr">{formatCur(data.cogs)}</div>
              <p className="text-xs text-slate-400 font-medium m-0">کۆی گشتی دەسمایەی فرۆش دوای گەڕاندنەوە</p>
            </div>

            {/* قازانجی فرۆش - Sales Profit */}
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-emerald-900 font-black text-lg m-0">قازانجی فرۆش</h3>
                <div className="w-11 h-11 bg-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center text-xl shadow-inner">📈</div>
              </div>
              <div className="text-2xl font-black text-emerald-800 mb-2" dir="ltr">{formatCur(data.salesProfit)}</div>
              <p className="text-xs text-emerald-500 font-medium m-0">کۆی گشتی قازانجی فرۆش دوای گەڕاندنەوە</p>
            </div>

            {/* داشکاندن لە قەرزی من - My Debt Discount */}
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-emerald-900 font-black text-lg m-0">داشکاندن لە قەرزی من</h3>
                <div className="w-11 h-11 bg-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center text-xl shadow-inner">💲</div>
              </div>
              <div className="text-2xl font-black text-emerald-800 mb-2" dir="ltr">{formatCur(data.myDebtDiscount)}</div>
              <p className="text-xs text-emerald-500 font-medium m-0">بڕی پارەی داشکێنراو لە پسووڵەی کڕین، پارەی ڕۆشتوو و قەرزی من</p>
            </div>
          </div>

          {/* BOTTOM ROW - 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

            {/* خەرجی - Expenses (combined: expenses + warehouse damage + material) */}
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-sm hover:shadow-lg hover:border-rose-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-rose-900 font-black text-lg m-0">خەرجی</h3>
                <div className="w-11 h-11 bg-rose-200 text-rose-700 rounded-xl flex items-center justify-center text-xl shadow-inner">💸</div>
              </div>
              <div className="text-2xl font-black text-rose-800 mb-2" dir="ltr">{formatCur(data.expenses + data.losses)}</div>
              <p className="text-xs text-rose-500 font-medium m-0">کۆی گشتی (خەرجی، خەسارەی کۆگا، سەرفی مەواد)</p>
            </div>


            {/* داشکاندن لە قەرزی خەڵک - People Debt Discount */}
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-sm hover:shadow-lg hover:border-rose-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-rose-900 font-black text-lg m-0">داشکاندن لە قەرزی خەڵک</h3>
                <div className="w-11 h-11 bg-rose-200 text-rose-700 rounded-xl flex items-center justify-center text-xl shadow-inner">✂️</div>
              </div>
              <div className="text-2xl font-black text-rose-800 mb-2" dir="ltr">{formatCur(data.peopleDebtDiscount)}</div>
              <p className="text-xs text-rose-500 font-medium m-0">بڕی پارەی داشکێنراو لە پسووڵەی فرۆشتن، پارەی هاتوو، قەرزی خەڵک</p>
            </div>

            {/* قازانجی کۆتایی - Final Profit */}
            <div className={`p-5 rounded-2xl border shadow-sm hover:shadow-lg transition-all ${data.finalProfit >= 0 ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400" : "bg-rose-50 border-rose-200 hover:border-rose-400"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-black text-lg m-0">قازانجی کۆتایی</h3>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner ${data.finalProfit >= 0 ? "bg-emerald-200 text-emerald-700" : "bg-rose-200 text-rose-700"}`}>{data.finalProfit >= 0 ? "📈" : "📉"}</div>
              </div>
              <div className={`text-2xl font-black mb-2 ${data.finalProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`} dir="ltr">{formatCur(data.finalProfit)}</div>
              <p className="text-xs text-slate-400 font-medium m-0">کۆی گشتی قازانجی کۆتایی</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

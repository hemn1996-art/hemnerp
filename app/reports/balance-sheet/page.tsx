"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "../../store/store";

export default function BalanceSheetPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { currencies, fetchCurrencies } = useStore() as any;

  const [asOfDate, setAsOfDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [currencyId, setCurrencyId] = useState("all");
  const [currencyLabel, setCurrencyLabel] = useState("دینار");
  const [defaultCurrencyId, setDefaultCurrencyId] = useState("all");

  useEffect(() => {
    fetchCurrencies?.();
  }, [fetchCurrencies]);

  useEffect(() => {
    if (currencies && currencies.length > 0) {
      const iqd = currencies.find((c: any) => c.code === "IQD");
      const defaultId = iqd ? iqd.id.toString() : currencies[0].id.toString();
      setDefaultCurrencyId(defaultId);
      if (currencyId === "all") {
        setCurrencyId(defaultId);
        setCurrencyLabel(iqd ? iqd.symbol : currencies[0].symbol);
      }
    }
  }, [currencies]);

  useEffect(() => {
    fetchData();
  }, []);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (currencyId !== defaultCurrencyId) count++;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (asOfDate !== todayStr) count++;
    return count;
  }, [currencyId, defaultCurrencyId, asOfDate]);

  const handleResetFilters = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setAsOfDate(todayStr);
    
    const iqd = currencies?.find((c: any) => c.code === "IQD");
    const defaultId = iqd ? iqd.id.toString() : (currencies?.[0]?.id.toString() || "all");
    
    setCurrencyId(defaultId);
    setCurrencyLabel(iqd ? iqd.symbol : (currencies?.[0]?.symbol || "دینار"));
    fetchData(todayStr, defaultId);
  };

  const fetchData = async (customAsOfDate?: string, customCurrencyId?: string) => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.append("asOfDate", customAsOfDate !== undefined ? customAsOfDate : asOfDate);
      const activeCurr = customCurrencyId !== undefined ? customCurrencyId : currencyId;
      if (activeCurr !== "all") query.append("currencyId", activeCurr);

      const res = await fetch(`/api/reports/balance-sheet?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.currencySymbol) setCurrencyLabel(json.currencySymbol);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    fetchData();
  };

  const fmt = (n: number) => {
    const symbol = data?.currencySymbol || currencyLabel;
    const activeCurrency = currencies?.find((c: any) => c.id.toString() === currencyId.toString() || c.symbol === symbol || c.code === symbol);
    const isRounding = activeCurrency ? activeCurrency.rounding : false;
    return n.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: isRounding ? 0 : 2 
    }) + " " + symbol;
  };

  return (
    <div className="p-0 bg-[#f8f9fb] min-h-screen font-ckb text-slate-700">

      {/* Top Header */}
      <div className="bg-[#0b1f50] text-white p-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">ڕاپۆرتی میزانیە</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap items-center justify-end gap-2 no-print">
        <button onClick={() => setShowFilterModal(true)}
          className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-4 py-2.5 rounded-md hover:bg-[#061f5f] transition-colors cursor-pointer text-sm shadow-sm">
          <span>فلتەرەکان ☰</span>
          {activeFiltersCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {activeFiltersCount > 0 && (
          <button onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 bg-rose-100 border border-rose-300 text-rose-700 font-bold px-4 py-2.5 rounded-md hover:bg-rose-200 transition-colors cursor-pointer text-sm shadow-sm">
            🔄 ڕێکخستنەوە
          </button>
        )}
        <button onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-md hover:bg-slate-50 transition-colors cursor-pointer text-sm shadow-sm">
          پرینت 🖨️
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-lg">خەریکی هێنانی داتاکانە...</div>
      ) : data ? (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">

          {/* RIGHT: Assets (موجودات) */}
          <div className="bg-white rounded border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200 p-4 flex items-center justify-end gap-2">
              <h2 className="text-base font-bold text-blue-700">موجودات</h2>
              <span className="text-blue-500">🏛</span>
            </div>

            {/* موجودات ئێستا */}
            <div className="border-b border-slate-100 p-3 pr-5 text-right text-sm text-slate-500 font-bold">
              موجودات ئێستا
            </div>

            {/* کاش */}
            <div className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.assets.cash)}</span>
              <span className="text-sm text-slate-500">کاش</span>
            </div>

            {/* بەدەی کۆگا */}
            <div className="flex items-center justify-between p-3 pr-5 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.assets.warehouseValue)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">بەهای کۆگا</span>
                <span className="text-slate-400 text-xs">📦</span>
              </div>
            </div>

            {/* قەرزی جەلکک */}
            <div className="flex items-center justify-between p-3 pr-5 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.assets.accountsReceivable)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">قەرزی خەڵک</span>
                <span className="text-slate-400 text-xs">📋</span>
              </div>
            </div>

            {/* موجودات دیکەی */}
            <div className="border-b border-slate-100 p-3 pr-5 text-right text-sm text-slate-500 font-bold">
              موجودات جێگیر
            </div>

            {/* هەموو موجودەکان */}
            <div className="flex items-center justify-between p-3 pr-5 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm text-slate-600">{fmt(data.assets.allInventory)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">هەموو موجوداتەکان</span>
                <span className="text-slate-400 text-xs">📊</span>
              </div>
            </div>

            {/* Total */}
            <div className="bg-slate-50 border-t border-slate-300 p-4 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">{fmt(data.assets.total)}</span>
              <span className="text-sm font-bold text-slate-600">کۆی موجودات</span>
            </div>
          </div>

          {/* LEFT: Liabilities & Equity (قەرز و سەرمایە) */}
          <div className="bg-white rounded border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200 p-4 flex items-center justify-end gap-2">
              <h2 className="text-base font-bold text-slate-700">قەرز و سەرمایە</h2>
              <span className="text-slate-500">🏦</span>
            </div>

            {/* قەرزی ئێستا */}
            <div className="border-b border-slate-100 p-3 pr-5 text-right text-sm text-slate-500 font-bold">
              قەرزی ئێستا
            </div>

            {/* قەرزی من */}
            <div className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm text-slate-800">{fmt(data.liabilitiesEquity.myDebts)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">قەرزی من</span>
                <span className="text-slate-400 text-xs">💳</span>
              </div>
            </div>

            {/* مافی خاوەندارێتی */}
            <div className="border-b border-slate-100 p-3 pr-5 text-right text-sm text-slate-500 font-bold">
              مافی خاوەندارێتی
            </div>

            {/* سەرمایە */}
            <div className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.liabilitiesEquity.capital)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">سەرمایەی خاوەن پشکەکان</span>
                <span className="text-slate-400 text-xs">💰</span>
              </div>
            </div>

            {/* قازانجی سافی */}
            <div className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition bg-green-50/50">
              <span className="text-sm font-bold text-green-700">{fmt(data.liabilitiesEquity.annualProfit)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">قازانجی سافی</span>
                <span className="text-green-400 text-xs">📈</span>
              </div>
            </div>

            {/* دەرکردنی پارە */}
            <div className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition bg-red-50/30">
              <span className="text-sm text-red-500">-{fmt(data.liabilitiesEquity.withdrawals)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">دەرکردنی پارە (خاوەن پشکەکان)</span>
                <span className="text-slate-400 text-xs">💸</span>
              </div>
            </div>

            {/* Total */}
            <div className="bg-slate-50 border-t border-slate-300 p-4 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">{fmt(data.liabilitiesEquity.total)}</span>
              <span className="text-sm font-bold text-slate-600">کۆی قەرز و سەرمایە</span>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center text-red-500">هەڵەیەک ڕوویدا لە هێنانی داتاکان</div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-slate-300">✕</button>
                <h2 className="font-bold text-lg">ئۆپشنەکانی فلتەرکردن</h2>
              </div>
              <button onClick={handleResetFilters} className="text-white hover:text-slate-300 flex items-center gap-2 text-sm font-bold">
                <span>لابردنی هەموو</span> 🗑
              </button>
            </div>

            <div className="p-6 bg-white text-right space-y-8">
              <style dangerouslySetInnerHTML={{__html: `
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 12px; padding: 13px 16px; background: white; transition: border-color 0.2s; min-height: 48px; }
                .mui-outline:focus-within { border-color: #0b1f50; }
                .mui-outline label { position: absolute; top: -10px; right: 12px; background: white; padding: 0 6px; color: #0b1f50; font-size: 12px; font-weight: bold; }
                .mui-outline input, .mui-outline select { width: 100%; outline: none; background: transparent; font-size: 14px; font-weight: bold; color: #334155; }
                .section-title { display: flex; align-items: center; gap: 8px; color: #475569; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
                .section-title::before { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
              `}} />

              {/* Date */}
              <div>
                <div className="section-title flex-row-reverse">بەروار <span>📅</span></div>
                <div className="mui-outline">
                  <label>بەرواری</label>
                  <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
                </div>
              </div>

              {/* Currency */}
              <div>
                <div className="section-title flex-row-reverse">فلتەرە سەرەکییەکان <span>⚙</span></div>
                <div className="mui-outline">
                  <label>دراو</label>
                  <select value={currencyId} onChange={e => {
                    setCurrencyId(e.target.value);
                    const sel = e.target.options[e.target.selectedIndex];
                    setCurrencyLabel(e.target.value === "all" ? "دینار" : sel.text.split(" - ")[0] || "$");
                  }}>
                    {currencies?.map((c: any) => <option key={c.id} value={c.id}>{c.symbol} - {c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-start gap-4">
              <button onClick={applyFilters} className="px-6 py-2 bg-[#0b1f50] text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition flex items-center gap-2">
                جێبەجێکردنی فلتەرەکان <span>✔</span>
              </button>
              <button onClick={() => setShowFilterModal(false)} className="text-slate-600 hover:text-slate-900 text-sm font-medium">پاشگەزبوونەوە</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

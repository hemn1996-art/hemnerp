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

  useEffect(() => {
    fetchCurrencies?.();
  }, [fetchCurrencies]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.append("asOfDate", asOfDate);
      if (currencyId !== "all") query.append("currencyId", currencyId);

      const res = await fetch(`/api/reports/balance-sheet?${query.toString()}`);
      if (res.ok) {
        setData(await res.json());
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
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) + " " + currencyLabel;
  };

  return (
    <div className="p-0 bg-[#f8f9fb] min-h-screen font-ckb text-slate-700">

      {/* Top Header */}
      <div className="bg-[#0b1f50] text-white p-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">ڕاپۆرتی میزانیە</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap items-center justify-end gap-2">
        <button onClick={() => setShowFilterModal(true)}
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-1.5 rounded text-xs hover:bg-blue-700 transition font-bold">
          ☰ فلتەرەکان
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
          🖨 پرینت
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
                <span className="text-sm text-slate-500">سەرمایە</span>
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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-slate-300">✕</button>
                <h2 className="font-bold text-lg">ئۆپشنەکانی فلتەرکردن</h2>
              </div>
              <button className="text-white hover:text-slate-300 flex items-center gap-2 text-sm">
                <span>لابردنی هەموو</span> 🗑
              </button>
            </div>

            <div className="p-6 bg-white text-right space-y-8">
              <style dangerouslySetInnerHTML={{__html: `
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 14px; background: white; }
                .mui-outline label { position: absolute; top: -10px; right: 10px; background: white; padding: 0 6px; color: #64748b; font-size: 11px; }
                .mui-outline input, .mui-outline select { width: 100%; outline: none; background: transparent; font-size: 14px; color: #334155; }
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
                    <option value="all">$</option>
                    {currencies?.map((c: any) => <option key={c.id} value={c.id}>{c.symbol} - {c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-start gap-4">
              <button onClick={applyFilters} className="px-6 py-2 bg-[#0b1f50] text-white rounded text-sm font-bold hover:bg-slate-800 transition flex items-center gap-2">
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

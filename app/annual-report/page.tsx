"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

// Format numbers with commas
function formatNumber(num: number | string, decimals: number = 2): string {
  if (num === "" || num === null || num === undefined) return "0";
  const n = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
  if (isNaN(n)) return "0";
  
  if (decimals === 0 || Math.floor(n) === n) {
    return Math.round(n).toLocaleString("en-US");
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Clean number input parsing
function parseNumberInput(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/,/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export default function AnnualBalanceSheetReportPage() {
  // Navigation screen: "landing" | "detailed"
  const [currentView, setCurrentView] = useState<"landing" | "detailed">("landing");

  // Exchange rate: default 170,000 IQD per 100 USD (i.e. 1,700 IQD / 1 USD)
  const [exchangeRatePer100, setExchangeRatePer100] = useState<number>(170000);
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [rateInputVal, setRateInputVal] = useState<string>("170,000");

  // Modals state
  const [activeModal, setActiveModal] = useState<"none" | "warehouse" | "cash_usd" | "cash_iqd" | "debts" | "actual_profit_formula">("none");

  // Password Protection for Profit Section
  const [isProfitUnlocked, setIsProfitUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Profit calculation inputs & tabs
  const [profitTab, setProfitTab] = useState<"sarhad" | "karwan">("sarhad");

  // Base Data Constants
  const WAREHOUSE_USD = 40823;
  const DEBTS_USD = 145620;
  const DEBTS_IQD = 1350000;
  const TOTAL_CAPITAL_USD = 420000; // 420,000$ base
  const CASH_USD = 185000;
  const CASH_IQD = 8160000;

  // Rate factor: 1 USD in IQD
  const singleUsdToIqd = exchangeRatePer100 / 100;

  // Converted values based on dynamic exchange rate
  const convertedValues = useMemo(() => {
    // Warehouse in IQD
    const warehouseIqd = WAREHOUSE_USD * singleUsdToIqd;

    // Debts combined
    const debtsIqdInUsd = DEBTS_IQD / (singleUsdToIqd || 1);
    const debtsCombinedUsd = DEBTS_USD + debtsIqdInUsd;
    const debtsCombinedIqd = (DEBTS_USD * singleUsdToIqd) + DEBTS_IQD;

    // Cash combined
    const cashIqdInUsd = CASH_IQD / (singleUsdToIqd || 1);
    const cashCombinedUsd = CASH_USD + cashIqdInUsd;
    const cashCombinedIqd = (CASH_USD * singleUsdToIqd) + CASH_IQD;

    // Total enterprise assets (Warehouse + Debts + Cash)
    const totalAssetsUsd = WAREHOUSE_USD + debtsCombinedUsd + cashCombinedUsd;
    const totalAssetsIqd = warehouseIqd + debtsCombinedIqd + cashCombinedIqd;

    // Capital in IQD
    const totalCapitalIqd = TOTAL_CAPITAL_USD * singleUsdToIqd;

    return {
      warehouseIqd,
      debtsCombinedUsd,
      debtsCombinedIqd,
      cashCombinedUsd,
      cashCombinedIqd,
      totalAssetsUsd,
      totalAssetsIqd,
      totalCapitalIqd,
    };
  }, [singleUsdToIqd]);

  // Actual Net Profit input state (default calculated from Haji Karwan's 350,000$ or customizable)
  const [actualProfitBaseUsd, setActualProfitBaseUsd] = useState<number>(350000);

  // Profit Model 1: Sarhad Hussein & Farhad Hussein Calculations
  // Tranche: 70,000$ share portion of 420,000$ total capital
  const sarhadCalculation = useMemo(() => {
    const trancheRatio = 70000 / TOTAL_CAPITAL_USD; // 70,000 / 420,000 = 1/6 (approx 16.6667%)
    const trancheTotalProfit = actualProfitBaseUsd * trancheRatio; // Portioned profit for 70,000$ tranche
    const sarhadShareProfit = trancheTotalProfit * 0.50; // 50%
    const farhadShareProfit = trancheTotalProfit * 0.50; // 50%

    const sarhadInitialCapital = 70000;
    const sarhadFinalCapital = sarhadInitialCapital + sarhadShareProfit;

    const farhadInitialCapital = 0;
    const farhadFinalCapital = farhadShareProfit; // As specified: Farhad's final capital equals his earned profit

    return {
      trancheRatio,
      trancheTotalProfit,
      sarhadShareProfit,
      farhadShareProfit,
      sarhadInitialCapital,
      sarhadFinalCapital,
      farhadInitialCapital,
      farhadFinalCapital,
    };
  }, [actualProfitBaseUsd]);

  // Profit Model 2: Haji Karwan Rashani & Haji Farhad Calculations
  // Total profit: 350,000$ -> 40% Karwan, 60% Farhad
  const karwanCalculation = useMemo(() => {
    const totalProfit = 350000;
    const karwanProfit = totalProfit * 0.40; // 140,000$
    const farhadProfit = totalProfit * 0.60; // 210,000$

    const karwanInitialCapital = 250000;
    const karwanFinalCapital = karwanInitialCapital + karwanProfit; // 390,000$

    const farhadInitialCapital = 10000;
    const farhadFinalCapital = farhadInitialCapital + farhadProfit; // 220,000$

    return {
      totalProfit,
      karwanProfit,
      farhadProfit,
      karwanInitialCapital,
      karwanFinalCapital,
      farhadInitialCapital,
      farhadFinalCapital,
    };
  }, []);

  // Handle password submission
  const handleUnlockProfit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === "hemn1@") {
      setIsProfitUnlocked(true);
      setPasswordError("");
    } else {
      setPasswordError("وشەی نهێنی هەڵەیە! تکایە دووبارە هەوڵبدەرەوە.");
    }
  };

  // Handle exchange rate save
  const handleSaveRate = () => {
    const parsed = parseNumberInput(rateInputVal);
    if (parsed > 0) {
      setExchangeRatePer100(parsed);
      setIsEditingRate(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950" dir="rtl">
      
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: LANDING SCREEN (ڕووکاری یەکەم)
      ───────────────────────────────────────────────────────────── */}
      {currentView === "landing" && (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Main Card */}
          <div className="relative z-10 max-w-4xl w-full text-center space-y-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 md:p-14 rounded-3xl shadow-2xl">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              کۆتای ساڵی دارایی ۲۰۲۶ — سیستەمی حسابی فەرمی
            </div>

            {/* Official Title */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-snug">
                ڕاپۆرتی میزانیەی کۆتای ساڵی
                <span className="block mt-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  کۆگای دۆستان
                </span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                کۆی گشتی بەهای کۆگا، قەرزەکان، شیکاری نەختینە و کاش، هاوکێشەی قازانجی فیعلی و ڕاپۆرتی دابەشکردنی پشکی هاوبەشەکان.
              </p>
            </div>

            {/* Quick Preview Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-right">
              
              {/* Item 1 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">بەهای کۆگا</span>
                <span className="text-base md:text-lg font-black text-emerald-400 font-mono">
                  $ {formatNumber(WAREHOUSE_USD, 0)}
                </span>
              </div>

              {/* Item 2 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">کۆی نەختینە (دۆلار)</span>
                <span className="text-base md:text-lg font-black text-blue-400 font-mono">
                  $ {formatNumber(CASH_USD, 0)}
                </span>
              </div>

              {/* Item 3 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">کۆی نەختینە (دینار)</span>
                <span className="text-base md:text-lg font-black text-amber-400 font-mono">
                  دینار {formatNumber(CASH_IQD, 0)}
                </span>
              </div>

              {/* Item 4 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">کۆی گشتی قەرز</span>
                <span className="text-base md:text-lg font-black text-rose-400 font-mono">
                  $ {formatNumber(DEBTS_USD, 0)}
                </span>
              </div>

            </div>

            {/* CTA Button to enter detailed report */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setCurrentView("detailed")}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
              >
                <span>چوونە ناو وردەکاری ڕاپۆرت</span>
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>داشبۆردی سەرەکی</span>
              </Link>
            </div>

            {/* Footer Notice */}
            <div className="text-slate-500 text-xs pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>داتاکان بە شێوەیەکی پارێزراو بەستراونەتەوە بە بەڵگەنامە و باڵانسی حسابی فەرمی</span>
            </div>

          </div>

        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: DETAILED REPORT (وردەکاری ڕاپۆرت)
      ───────────────────────────────────────────────────────────── */}
      {currentView === "detailed" && (
        <div className="min-h-screen pb-20">
          
          {/* Top Sticky Navigation Bar */}
          <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
            
            {/* Title & Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("landing")}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="گەڕانەوە بۆ ڕووکاری یەکەم"
              >
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div>
                <h2 className="text-base md:text-lg font-black text-white leading-tight">
                  ڕاپۆرتی میزانیەی کۆتای ساڵی کۆگای دۆستان
                </h2>
                <span className="text-[11px] font-semibold text-slate-400">
                  خولی دارایی ۲۰۲۶ — بەڵگەنامەی فەرمی
                </span>
              </div>
            </div>

            {/* Action buttons + Exchange Rate Display */}
            <div className="flex items-center gap-3">
              
              {/* Dynamic Dollar Exchange Rate Box */}
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-semibold">ڕەیتی دۆلار:</span>
                  {isEditingRate ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={rateInputVal}
                        onChange={(e) => setRateInputVal(e.target.value)}
                        className="w-24 px-1.5 py-0.5 bg-slate-900 border border-emerald-500 rounded text-emerald-400 font-mono text-xs text-center focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveRate}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[11px] cursor-pointer"
                      >
                        تۆمار
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-amber-300">
                      $ 100 = دینار {formatNumber(exchangeRatePer100, 0)}
                    </span>
                  )}
                </div>

                {!isEditingRate && (
                  <button
                    onClick={() => {
                      setRateInputVal(formatNumber(exchangeRatePer100, 0));
                      setIsEditingRate(true);
                    }}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="دەستکاری کردنی ڕەیت"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Print Button */}
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                <span>چاپکردن</span>
              </button>

            </div>

          </header>

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
            
            {/* ─── SECTION 1: CORE FINANCIAL ASSETS (KPI CARDS) ─── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-white">سامان و بەشەکانی میزانیە</h3>
                  <p className="text-xs text-slate-400">بۆ بینینی وردەکاری و پۆلێنکردنەکان، دەتوانیت کلیک لەسەر کارتەکان بکەیت</p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                  پوختەی دارایی خێرا
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* CARD 1: بەهای کۆگا */}
                <div
                  onClick={() => setActiveModal("warehouse")}
                  className="group relative p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">بەهای مەوادی ناو کۆگا</span>
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-black text-white font-mono">
                      $ {formatNumber(WAREHOUSE_USD, 0)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      هاوتا بە: دینار {formatNumber(convertedValues.warehouseIqd, 0)}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                    <span>بینینی ڕاپۆرتی کۆگا</span>
                    <svg className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>

                {/* CARD 2: قەرزەکان */}
                <div
                  onClick={() => setActiveModal("debts")}
                  className="group relative p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-rose-500/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">کۆی گشتی قەرز (بازاڕ)</span>
                    <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">قەرزی دۆلار:</span>
                      <span className="text-lg font-black text-white font-mono">$ {formatNumber(DEBTS_USD, 0)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">قەرزی دینار:</span>
                      <span className="text-sm font-bold text-amber-400 font-mono">دینار {formatNumber(DEBTS_IQD, 0)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-rose-400 font-bold">
                    <span>هاوتای گشتی: $ {formatNumber(convertedValues.debtsCombinedUsd, 2)}</span>
                    <svg className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>

                {/* CARD 3: نەختینەی کاش (دۆلار و دینار) */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400">کۆی گشتی کاش و نەختینە</span>
                      <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      </span>
                    </div>

                    {/* Clickable sub-bars for Dollar and Dinar */}
                    <div className="space-y-2">
                      {/* USD Cash Button */}
                      <button
                        onClick={() => setActiveModal("cash_usd")}
                        className="w-full p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 flex items-center justify-between text-right transition-all cursor-pointer group"
                      >
                        <div>
                          <span className="text-[11px] text-slate-400 block">کاشی دۆلار (کلیک بکە)</span>
                          <span className="text-base font-black text-blue-400 font-mono">$ {formatNumber(CASH_USD, 0)}</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-400 rtl:rotate-180 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>

                      {/* IQD Cash Button */}
                      <button
                        onClick={() => setActiveModal("cash_iqd")}
                        className="w-full p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 flex items-center justify-between text-right transition-all cursor-pointer group"
                      >
                        <div>
                          <span className="text-[11px] text-slate-400 block">کاشی دینار (کلیک بکە)</span>
                          <span className="text-sm font-black text-amber-400 font-mono">دینار {formatNumber(CASH_IQD, 0)}</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 rtl:rotate-180 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 text-[11px] text-slate-400 flex justify-between font-mono">
                    <span>کۆی گشتی کاش بە دۆلار:</span>
                    <span className="text-white font-bold">$ {formatNumber(convertedValues.cashCombinedUsd, 2)}</span>
                  </div>
                </div>

                {/* CARD 4: کۆی گشتی دەستمایە */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400">کۆی گشتی دەستمایەی سەرەتا</span>
                      <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                        </svg>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-2xl font-black text-white font-mono">
                        $ {formatNumber(TOTAL_CAPITAL_USD, 0)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        هاوتا بە: دینار {formatNumber(convertedValues.totalCapitalIqd, 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                    دەستمایەی کارپێکراوی بنەڕەتی خاوەن پشکەکان لە کۆگا
                  </div>
                </div>

              </div>
            </div>

            {/* ─── SECTION 2: TOTAL BUSINESS VALUATION SUMMARY ─── */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-right">
                <span className="text-xs font-bold text-emerald-400 tracking-wide">کۆی گشتی بەهای دارایی و موڵکەکان (Total Assets)</span>
                <h4 className="text-2xl md:text-3xl font-black text-white font-mono">
                  $ {formatNumber(convertedValues.totalAssetsUsd, 2)}
                </h4>
                <p className="text-xs text-slate-400">
                  (بەهای کۆگا: $ {formatNumber(WAREHOUSE_USD, 0)}) + (کۆی قەرز: $ {formatNumber(convertedValues.debtsCombinedUsd, 2)}) + (کۆی کاش: $ {formatNumber(convertedValues.cashCombinedUsd, 2)})
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-6 py-4 rounded-2xl">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">هاوتای گشتی بە دینار</span>
                  <span className="text-lg md:text-xl font-black text-amber-300 font-mono">
                    دینار {formatNumber(convertedValues.totalAssetsIqd, 0)}
                  </span>
                </div>
              </div>
            </div>


            {/* ─── SECTION 3: PASSWORD PROTECTED PROFIT DISTRIBUTION ─── */}
            <div className="pt-4">
              
              {!isProfitUnlocked ? (
                /* 🔒 LOCKED VIEW */
                <div className="max-w-2xl mx-auto p-8 md:p-12 bg-slate-900/90 border border-slate-800 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
                  
                  {/* Subtle Accent Glow */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Lock SVG */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black text-white">
                      بەشی پارێزراوی دابەشکردنی قازانج و پشکەکان
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
                      بۆ بینینی هەژمارکردنی قازانجی هاوبەشەکان و کڵێشەی قازانجی فیعلی، تکایە وشەی نهێنی تایبەت بنووسە.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleUnlockProfit} className="max-w-sm mx-auto space-y-3">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="وشەی نهێنی بنووسە..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors text-center"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        title={showPassword ? "شاردنەوە" : "پیشاندان"}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>

                    {passwordError && (
                      <p className="text-xs font-bold text-rose-400 animate-shake">
                        {passwordError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      کردنەوە و بینینی قازانج
                    </button>
                  </form>

                </div>
              ) : (
                /* 🔓 UNLOCKED VIEW: FULL PROFIT CALCULATIONS */
                <div className="space-y-6">
                  
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-emerald-300">بەشی دابەشکردنی قازانج کراوەتەوە</h4>
                        <span className="text-xs text-emerald-400/80">داخڵبووی بە دەسەڵاتی خاوەن پشک (hemn1@)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfitUnlocked(false);
                        setPasswordInput("");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      داخستنەوەی پارێزراو
                    </button>
                  </div>

                  {/* Tabs: Choose between Sarhad & Haji Karwan */}
                  <div className="flex items-center justify-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto">
                    <button
                      onClick={() => setProfitTab("sarhad")}
                      className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                        profitTab === "sarhad"
                          ? "bg-emerald-500 text-slate-950 shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ١. قازانجی سەرحەد حسێن
                    </button>
                    <button
                      onClick={() => setProfitTab("karwan")}
                      className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                        profitTab === "karwan"
                          ? "bg-emerald-500 text-slate-950 shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ٢. قازانجی حاجی کاروان ڕەشانی
                    </button>
                  </div>

                  {/* ─── TAB 1: قازانجی سەرحەد حسێن و فەرهاد حسێن ─── */}
                  {profitTab === "sarhad" && (
                    <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                      
                      {/* Prominent Header Banner */}
                      <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-slate-850 to-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                        <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase block">
                          هاوکێشەی دابەشکردنی پشکی تایبەت
                        </span>
                        <h3 className="text-xl md:text-3xl font-black text-white">
                          قازانجی $ 70,000 — ڕێژەی دابەشکردن ٪50 بە ٪50
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xl mx-auto">
                          دابەشکردنی پشکی قازانج لەسەر بنەمای پشکی $ 70,000 بە یەکسانی بۆ سەرحەد حسێن و فەرهاد حسێن
                        </p>
                      </div>

                      {/* Button to open actual profit formula modal */}
                      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                        <button
                          onClick={() => setActiveModal("actual_profit_formula")}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-xs font-black rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                        >
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span>کڵێشەی قازانجی فیعلی (چۆنیەتی دەرچوونی ژمارەکە)</span>
                        </button>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>بنەمای قازانجی فیعلی:</span>
                          <span className="font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            $ {formatNumber(actualProfitBaseUsd, 0)}
                          </span>
                        </div>
                      </div>

                      {/* Shareholders Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-850 text-slate-400 text-xs font-bold border-b border-slate-800">
                              <th className="p-4">ناوی خاوەن پشک</th>
                              <th className="p-4">مایەی سەرەتا</th>
                              <th className="p-4">ڕێژەی دابەشکردن</th>
                              <th className="p-4">بڕی قازانجی بەرکەوتوو</th>
                              <th className="p-4 text-emerald-400">مایەی ئێستا (کۆتایی)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-sm">
                            
                            {/* Row 1: Sarhad Hussein */}
                            <tr className="hover:bg-slate-850/50 transition-colors">
                              <td className="p-4 font-black text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                <span>سەرحەد حسێن</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-300">
                                $ {formatNumber(sarhadCalculation.sarhadInitialCapital, 0)}
                              </td>
                              <td className="p-4 font-bold text-slate-400">
                                ٪50
                              </td>
                              <td className="p-4 font-mono font-black text-emerald-400">
                                $ {formatNumber(sarhadCalculation.sarhadShareProfit, 2)}
                              </td>
                              <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                                $ {formatNumber(sarhadCalculation.sarhadFinalCapital, 2)}
                              </td>
                            </tr>

                            {/* Row 2: Farhad Hussein */}
                            <tr className="hover:bg-slate-850/50 transition-colors">
                              <td className="p-4 font-black text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                                <span>فەرهاد حسێن</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-500">
                                $ 0
                              </td>
                              <td className="p-4 font-bold text-slate-400">
                                ٪50
                              </td>
                              <td className="p-4 font-mono font-black text-emerald-400">
                                $ {formatNumber(sarhadCalculation.farhadShareProfit, 2)}
                              </td>
                              <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                                $ {formatNumber(sarhadCalculation.farhadFinalCapital, 2)}
                              </td>
                            </tr>

                            {/* Totals Row */}
                            <tr className="bg-slate-850/70 font-bold border-t-2 border-slate-700 text-xs">
                              <td className="p-4 font-black text-slate-300">کۆی گشتی پشکی $ 70,000</td>
                              <td className="p-4 font-mono text-slate-300">$ 70,000</td>
                              <td className="p-4 text-slate-400">٪100</td>
                              <td className="p-4 font-mono text-emerald-400">$ {formatNumber(sarhadCalculation.trancheTotalProfit, 2)}</td>
                              <td className="p-4 font-mono text-white text-sm">$ {formatNumber(sarhadCalculation.sarhadFinalCapital + sarhadCalculation.farhadFinalCapital, 2)}</td>
                            </tr>

                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}

                  {/* ─── TAB 2: قازانجی حاجی کاروان ڕەشانی و حاجی فەرهاد ─── */}
                  {profitTab === "karwan" && (
                    <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                      
                      {/* Prominent Header Banner */}
                      <div className="p-5 bg-gradient-to-r from-blue-950/60 via-slate-850 to-blue-950/60 border border-blue-500/40 rounded-2xl text-center space-y-2">
                        <span className="text-xs font-bold text-blue-400 tracking-wider uppercase block">
                          هاوکێشەی دابەشکردنی قازانجی ساڵانە
                        </span>
                        <h3 className="text-xl md:text-3xl font-black text-white">
                          قازانجی $ 350,000 — ٪40 بۆ حاجی کاروان و ٪60 بۆ حاجی فەرهاد
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xl mx-auto">
                          کۆی گشتی بڕی قازانج: $ 350,000 بەپێی ڕێژەی ڕێککەوتنی پشکەکان دابەش دەبێت
                        </p>
                      </div>

                      {/* Shareholders Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-850 text-slate-400 text-xs font-bold border-b border-slate-800">
                              <th className="p-4">ناوی خاوەن پشک</th>
                              <th className="p-4">مایەی سەرەتا</th>
                              <th className="p-4">ڕێژەی پشک</th>
                              <th className="p-4">بڕی قازانجی بەرکەوتوو</th>
                              <th className="p-4 text-emerald-400">مایەی ئێستا (کۆتایی)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-sm">
                            
                            {/* Row 1: Haji Karwan Rashani */}
                            <tr className="hover:bg-slate-850/50 transition-colors">
                              <td className="p-4 font-black text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                <span>حاجی کاروان ڕەشانی</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-300">
                                $ {formatNumber(karwanCalculation.karwanInitialCapital, 0)}
                              </td>
                              <td className="p-4 font-bold text-slate-400">
                                ٪40
                              </td>
                              <td className="p-4 font-mono font-black text-emerald-400">
                                $ {formatNumber(karwanCalculation.karwanProfit, 0)}
                              </td>
                              <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                                $ {formatNumber(karwanCalculation.karwanFinalCapital, 0)}
                              </td>
                            </tr>

                            {/* Row 2: Haji Farhad */}
                            <tr className="hover:bg-slate-850/50 transition-colors">
                              <td className="p-4 font-black text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                                <span>حاجی فەرهاد</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-300">
                                $ {formatNumber(karwanCalculation.farhadInitialCapital, 0)}
                              </td>
                              <td className="p-4 font-bold text-slate-400">
                                ٪60
                              </td>
                              <td className="p-4 font-mono font-black text-emerald-400">
                                $ {formatNumber(karwanCalculation.farhadProfit, 0)}
                              </td>
                              <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                                $ {formatNumber(karwanCalculation.farhadFinalCapital, 0)}
                              </td>
                            </tr>

                            {/* Totals Row */}
                            <tr className="bg-slate-850/70 font-bold border-t-2 border-slate-700 text-xs">
                              <td className="p-4 font-black text-slate-300">کۆی گشتی</td>
                              <td className="p-4 font-mono text-slate-300">$ 260,000</td>
                              <td className="p-4 text-slate-400">٪100</td>
                              <td className="p-4 font-mono text-emerald-400">$ {formatNumber(karwanCalculation.totalProfit, 0)}</td>
                              <td className="p-4 font-mono text-white text-sm">$ {formatNumber(karwanCalculation.karwanFinalCapital + karwanCalculation.farhadFinalCapital, 0)}</td>
                            </tr>

                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>

          </main>

        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          MODALS & DRILLDOWNS
      ───────────────────────────────────────────────────────────── */}

      {/* 1. WAREHOUSE DRILLDOWN MODAL */}
      {activeModal === "warehouse" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">ڕاپۆرتی مەوادی کۆگا</h3>
                <span className="text-xs text-slate-400">کۆی گشتی بەهای کۆگا: $ {formatNumber(WAREHOUSE_USD, 0)}</span>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs text-slate-400 leading-relaxed bg-slate-850 p-3 rounded-xl border border-slate-800">
                پوختەی مەوجوداتی کۆگا بەپێی پۆلێنکردنەکانی ناو سیستەم لە کۆتای ساڵی دارایی:
              </div>

              <div className="space-y-2 text-sm">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">كەرەستەی سەرەکی و پاوەر سەنترال</span>
                    <span className="text-xs text-slate-400">سێرکت، پاوەر و کەلوپەلی کۆنتڕۆڵ</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">$ 18,450</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">کەیبڵ و وایەری مس</span>
                    <span className="text-xs text-slate-400">وایەری ناوماڵ، کەیبڵی پیشەسازی و مەترەکان</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">$ 11,230</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">کەرەستەی ڕۆشنایی و لید (LED)</span>
                    <span className="text-xs text-slate-400">پڕۆجێکتەر، گڵۆپ، پانێڵ و سپۆت لایت</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">$ 6,840</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">سوویچ، پلاک و قاڵبەکانی دابەشکردن</span>
                    <span className="text-xs text-slate-400">سێتە نوێیەکان و کەرەستەی بەستن</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">$ 4,303</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">کۆی گشتی بەهای کۆگا:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">$ {formatNumber(WAREHOUSE_USD, 0)}</span>
            </div>

          </div>
        </div>
      )}


      {/* 2. CASH USD DRILLDOWN MODAL */}
      {activeModal === "cash_usd" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">وردەکاری کاشی دۆلار ($ 185,000)</h3>
                <span className="text-xs text-slate-400">شوێنی نەختینەکان بەپێی لایەنەکان</span>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              
              {/* Item 1 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای شەریکەی ڕەبات</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 14,133</span>
              </div>

              {/* Item 2 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای کامیل مۆریاسی</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 134,000</span>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای شاهۆ</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 5,930</span>
              </div>

              {/* Item 4 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">هی بەرزانە لە ماڵەوەیە</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 3,600</span>
              </div>

              {/* Item 5 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">پارەی تر لەماڵەوەیە</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 1,050</span>
              </div>

              {/* Item 6: Remaining safe */}
              <div className="p-3.5 rounded-xl bg-slate-850/60 border border-dashed border-slate-700 flex items-center justify-between">
                <span className="font-bold text-slate-300 text-sm">نەختینەی قاسەی ناوەندی</span>
                <span className="font-mono font-black text-slate-300 text-sm">$ 26,287</span>
              </div>

            </div>

            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">کۆی گشتی کاشی دۆلار:</span>
              <span className="text-base font-black text-blue-400 font-mono">$ {formatNumber(CASH_USD, 0)}</span>
            </div>

          </div>
        </div>
      )}


      {/* 3. CASH IQD DRILLDOWN MODAL */}
      {activeModal === "cash_iqd" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">وردەکاری کاشی دینار (دینار 8,160,000)</h3>
                <span className="text-xs text-slate-400">دابەشبوونی نەختینەی دیناری عێراقی</span>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              
              {/* Item 1 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">بۆ سەفەری صینی هێمن هەڵگیراوە</span>
                  <span className="text-xs text-slate-400">ئامادەکاری گەشتی بازرگانی چین</span>
                </div>
                <span className="font-mono font-black text-amber-400 text-sm">دینار 6,410,000</span>
              </div>

              {/* Item 2 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای مرادە</span>
                <span className="font-mono font-black text-amber-400 text-sm">دینار 150,000</span>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای شکار هەورامیە</span>
                <span className="font-mono font-black text-amber-400 text-sm">دینار 500,000</span>
              </div>

              {/* Item 4: Remaining safe */}
              <div className="p-3.5 rounded-xl bg-slate-850/60 border border-dashed border-slate-700 flex items-center justify-between">
                <span className="font-bold text-slate-300 text-sm">نەختینەی قاسەی دینار لە کۆگا</span>
                <span className="font-mono font-black text-slate-300 text-sm">دینار 1,100,000</span>
              </div>

            </div>

            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">کۆی گشتی کاشی دینار:</span>
              <span className="text-base font-black text-amber-400 font-mono">دینار {formatNumber(CASH_IQD, 0)}</span>
            </div>

          </div>
        </div>
      )}


      {/* 4. DEBTS DRILLDOWN MODAL */}
      {activeModal === "debts" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">ڕاپۆرتی قەرزەکان (باڵانسی بازاڕ)</h3>
                <span className="text-xs text-slate-400">قەرزی لای کڕیاران بە دۆلار و دینار</span>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">قەرزی بازاڕ بە دۆلار:</span>
                  <span className="font-mono font-black text-rose-400 text-base">$ {formatNumber(DEBTS_USD, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">قەرزی بازاڕ بە دینار:</span>
                  <span className="font-mono font-black text-amber-400 text-base">دینار {formatNumber(DEBTS_IQD, 0)}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2 text-xs text-slate-300">
                <span className="font-bold text-white block">حیسابکردنی هاوتای گشتی:</span>
                <p className="leading-relaxed text-slate-400">
                  بەپێی ڕەیتی ڕۆژ (100$ = دینار {formatNumber(exchangeRatePer100, 0)})، بڕی دیناری قەرزەکە بەرامبەرە بە $ {formatNumber(DEBTS_IQD / singleUsdToIqd, 2)}.
                </p>
                <div className="pt-2 flex justify-between font-mono font-bold text-emerald-400 text-sm">
                  <span>کۆی هاوتای قەرز بە دۆلار:</span>
                  <span>$ {formatNumber(convertedValues.debtsCombinedUsd, 2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setActiveModal("none")}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                داخستن
              </button>
            </div>

          </div>
        </div>
      )}


      {/* 5. ACTUAL PROFIT FORMULA BREAKDOWN MODAL */}
      {activeModal === "actual_profit_formula" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">کڵێشەی دەرچوونی قازانجی فیعلی</h3>
                <span className="text-xs text-slate-400">ڕوونکردنەوەی هاوکێشەی پشکی سەرحەد حسێن و فەرهاد حسێن</span>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              
              {/* Formula Step 1 */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 block">هەنگاوی یەکەم: دیاریکردنی ڕێژەی پشکەکە</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  پشکی دەستنیشانکراو بڕەکەی بریتییە لە <strong>$ 70,000</strong>. ئەم بڕە بەپێی ڕێژەی دەستمایەی کارپێکراو پشکی قازانجی بەرکەوتووی لێ هەژمار دەکرێت.
                </p>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-200 border border-slate-800">
                  ڕێژەی پشک = (70,000 ÷ کۆی دەستمایە) = ٪{formatNumber(sarhadCalculation.trancheRatio * 100, 4)}
                </div>
              </div>

              {/* Formula Step 2 */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 block">هەنگاوی دووەم: دەرهێنانی قازانجی گشتی ئەو پشکە</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  لە کۆی قازانجی فیعلی، ئەو بڕەی دەکەوێتە سەر ئەم پشکە دەردەهێنرێت:
                </p>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 flex justify-between">
                  <span>کۆی قازانجی بەرکەوتووی پشکەکە:</span>
                  <span className="font-bold">$ {formatNumber(sarhadCalculation.trancheTotalProfit, 2)}</span>
                </div>
              </div>

              {/* Formula Step 3 */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 block">هەنگاوی سێیەم: دابەشکردنی ٪50 بە ٪50</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                    <span className="text-white">سەرحەد حسێن (٪50):</span>
                    <span className="font-mono font-bold text-emerald-400">$ {formatNumber(sarhadCalculation.sarhadShareProfit, 2)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                    <span className="text-white">فەرهاد حسێن (٪50):</span>
                    <span className="font-mono font-bold text-emerald-400">$ {formatNumber(sarhadCalculation.farhadShareProfit, 2)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setActiveModal("none")}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                تێگەیشتم و داخستن
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

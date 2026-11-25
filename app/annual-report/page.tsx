"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

// Format numbers as clean whole numbers with commas, zero decimals
function formatNumber(num: number | string, decimals?: number): string {
  if (num === "" || num === null || num === undefined) return "0";
  const n = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
  if (isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

// Render amount: whole number prominent, and tiny dimmed decimal if fractional
function renderAmount(
  num: number | string,
  options: { currency?: string; showDimCents?: boolean } = {}
) {
  const { currency = "$", showDimCents = true } = options;
  if (num === "" || num === null || num === undefined) {
    return <span className="font-mono">{currency} 0</span>;
  }
  const n = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
  if (isNaN(n)) {
    return <span className="font-mono">{currency} 0</span>;
  }

  const isWhole = Math.floor(n) === n || Math.abs(n - Math.round(n)) < 0.001;
  if (isWhole || !showDimCents) {
    return (
      <span className="font-mono">
        {currency && <span className="ml-1">{currency}</span>}
        {Math.round(n).toLocaleString("en-US")}
      </span>
    );
  }

  const parts = n.toFixed(2).split(".");
  const intPart = parseInt(parts[0], 10).toLocaleString("en-US");
  const cents = parts[1];

  return (
    <span className="font-mono inline-flex items-baseline">
      {currency && <span className="ml-1">{currency}</span>}
      <span>{intPart}</span>
      {cents && cents !== "00" && (
        <span className="text-[0.68em] opacity-40 font-normal mr-0.5">.{cents}</span>
      )}
    </span>
  );
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
  const [activeModal, setActiveModal] = useState<
    "none" | "warehouse" | "cash_usd" | "cash_iqd" | "debts" | "hemn3_prompt"
  >("none");

  // Isolated Password Protection for Profit Section
  // null = locked, "karwan" = hemn1@, "sarhad" = hemn2@, "actual_profit" = hemn3@, "farhad_summary" = hemn4@
  const [unlockedMode, setUnlockedMode] = useState<
    null | "karwan" | "sarhad" | "actual_profit" | "farhad_summary"
  >(null);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Dedicated prompt password for hemn3 button modal
  const [hemn3ModalInput, setHemn3ModalInput] = useState<string>("");
  const [hemn3ModalError, setHemn3ModalError] = useState<string>("");

  // Base Data Constants
  const WAREHOUSE_USD = 40823;
  const GOODS_IN_TRANSIT_USD = 123180; // $ 123,180 ئەو کاڵایانەی نەگەیشتوون (ثابت کراو)
  const DEBTS_USD = 145620;
  const DEBTS_IQD = 1350000;
  const TOTAL_CAPITAL_USD = 420000; // 420,000$ base (42 units)
  const CASH_USD = 186827; // Updated from 185,000 after Rabbat change (14,133 -> 15,960, +1,827)
  const CASH_IQD = 8160000;

  // Rate factor: 1 USD in IQD
  const singleUsdToIqd = exchangeRatePer100 > 0 ? exchangeRatePer100 / 100 : 1700;

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

    // Total enterprise assets (Warehouse + Goods in Transit + Debts + Cash)
    const totalAssetsUsd = WAREHOUSE_USD + GOODS_IN_TRANSIT_USD + debtsCombinedUsd + cashCombinedUsd;
    const totalAssetsIqd =
      warehouseIqd + (GOODS_IN_TRANSIT_USD * singleUsdToIqd) + debtsCombinedIqd + cashCombinedIqd;

    // Capital in IQD
    const totalCapitalIqd = TOTAL_CAPITAL_USD * singleUsdToIqd;

    return {
      warehouseIqd,
      debtsIqdInUsd,
      debtsCombinedUsd,
      debtsCombinedIqd,
      cashIqdInUsd,
      cashCombinedUsd,
      cashCombinedIqd,
      totalAssetsUsd,
      totalAssetsIqd,
      totalCapitalIqd,
    };
  }, [singleUsdToIqd]);

  // Extra adjustments or assets (+...) in Actual Profit Formula (defaults to 0 now that 123,180 is fixed)
  const [extraAssetsUsd, setExtraAssetsUsd] = useState<number>(0);
  const [extraAssetsInput, setExtraAssetsInput] = useState<string>("0");
  const [isEditingExtra, setIsEditingExtra] = useState<boolean>(false);

  // Manual profit override (defaults to 82,044$)
  const [useManualProfit, setUseManualProfit] = useState<boolean>(false);
  const [manualProfitUsd, setManualProfitUsd] = useState<number>(82044);
  const [manualProfitInput, setManualProfitInput] = useState<string>("82,044");
  const [isEditingManualProfit, setIsEditingManualProfit] = useState<boolean>(false);

  // Load persistent settings from Server Database and localStorage
  useEffect(() => {
    // Remove old v2 cache so stale 123,180 in extraAssetsUsd does not double-count
    try {
      localStorage.removeItem("annual_report_settings_v2");
      const cached = localStorage.getItem("annual_report_settings_v3");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.extraAssetsUsd !== undefined) {
          setExtraAssetsUsd(parsed.extraAssetsUsd);
          setExtraAssetsInput(formatNumber(parsed.extraAssetsUsd, 0));
        }
        if (parsed.exchangeRatePer100 !== undefined) {
          setExchangeRatePer100(parsed.exchangeRatePer100);
          setRateInputVal(formatNumber(parsed.exchangeRatePer100, 0));
        }
        if (parsed.actualProfitUsd !== undefined) {
          setManualProfitUsd(parsed.actualProfitUsd);
          setManualProfitInput(formatNumber(parsed.actualProfitUsd, 0));
        }
        if (parsed.useManualProfit !== undefined) {
          setUseManualProfit(parsed.useManualProfit);
        }
      }
    } catch (e) {}

    // 2. Fetch authoritative persistent settings from PostgreSQL database
    fetch("/api/annual-report/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.extraAssetsUsd !== undefined) {
            setExtraAssetsUsd(data.extraAssetsUsd);
            setExtraAssetsInput(formatNumber(data.extraAssetsUsd, 0));
          }
          if (data.exchangeRatePer100 !== undefined) {
            setExchangeRatePer100(data.exchangeRatePer100);
            setRateInputVal(formatNumber(data.exchangeRatePer100, 0));
          }
          if (data.actualProfitUsd !== undefined) {
            setManualProfitUsd(data.actualProfitUsd);
            setManualProfitInput(formatNumber(data.actualProfitUsd, 0));
          }
          if (data.useManualProfit !== undefined) {
            setUseManualProfit(data.useManualProfit);
          }
          try {
            localStorage.setItem("annual_report_settings_v3", JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // Helper to persist settings both in localStorage and the PostgreSQL database
  const persistSettings = async (updates: Record<string, any>) => {
    try {
      const current = {
        extraAssetsUsd,
        exchangeRatePer100,
        actualProfitUsd: manualProfitUsd,
        useManualProfit,
        ...updates,
      };
      localStorage.setItem("annual_report_settings_v3", JSON.stringify(current));
      await fetch("/api/annual-report/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error("Failed to persist settings:", e);
    }
  };

  // Calculated Formula Net Profit: (کۆگا + کاڵای نەگەیشتوو + قەرزەکانمان + کاش + ... - دەستمایەکان)
  const formulaNetProfitUsd = useMemo(() => {
    const totalCurrentAssets =
      WAREHOUSE_USD +
      GOODS_IN_TRANSIT_USD +
      convertedValues.debtsCombinedUsd +
      convertedValues.cashCombinedUsd +
      extraAssetsUsd;
    return totalCurrentAssets - TOTAL_CAPITAL_USD;
  }, [convertedValues.debtsCombinedUsd, convertedValues.cashCombinedUsd, extraAssetsUsd]);

  // Active Net Profit used for distributions (82,044$)
  const activeNetProfitUsd = useManualProfit ? manualProfitUsd : formulaNetProfitUsd;

  // Shareholder Calculations:
  // Total Capital = 42 units of $ 10,000 ($ 420,000)
  // Sarhad Share = 7 units ($ 70,000) -> (Net Profit / 42) * 7
  // Karwan Share = 35 units ($ 350,000) -> (Net Profit / 42) * 35

  // 1. Sarhad & Farhad Calculation:
  const sarhadCalculation = useMemo(() => {
    const trancheTotalProfit = (activeNetProfitUsd / 42) * 7;
    const sarhadShareProfit = trancheTotalProfit * 0.50; // 50%
    const farhadShareProfit = trancheTotalProfit * 0.50; // 50%

    const sarhadInitialCapital = 70000;
    const sarhadFinalCapital = sarhadInitialCapital + sarhadShareProfit;

    const farhadInitialCapital = 0;
    const farhadFinalCapital = farhadShareProfit;

    return {
      trancheTotalProfit,
      sarhadShareProfit,
      farhadShareProfit,
      sarhadInitialCapital,
      sarhadFinalCapital,
      farhadInitialCapital,
      farhadFinalCapital,
    };
  }, [activeNetProfitUsd]);

  // 2. Karwan & Farhad Calculation:
  // Initial Capital: Haji Karwan = 250,000$, Haji Farhad = 100,000$ (Total = 350,000$ / 35 units!)
  const karwanCalculation = useMemo(() => {
    const trancheTotalProfit = (activeNetProfitUsd / 42) * 35;
    const karwanShareProfit = trancheTotalProfit * 0.40; // 40%
    const farhadShareProfit = trancheTotalProfit * 0.60; // 60%

    const karwanInitialCapital = 250000;
    const karwanFinalCapital = karwanInitialCapital + karwanShareProfit;

    const farhadInitialCapital = 100000; // 100,000$ as requested by user
    const farhadFinalCapital = farhadInitialCapital + farhadShareProfit;

    return {
      trancheTotalProfit,
      karwanShareProfit,
      farhadShareProfit,
      karwanInitialCapital,
      karwanFinalCapital,
      farhadInitialCapital,
      farhadFinalCapital,
    };
  }, [activeNetProfitUsd]);

  // 3. Haji Farhad Grand Total Position across both tranches (hemn4@):
  const farhadSummaryCalculation = useMemo(() => {
    // From Sarhad's tranche (7 units, 50% Farhad)
    const fromSarhadProfit = sarhadCalculation.farhadShareProfit;
    const fromSarhadInitial = sarhadCalculation.farhadInitialCapital; // 0$
    const fromSarhadFinal = sarhadCalculation.farhadFinalCapital;

    // From Karwan's tranche (35 units, 60% Farhad)
    const fromKarwanProfit = karwanCalculation.farhadShareProfit;
    const fromKarwanInitial = karwanCalculation.farhadInitialCapital; // 100,000$
    const fromKarwanFinal = karwanCalculation.farhadFinalCapital;

    // Grand Totals for Haji Farhad
    const totalInitialCapital = fromSarhadInitial + fromKarwanInitial; // 100,000$
    const totalProfitEarned = fromSarhadProfit + fromKarwanProfit; // 6,837$ + 41,022$ = 47,859$
    const totalFinalCapital = totalInitialCapital + totalProfitEarned; // 147,859$

    return {
      fromSarhadProfit,
      fromSarhadInitial,
      fromSarhadFinal,
      fromKarwanProfit,
      fromKarwanInitial,
      fromKarwanFinal,
      totalInitialCapital,
      totalProfitEarned,
      totalFinalCapital,
    };
  }, [sarhadCalculation, karwanCalculation]);

  // Handle password submission for the main lock card
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passwordInput.trim();

    if (cleanPass === "hemn1@") {
      setUnlockedMode("karwan");
      setPasswordError("");
    } else if (cleanPass === "hemn2@") {
      setUnlockedMode("sarhad");
      setPasswordError("");
    } else if (cleanPass === "hemn3@") {
      setUnlockedMode("actual_profit");
      setPasswordError("");
    } else if (cleanPass === "hemn4@") {
      setUnlockedMode("farhad_summary");
      setPasswordError("");
    } else {
      setPasswordError("وشەی نهێنی هەڵەیە! تکایە وشەی نهێنی دروست بنووسە.");
    }
  };

  // Handle prompt for hemn3 from dedicated button
  const handleHemn3ModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hemn3ModalInput.trim() === "hemn3@") {
      setUnlockedMode("actual_profit");
      setActiveModal("none");
      setHemn3ModalInput("");
      setHemn3ModalError("");
      setTimeout(() => {
        document.getElementById("profit-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      setHemn3ModalError("وشەی نهێنی هەڵەیە! تکایە (hemn3@) بنووسە.");
    }
  };

  // Open Actual Profit directly or prompt for password
  const handleOpenActualProfitButton = () => {
    if (unlockedMode === "actual_profit") {
      document.getElementById("profit-section")?.scrollIntoView({ behavior: "smooth" });
    } else {
      setActiveModal("hemn3_prompt");
      setHemn3ModalInput("");
      setHemn3ModalError("");
    }
  };

  // Handle exchange rate save
  const handleSaveRate = () => {
    const parsed = parseNumberInput(rateInputVal);
    if (parsed > 0) {
      setExchangeRatePer100(parsed);
      setIsEditingRate(false);
      persistSettings({ exchangeRatePer100: parsed });
    }
  };

  // Handle extra assets (+...) save
  const handleSaveExtraAssets = () => {
    const parsed = parseNumberInput(extraAssetsInput);
    setExtraAssetsUsd(parsed);
    setIsEditingExtra(false);
    persistSettings({ extraAssetsUsd: parsed });
  };

  // Handle manual profit save
  const handleSaveManualProfit = () => {
    const parsed = parseNumberInput(manualProfitInput);
    setManualProfitUsd(parsed);
    setIsEditingManualProfit(false);
    persistSettings({ actualProfitUsd: parsed, useManualProfit: true });
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout API error:", error);
    }
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "user_session=; path=/; max-age=0; SameSite=Lax";
    sessionStorage.clear();
    localStorage.removeItem("user_session");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950" dir="rtl">
      
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: LANDING SCREEN (ڕووکاری یەکەم - بەبێ هیچ ژمارەیەک)
      ───────────────────────────────────────────────────────────── */}
      {currentView === "landing" && (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          
          {/* Top Bar for Landing View */}
          <div className="absolute top-5 left-5 right-5 z-20 flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-white tracking-wide">کۆگای دۆستان</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-bold rounded-2xl border border-slate-800 hover:border-rose-500/40 flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-md"
              title="چوونە دەرەوە لە سیستەم"
            >
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span>چوونە دەرەوە</span>
            </button>
          </div>

          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Main Card (No numbers displayed at all until user clicks button) */}
          <div className="relative z-10 max-w-3xl w-full text-center space-y-8 bg-slate-900/70 backdrop-blur-2xl border border-slate-800 p-8 md:p-14 rounded-3xl shadow-2xl">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              کۆتای ساڵی دارایی ۲۰۲۶ — سیستەمی حسابی فەرمی
            </div>

            {/* Official Title */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-snug">
                ڕاپۆرتی میزانیەی کۆتای ساڵی
                <span className="block mt-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  کۆگای دۆستان
                </span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                بەخێربێن؛ سیستەمی فەرمی و پارێزراوی هەژمارکردنی میزانیەی ساڵانە، شیکاری بەهای کۆگا، قەرزەکان، کاش، و هاوکێشەی قازانجی خاوەن پشکەکان.
              </p>
            </div>

            {/* CTA Button to enter detailed statistics */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setCurrentView("detailed")}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
              >
                <span>بینینی ئامارەکان</span>
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>

              <Link
                href="/invoices"
                className="w-full sm:w-auto px-6 py-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>سیستەمی پسووڵە و دارایی</span>
              </Link>
            </div>

            {/* Footer Notice */}
            <div className="text-slate-500 text-xs pt-6 border-t border-slate-800/60 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-emerald-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>داتاکان بە شێوەیەکی پارێزراو و بە نهێنی بەستراونەتەوە بە ژمێریاری فەرمی</span>
            </div>

          </div>

        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: DETAILED REPORT (وردەکاری ڕاپۆرت و ئامارەکان)
      ───────────────────────────────────────────────────────────── */}
      {currentView === "detailed" && (
        <div className="min-h-screen pb-24">
          
          {/* Top Sticky Navigation Bar */}
          <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
            
            {/* Title & Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("landing")}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="گەڕانەوە بۆ پەڕەی سەرەکی"
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
            <div className="flex items-center flex-wrap gap-2.5">
              
              {/* Dedicated Button for Actual Profit (قازانجی فیعلی) */}
              <button
                onClick={handleOpenActualProfitButton}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 hover:text-amber-200 text-xs font-black rounded-xl border border-amber-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title="کردنەوەی هاوکێشەی قازانجی فیعلی (پاسپۆرد: hemn3@)"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zm3-3h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                <span>قازانجی فیعلی</span>
              </button>

              {/* Dynamic Dollar Exchange Rate Box */}
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-semibold">ڕەیت:</span>
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
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                <span>چاپ</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-bold rounded-xl border border-slate-700 hover:border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                title="چوونە دەرەوە لە سیستەم"
              >
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>چوونە دەرەوە</span>
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

              {/* If Karwan's mode is unlocked: display ONLY Warehouse, Goods in Transit ($ 123,180), Debts (NO Cash, NO Total Capital) */}
              {unlockedMode === "karwan" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* CARD 1: بەهای کۆگا */}
                  <div
                    onClick={() => setActiveModal("warehouse")}
                    className="group relative p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/10"
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
                        $ {formatNumber(WAREHOUSE_USD)}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                      <span>بینینی ڕاپۆرتی کۆگا</span>
                      <svg className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>

                  {/* CARD 2: کاڵای نەگەیشتوو */}
                  <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400">کاڵای نەگەیشتوو (لە ڕێگایە)</span>
                        <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                          </svg>
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-2xl font-black text-cyan-300 font-mono">
                          $ {formatNumber(GOODS_IN_TRANSIT_USD)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                      بار و مەوادی داواکراوی نەگەیشتوو
                    </div>
                  </div>

                  {/* CARD 3: قەرزەکان */}
                  <div
                    onClick={() => setActiveModal("debts")}
                    className="group relative p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-rose-500/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400">کۆی قەرزی خەڵک (بازاڕ)</span>
                      <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">قەرزی دۆلار:</span>
                        <span className="text-lg font-black text-white font-mono">$ {formatNumber(DEBTS_USD)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">قەرزی دینار:</span>
                        <span className="text-sm font-bold text-amber-400 font-mono">دینار {formatNumber(DEBTS_IQD)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-rose-400 font-bold">
                      <span>بینینی وردەکاری قەرز</span>
                      <svg className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>

                </div>
              ) : (
                /* Standard Section 1: 5 cards for general, Sarhad, Actual profit & Farhad summary views */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  {/* CARD 1: بەهای کۆگا */}
                  <div
                    onClick={() => setActiveModal("warehouse")}
                    className="group relative p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/10"
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
                        $ {formatNumber(WAREHOUSE_USD)}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                      <span>بینینی ڕاپۆرتی کۆگا</span>
                      <svg className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>

                  {/* CARD 2: ئەو کاڵایانەی نەگەیشتوون */}
                  <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400">ئەو کاڵایانەی نەگەیشتوون</span>
                        <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                          </svg>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-2xl font-black text-cyan-300 font-mono">
                          $ {formatNumber(GOODS_IN_TRANSIT_USD)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                      بار و مەوادی داواکراوی نەگەیشتوو (ثابت)
                    </div>
                  </div>

                  {/* CARD 3: قەرزەکان */}
                  <div
                    onClick={() => setActiveModal("debts")}
                    className="group relative p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-rose-500/10"
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
                        <span className="text-lg font-black text-white font-mono">$ {formatNumber(DEBTS_USD)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">قەرزی دینار:</span>
                        <span className="text-sm font-bold text-amber-400 font-mono">دینار {formatNumber(DEBTS_IQD)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-rose-400 font-bold">
                      <span>بینینی وردەکاری قەرز</span>
                      <svg className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>

                  {/* CARD 4: نەختینەی کاش (دۆلار و دینار) */}
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
                            <span className="text-[11px] text-slate-400 block">کاشی دۆلار (وردەکاری)</span>
                            <span className="text-base font-black text-blue-400 font-mono">$ {formatNumber(CASH_USD)}</span>
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
                            <span className="text-[11px] text-slate-400 block">کاشی دینار (وردەکاری)</span>
                            <span className="text-sm font-black text-amber-400 font-mono">دینار {formatNumber(CASH_IQD)}</span>
                          </div>
                          <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 rtl:rotate-180 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 5: کۆی گشتی دەستمایە */}
                  <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400">کۆی گشتی دەستمایە</span>
                        <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                          </svg>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-2xl font-black text-white font-mono">
                          $ {formatNumber(TOTAL_CAPITAL_USD)}
                        </div>
                        <span className="text-[11px] text-purple-300 block">٤٢ بەش ($ 10,000 بۆ هەر بەشێک)</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                      دەستمایەی کارپێکراوی بنەڕەتی لە کۆگای دۆستان
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* ─── SECTION 2: TOTAL BUSINESS VALUATION SUMMARY ─── */}
            {unlockedMode === "karwan" ? (
              /* Karwan Mode: Hide cash and capital from valuation summary */
              <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 text-right">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs font-bold text-blue-400 tracking-wide">کۆی گشتی بەهای دارایی و پشکەکان</span>
                  </div>
                  <h4 className="text-2xl md:text-3xl font-black text-white font-mono">
                    $ {formatNumber(WAREHOUSE_USD + GOODS_IN_TRANSIT_USD + convertedValues.debtsCombinedUsd)}
                  </h4>
                  <p className="text-xs text-slate-400">
                    بەهای کۆگا ($ {formatNumber(WAREHOUSE_USD)}) + ئەو کاڵایانەی نەگەیشتوون ($ {formatNumber(GOODS_IN_TRANSIT_USD)}) + قەرزەکان ($ {formatNumber(convertedValues.debtsCombinedUsd)})
                  </p>
                </div>
              </div>
            ) : (
              /* Standard Section 2 */
              <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 text-right">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 tracking-wide">کۆی گشتی بەهای دارایی و موڵکەکان</span>
                  </div>
                  <h4 className="text-2xl md:text-3xl font-black text-white font-mono">
                    $ {formatNumber(convertedValues.totalAssetsUsd + extraAssetsUsd)}
                  </h4>
                  <p className="text-xs text-slate-400">
                    بەهای کۆگا ($ {formatNumber(WAREHOUSE_USD)}) + ئەو کاڵایانەی نەگەیشتوون ($ {formatNumber(GOODS_IN_TRANSIT_USD)}) + قەرزەکان ($ {formatNumber(convertedValues.debtsCombinedUsd)}) + کاش ($ {formatNumber(convertedValues.cashCombinedUsd)})
                    {extraAssetsUsd !== 0 ? ` + بڕی تر ($ ${formatNumber(extraAssetsUsd)})` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenActualProfitButton}
                    className="px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>کردنەوەی کڵێشەی قازانجی فیعلی</span>
                  </button>
                </div>
              </div>
            )}


            {/* ─── SECTION 3: ISOLATED PASSWORD PROTECTION FOR PROFIT & SHAREHOLDERS ─── */}
            <div id="profit-section" className="pt-4 scroll-mt-24">
              
              {/* CASE A: LOCKED SCREEN */}
              {unlockedMode === null && (
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
                      سیستەمی پارێزراوی دابەشکردنی قازانج
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
                      بۆ پاراستنی تایبەتمەندی و بەنهێنی هێشتنەوەی حسابات، تکایە وشەی نهێنی تایبەت بنووسە.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleUnlock} className="max-w-sm mx-auto space-y-3">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="وشەی نهێنی تایبەت بنووسە..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors text-center"
                        autoComplete="off"
                        autoFocus
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
                      <p className="text-xs font-bold text-rose-400">
                        {passwordError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      کردنەوە و بینینی حسابات
                    </button>
                  </form>

                </div>
              )}


              {/* CASE B: UNLOCKED FOR HAJI KARWAN (hemn1@) ONLY */}
              {unlockedMode === "karwan" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-blue-300">حسابی تایبەت بە پشکەکانی حاجی کاروان کراوەتەوە</h4>
                        <span className="text-xs text-blue-400/80">داخڵبووی بە دەسەڵاتی خاوەن پشک (hemn1@)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUnlockedMode(null);
                        setPasswordInput("");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      داخستنەوەی پارێزراو
                    </button>
                  </div>

                  {/* Karwan Section */}
                  <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                    
                    {/* Top 3 KPI Cards for Karwan: Warehouse ($40,823), Goods in Transit ($123,180), Debts ($146,414) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-right">
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">بەهای مەوادی ناو کۆگا</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          $ {formatNumber(WAREHOUSE_USD)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">کاڵای نەگەیشتوو (لە ڕێگایە)</span>
                        <span className="text-lg font-black text-cyan-300 font-mono">
                          $ {formatNumber(GOODS_IN_TRANSIT_USD)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">کۆی قەرزی خەڵک (بازاڕ)</span>
                        <span className="text-lg font-black text-rose-400 font-mono">
                          $ {formatNumber(convertedValues.debtsCombinedUsd)}
                        </span>
                      </div>
                    </div>

                    {/* Header Banner */}
                    <div className="p-5 bg-gradient-to-r from-blue-950/60 via-slate-850 to-blue-950/60 border border-blue-500/40 rounded-2xl text-center space-y-2">
                      <span className="text-xs font-bold text-blue-400 tracking-wider uppercase block">
                        هاوکێشەی دابەشکردنی قازانج و مایەی سەرەتا
                      </span>
                      <h3 className="text-xl md:text-3xl font-black text-white">
                        قازانجی پشکی حاجی کاروان ڕەشانی — ٪40 بۆ حاجی کاروان و ٪60 بۆ حاجی فەرهاد
                      </h3>
                    </div>

                    {/* Quick Stats for this tranche */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">کۆی گشتی قازانجی ($ 350,000)</span>
                        <span className="text-lg font-black text-blue-400 font-mono">
                          $ {formatNumber(karwanCalculation.trancheTotalProfit)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">مایەی سەرەتای حاجی کاروان</span>
                        <span className="text-lg font-black text-white font-mono">
                          $ {formatNumber(karwanCalculation.karwanInitialCapital)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">مایەی سەرەتای حاجی فەرهاد</span>
                        <span className="text-lg font-black text-white font-mono">
                          $ {formatNumber(karwanCalculation.farhadInitialCapital)}
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
                              $ {formatNumber(karwanCalculation.karwanInitialCapital)}
                            </td>
                            <td className="p-4 font-bold text-slate-400">
                              ٪40
                            </td>
                            <td className="p-4 font-mono font-black text-emerald-400">
                              $ {formatNumber(karwanCalculation.karwanShareProfit)}
                            </td>
                            <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                              $ {formatNumber(karwanCalculation.karwanFinalCapital)}
                            </td>
                          </tr>

                          {/* Row 2: Haji Farhad */}
                          <tr className="hover:bg-slate-850/50 transition-colors">
                            <td className="p-4 font-black text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                              <span>حاجی فەرهاد</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-300">
                              $ {formatNumber(karwanCalculation.farhadInitialCapital)}
                            </td>
                            <td className="p-4 font-bold text-slate-400">
                              ٪60
                            </td>
                            <td className="p-4 font-mono font-black text-emerald-400">
                              $ {formatNumber(karwanCalculation.farhadShareProfit)}
                            </td>
                            <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                              $ {formatNumber(karwanCalculation.farhadFinalCapital)}
                            </td>
                          </tr>

                          {/* Totals Row */}
                          <tr className="bg-slate-850/70 font-bold border-t-2 border-slate-700 text-xs">
                            <td className="p-4 font-black text-slate-300">کۆی گشتی</td>
                            <td className="p-4 font-mono text-slate-300">
                              $ {formatNumber(karwanCalculation.karwanInitialCapital + karwanCalculation.farhadInitialCapital)}
                            </td>
                            <td className="p-4 text-slate-400">٪100</td>
                            <td className="p-4 font-mono text-emerald-400">
                              $ {formatNumber(karwanCalculation.trancheTotalProfit)}
                            </td>
                            <td className="p-4 font-mono text-white text-sm">
                              $ {formatNumber(karwanCalculation.karwanFinalCapital + karwanCalculation.farhadFinalCapital)}
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>
              )}


              {/* CASE C: UNLOCKED FOR SARHAD HUSSEIN (hemn2@) ONLY */}
              {unlockedMode === "sarhad" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-emerald-300">حسابی تایبەت بە پشکەکانی سەرحەد حسێن کراوەتەوە</h4>
                        <span className="text-xs text-emerald-400/80">داخڵبووی بە دەسەڵاتی خاوەن پشک (hemn2@)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUnlockedMode(null);
                        setPasswordInput("");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      داخستنەوەی پارێزراو
                    </button>
                  </div>

                  {/* Sarhad Section */}
                  <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                    
                    {/* Header Banner */}
                    <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-slate-850 to-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                      <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase block">
                        هاوکێشەی دابەشکردنی پشکی تایبەت
                      </span>
                      <h3 className="text-xl md:text-3xl font-black text-white">
                        قازانجی $ 70,000 — ڕێژەی دابەشکردن ٪50 بە ٪50
                      </h3>
                      <p className="text-xs text-slate-400 max-w-xl mx-auto">
                        دابەشکردنی پشکی قازانج لەسەر بنەمای پشکی $ 70,000 (7 لە 42 ی دەستمایە) بە یەکسانی بۆ سەرحەد حسێن و فەرهاد حسێن
                      </p>
                    </div>

                    {/* Quick Stats for this tranche */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">کۆی قازانجی بەرکەوتووی پشکەکە</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          $ {formatNumber(sarhadCalculation.trancheTotalProfit)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">مایەی سەرەتای سەرحەد حسێن</span>
                        <span className="text-lg font-black text-white font-mono">
                          $ {formatNumber(sarhadCalculation.sarhadInitialCapital)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">مایەی سەرەتای فەرهاد حسێن</span>
                        <span className="text-lg font-black text-white font-mono">
                          $ 0
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
                              $ {formatNumber(sarhadCalculation.sarhadInitialCapital)}
                            </td>
                            <td className="p-4 font-bold text-slate-400">
                              ٪50
                            </td>
                            <td className="p-4 font-mono font-black text-emerald-400">
                              $ {formatNumber(sarhadCalculation.sarhadShareProfit)}
                            </td>
                            <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                              $ {formatNumber(sarhadCalculation.sarhadFinalCapital)}
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
                              $ {formatNumber(sarhadCalculation.farhadShareProfit)}
                            </td>
                            <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                              $ {formatNumber(sarhadCalculation.farhadFinalCapital)}
                            </td>
                          </tr>

                          {/* Totals Row */}
                          <tr className="bg-slate-850/70 font-bold border-t-2 border-slate-700 text-xs">
                            <td className="p-4 font-black text-slate-300">کۆی گشتی پشکی $ 70,000</td>
                            <td className="p-4 font-mono text-slate-300">$ 70,000</td>
                            <td className="p-4 text-slate-400">٪100</td>
                            <td className="p-4 font-mono text-emerald-400">
                              $ {formatNumber(sarhadCalculation.trancheTotalProfit)}
                            </td>
                            <td className="p-4 font-mono text-white text-sm">
                              $ {formatNumber(sarhadCalculation.sarhadFinalCapital + sarhadCalculation.farhadFinalCapital)}
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>
              )}


              {/* CASE D: UNLOCKED FOR ACTUAL PROFIT (hemn3@) ONLY */}
              {unlockedMode === "actual_profit" && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zm3-3h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-amber-300">کڵێشەی قازانجی فیعلی و هاوکێشەی خاوەن پشکەکان کراوەتەوە</h4>
                        <span className="text-xs text-amber-400/80">داخڵبووی بە دەسەڵاتی کارگێڕی فەرمی (hemn3@)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUnlockedMode(null);
                        setPasswordInput("");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      داخستنەوەی پارێزراو
                    </button>
                  </div>

                  {/* ─── PART 1: ACTUAL PROFIT FORMULA BREAKDOWN ─── */}
                  <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                    
                    {/* Header */}
                    <div className="p-5 bg-gradient-to-r from-amber-950/60 via-slate-850 to-amber-950/60 border border-amber-500/40 rounded-2xl text-center space-y-2">
                      <span className="text-xs font-bold text-amber-400 tracking-wider uppercase block">
                        هاوکێشەی ژمێریاری فەرمی
                      </span>
                      <h3 className="text-xl md:text-3xl font-black text-white">
                        کڵێشەی قازانجی فیعلی
                      </h3>
                      <p className="text-xs text-slate-400 max-w-2xl mx-auto">
                        قازانجی فیعلی = ( کۆگا + قەرزەکانمان + کاش + ئەو کاڵایانەی نەگەیشتوون + ... ) - کۆی گشتی دەستمایەکان ($ 420,000)
                      </p>
                    </div>

                    {/* Formula Mathematical Banner */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <span className="text-xs text-slate-400 font-semibold block">هاوکێشەی پوختەی قازانج:</span>
                      <div className="text-sm md:text-base font-black text-amber-300 font-mono tracking-wide leading-relaxed">
                        ( بەهای کۆگا + کۆی قەرزەکان + کۆی کاش + ئەو کاڵایانەی نەگەیشتوون + بڕی تر ) - دەستمایەی سەرەتا ($ 420,000) = قازانجی فیعلی
                      </div>
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      
                      {/* Item 1: Warehouse */}
                      <div className="p-4 rounded-2xl bg-slate-850/60 border border-slate-850 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">١. بەهای کۆگا</span>
                          <span className="text-xs text-slate-400">مەوادی ناو کۆگا</span>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-base">
                          + $ {formatNumber(WAREHOUSE_USD)}
                        </span>
                      </div>

                      {/* Item 2: Debts */}
                      <div className="p-4 rounded-2xl bg-slate-850/60 border border-slate-850 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">٢. کۆی قەرزەکانمان</span>
                          <span className="text-xs text-slate-400">
                            $ {formatNumber(DEBTS_USD)} + دینار {formatNumber(DEBTS_IQD)}
                          </span>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-base">
                          + $ {formatNumber(convertedValues.debtsCombinedUsd)}
                        </span>
                      </div>

                      {/* Item 3: Cash */}
                      <div className="p-4 rounded-2xl bg-slate-850/60 border border-slate-850 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">٣. کۆی کاش و نەختینە</span>
                          <span className="text-xs text-slate-400">
                            $ {formatNumber(CASH_USD)} + دینار {formatNumber(CASH_IQD)}
                          </span>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-base">
                          + $ {formatNumber(convertedValues.cashCombinedUsd)}
                        </span>
                      </div>

                      {/* Item 4: Fixed Goods in Transit ($ 123,180) */}
                      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">٤. ئەو کاڵایانەی نەگەیشتوون</span>
                          <span className="text-xs text-cyan-300/80">بەهای جێگیرکراوی کاڵای داواکراو (ثابت کراو)</span>
                        </div>
                        <span className="font-mono font-black text-cyan-300 text-base">
                          + $ {formatNumber(GOODS_IN_TRANSIT_USD)}
                        </span>
                      </div>

                      {/* Item 5: Extra (+...) */}
                      <div className="md:col-span-2 p-4 rounded-2xl bg-slate-850/60 border border-slate-850 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">٥. بڕی تر / زیادکراوەکان (+...)</span>
                          <span className="text-xs text-slate-400">داواکاری تر، حسابی ساڵ یان زیادە (هەمیشە دەپارێزرێت)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditingExtra ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={extraAssetsInput}
                                onChange={(e) => setExtraAssetsInput(e.target.value)}
                                className="w-24 px-2 py-1 bg-slate-900 border border-amber-500 rounded text-amber-400 font-mono text-xs text-center focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveExtraAssets}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs cursor-pointer"
                              >
                                تۆمار
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-400 text-base">
                                + $ {formatNumber(extraAssetsUsd)}
                              </span>
                              <button
                                onClick={() => {
                                  setExtraAssetsInput(formatNumber(extraAssetsUsd, 0));
                                  setIsEditingExtra(true);
                                }}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                                title="دەستکاری کردنی بڕی تر"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Capital Subtraction & Net Profit Result */}
                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                      
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm">
                        <span className="text-slate-400 font-bold">کۆی گشتی سامانەکان (کۆگا + قەرز + کاش + کاڵای نەگەیشتوو + تر):</span>
                        <span className="font-mono font-black text-white text-base">
                          $ {formatNumber(WAREHOUSE_USD + GOODS_IN_TRANSIT_USD + convertedValues.debtsCombinedUsd + convertedValues.cashCombinedUsd + extraAssetsUsd)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm">
                        <span className="text-rose-400 font-bold">کەمکردنەوەی کۆی دەستمایەکان (٤٢ بەش):</span>
                        <span className="font-mono font-black text-rose-400 text-base">
                          - $ {formatNumber(TOTAL_CAPITAL_USD)}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div>
                          <span className="text-base font-black text-white block">ئەنجامی قازانجی فیعلی:</span>
                          <span className="text-xs text-slate-400">
                            {useManualProfit ? "قازانجی دیاریکراوی دەستی بەکاردەهێنرێت" : "بەپێی هاوکێشەی ژمێریاری حسێبکراوە"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">
                            $ {formatNumber(activeNetProfitUsd)}
                          </span>

                          {/* Quick Toggle between Formula and Manual Override */}
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1 rounded-xl text-xs">
                            <button
                              onClick={() => {
                                setUseManualProfit(false);
                                persistSettings({ useManualProfit: false });
                              }}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                !useManualProfit
                                  ? "bg-emerald-600 text-white"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              هاوکێشە
                            </button>
                            <button
                              onClick={() => {
                                setUseManualProfit(true);
                                persistSettings({ useManualProfit: true });
                              }}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                useManualProfit
                                  ? "bg-amber-500 text-slate-950"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              دیاریکردنی دەستی
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Manual Override Input when enabled */}
                      {useManualProfit && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-amber-300 font-bold">بڕی قازانجی دیاریکراو بە دەست:</span>
                          {isEditingManualProfit ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={manualProfitInput}
                                onChange={(e) => setManualProfitInput(e.target.value)}
                                className="w-28 px-2 py-0.5 bg-slate-900 border border-amber-500 rounded text-amber-300 font-mono text-xs text-center focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveManualProfit}
                                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs cursor-pointer"
                              >
                                تۆمار
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-300 text-sm">$ {formatNumber(manualProfitUsd)}</span>
                              <button
                                onClick={() => {
                                  setManualProfitInput(formatNumber(manualProfitUsd, 0));
                                  setIsEditingManualProfit(true);
                                }}
                                className="p-1 hover:bg-slate-800 rounded text-amber-400 transition-all cursor-pointer"
                              >
                                دەستکاری
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                  </div>


                  {/* ─── PART 2: هاوکێشەی خاوەن پشکەکان ─── */}
                  <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                    
                    {/* Header */}
                    <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-slate-850 to-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                      <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase block">
                        دابەشبوونی بنەڕەتی دەستمایە و قازانج
                      </span>
                      <h3 className="text-xl md:text-3xl font-black text-white">
                        هاوکێشەی خاوەن پشکەکان
                      </h3>
                      <p className="text-xs text-slate-400 max-w-2xl mx-auto">
                        کۆی دەستمایە بریتییە لە $ 420,000 کە کراوە بە ٤٢ بەش ($ 10,000 بۆ هەر بەشێک)؛ قازانجی فیعلی ($ {formatNumber(activeNetProfitUsd)}) بەم هاوکێشانە دابەش دەبێت:
                      </p>
                    </div>

                    {/* Shareholders Mathematical Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* CARD 1: پشکی سەرحەد حسێن */}
                      <div className="p-6 rounded-2xl bg-slate-850 border border-emerald-500/30 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-400" />
                            <h4 className="text-base font-black text-white">پشکی سەرحەد حسێن (٧ بەش)</h4>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 font-mono">$ 70,000 مایەی سەرەتا</span>
                        </div>

                        {/* Formula explanation */}
                        <div className="p-3.5 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                          <span className="text-xs text-slate-400 block font-semibold">هاوکێشەی دەرهێنانی قازانج:</span>
                          <div className="text-xs font-mono text-emerald-300 font-bold">
                            (قازانجی فیعلی ÷ ٤٢) × ٧ = $ {formatNumber(sarhadCalculation.trancheTotalProfit)}
                          </div>
                          <span className="text-[11px] text-slate-400 block">دابەشکردن: ٪50 بۆ سەرحەد حسێن و ٪50 بۆ فەرهاد حسێن</span>
                        </div>

                        {/* Breakdown table */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-white font-bold">سەرحەد حسێن (٪50):</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              قازانج: $ {formatNumber(sarhadCalculation.sarhadShareProfit)} + مایە: $ 70,000 ={" "}
                              <strong className="text-white font-black text-sm">$ {formatNumber(sarhadCalculation.sarhadFinalCapital)}</strong>
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-white font-bold">فەرهاد حسێن (٪50):</span>
                            <span className="font-mono text-teal-400 font-bold">
                              قازانج: $ {formatNumber(sarhadCalculation.farhadShareProfit)} ={" "}
                              <strong className="text-white font-black text-sm">$ {formatNumber(sarhadCalculation.farhadFinalCapital)}</strong>
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* CARD 2: پشکی حاجی کاروان ڕەشانی */}
                      <div className="p-6 rounded-2xl bg-slate-850 border border-blue-500/30 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-400" />
                            <h4 className="text-base font-black text-white">پشکی حاجی کاروان ڕەشانی (٣٥ بەش)</h4>
                          </div>
                          <span className="text-xs font-bold text-blue-400 font-mono">$ 350,000 بنەما</span>
                        </div>

                        {/* Formula explanation */}
                        <div className="p-3.5 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                          <span className="text-xs text-slate-400 block font-semibold">هاوکێشەی دەرهێنانی قازانج:</span>
                          <div className="text-xs font-mono text-blue-300 font-bold">
                            (قازانجی فیعلی ÷ ٤٢) × ٣٥ = $ {formatNumber(karwanCalculation.trancheTotalProfit)}
                          </div>
                          <span className="text-[11px] text-slate-400 block">دابەشکردن: ٪40 بۆ حاجی کاروان و ٪60 بۆ حاجی فەرهاد</span>
                        </div>

                        {/* Breakdown table */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-white font-bold">حاجی کاروان (٪40):</span>
                            <span className="font-mono text-blue-400 font-bold">
                              قازانج: $ {formatNumber(karwanCalculation.karwanShareProfit)} + مایە: $ 250,000 ={" "}
                              <strong className="text-white font-black text-sm">$ {formatNumber(karwanCalculation.karwanFinalCapital)}</strong>
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-white font-bold">حاجی فەرهاد (٪60):</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              قازانج: $ {formatNumber(karwanCalculation.farhadShareProfit)} + مایە: $ {formatNumber(karwanCalculation.farhadInitialCapital)} ={" "}
                              <strong className="text-white font-black text-sm">$ {formatNumber(karwanCalculation.farhadFinalCapital)}</strong>
                            </span>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}


              {/* CASE E: UNLOCKED FOR HAJI FARHAD TOTAL SUMMARY (hemn4@) */}
              {unlockedMode === "farhad_summary" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-4 bg-purple-950/40 border border-purple-500/30 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-purple-300">کۆی گشتی مایە و قازانجی حاجی فەرهاد کراوەتەوە</h4>
                        <span className="text-xs text-purple-400/80">داخڵبووی بە دەسەڵاتی تایبەت (hemn4@)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUnlockedMode(null);
                        setPasswordInput("");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      داخستنەوەی پارێزراو
                    </button>
                  </div>

                  {/* Farhad Summary Section */}
                  <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                    
                    {/* Header Banner */}
                    <div className="p-5 bg-gradient-to-r from-purple-950/60 via-slate-850 to-purple-950/60 border border-purple-500/40 rounded-2xl text-center space-y-2">
                      <span className="text-xs font-bold text-purple-400 tracking-wider uppercase block">
                        پوختەی دارایی و کۆی گشتی مافەکان
                      </span>
                      <h3 className="text-xl md:text-3xl font-black text-white">
                        کۆی گشتی مایەی حاجی فەرهاد
                      </h3>
                      <p className="text-xs text-slate-400 max-w-xl mx-auto">
                        کۆی گشتی قازانجە بەرکەوتووەکان لە هەردوو پشکی سەرحەد حسێن و حاجی کاروان، لەگەڵ مایەی سەرەتا و مایەی ئێستا
                      </p>
                    </div>

                    {/* 3 Quick KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">کۆی مایەی سەرەتای حاجی فەرهاد</span>
                        <span className="text-lg font-black text-white font-mono">
                          $ {formatNumber(farhadSummaryCalculation.totalInitialCapital)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-xs text-slate-400 block mb-1">کۆی گشتی قازانجی بەرکەوتوو</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          $ {formatNumber(farhadSummaryCalculation.totalProfitEarned)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-850 border border-purple-500/40 bg-purple-500/5">
                        <span className="text-xs text-purple-300 block mb-1 font-bold">کۆی گشتی مایەی ئێستا (کۆتایی)</span>
                        <span className="text-xl font-black text-white font-mono">
                          $ {formatNumber(farhadSummaryCalculation.totalFinalCapital)}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Shareholders Breakdown Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-850 text-slate-400 text-xs font-bold border-b border-slate-800">
                            <th className="p-4">سەرچاوەی پشک / حساب</th>
                            <th className="p-4">مایەی سەرەتا</th>
                            <th className="p-4">ڕێژەی پشکی فەرهاد</th>
                            <th className="p-4">بڕی قازانجی بەرکەوتوو</th>
                            <th className="p-4 text-emerald-400">مایەی ئێستا (کۆتایی)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                          
                          {/* Row 1: From Sarhad's Share */}
                          <tr className="hover:bg-slate-850/50 transition-colors">
                            <td className="p-4 font-black text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                              <span>پشکی سەرحەد حسێن (٧ بەش لە ٤٢)</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-500">
                              $ {formatNumber(farhadSummaryCalculation.fromSarhadInitial)}
                            </td>
                            <td className="p-4 font-bold text-slate-400">
                              ٪50
                            </td>
                            <td className="p-4 font-mono font-black text-emerald-400">
                              $ {formatNumber(farhadSummaryCalculation.fromSarhadProfit)}
                            </td>
                            <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                              $ {formatNumber(farhadSummaryCalculation.fromSarhadFinal)}
                            </td>
                          </tr>

                          {/* Row 2: From Karwan's Share */}
                          <tr className="hover:bg-slate-850/50 transition-colors">
                            <td className="p-4 font-black text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                              <span>پشکی حاجی کاروان ڕەشانی (٣٥ بەش لە ٤٢)</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-300">
                              $ {formatNumber(farhadSummaryCalculation.fromKarwanInitial)}
                            </td>
                            <td className="p-4 font-bold text-slate-400">
                              ٪60
                            </td>
                            <td className="p-4 font-mono font-black text-emerald-400">
                              $ {formatNumber(farhadSummaryCalculation.fromKarwanProfit)}
                            </td>
                            <td className="p-4 font-mono font-black text-white text-base bg-emerald-500/5">
                              $ {formatNumber(farhadSummaryCalculation.fromKarwanFinal)}
                            </td>
                          </tr>

                          {/* Totals Row */}
                          <tr className="bg-slate-850/80 font-bold border-t-2 border-slate-700 text-xs">
                            <td className="p-4 font-black text-purple-300">کۆی گشتی حساباتی حاجی فەرهاد</td>
                            <td className="p-4 font-mono text-white text-sm">
                              $ {formatNumber(farhadSummaryCalculation.totalInitialCapital)}
                            </td>
                            <td className="p-4 text-slate-400">هاوبەشی گشتی</td>
                            <td className="p-4 font-mono text-emerald-400 text-sm">
                              $ {formatNumber(farhadSummaryCalculation.totalProfitEarned)}
                            </td>
                            <td className="p-4 font-mono text-purple-300 text-base font-black bg-purple-500/10">
                              $ {formatNumber(farhadSummaryCalculation.totalFinalCapital)}
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                    {/* Explanatory Note */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-1">
                      <span className="text-white font-bold block">ڕوونکردنەوەی شێوازی هەژمارکردن:</span>
                      <p>
                        مایەی سەرەتای حاجی فەرهاد بڕی <strong>$ {formatNumber(farhadSummaryCalculation.totalInitialCapital)}</strong>ە کە لە پشکی حاجی کاروان بەشدارە.
                        قازانجی بەرکەوتوو لە پشکی سەرحەد حسێن بریتییە لە <strong>$ {formatNumber(farhadSummaryCalculation.fromSarhadProfit)}</strong> (٪50) و لە پشکی حاجی کاروان بریتییە لە <strong>$ {formatNumber(farhadSummaryCalculation.fromKarwanProfit)}</strong> (٪60).
                        کۆی گشتی قازانجی بەرکەوتوو دەکاتە <strong>$ {formatNumber(farhadSummaryCalculation.totalProfitEarned)}</strong> کە زیاد دەکرێتە سەر مایەی سەرەتا و مایەی کۆتایی ئێستای دەکاتە <strong>$ {formatNumber(farhadSummaryCalculation.totalFinalCapital)}</strong>.
                      </p>
                    </div>

                  </div>

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
                <h3 className="text-base font-black text-white">وردەکاری کاشی دۆلار ($ {formatNumber(CASH_USD, 0)})</h3>
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
              
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای شەریکەی ڕەبات</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 15,960</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای کامیل مۆریاسی</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 134,000</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای شاهۆ</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 5,930</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">هی بەرزانە لە ماڵەوەیە</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 3,600</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">پارەی تر لەماڵەوەیە</span>
                <span className="font-mono font-black text-blue-400 text-sm">$ 1,050</span>
              </div>

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
              
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">بۆ سەفەری صینی هێمن هەڵگیراوە</span>
                  <span className="text-xs text-slate-400">ئامادەکاری گەشتی بازرگانی چین</span>
                </div>
                <span className="font-mono font-black text-amber-400 text-sm">دینار 6,410,000</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای مرادە</span>
                <span className="font-mono font-black text-amber-400 text-sm">دینار 150,000</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">لای شکار هەورامیە</span>
                <span className="font-mono font-black text-amber-400 text-sm">دینار 500,000</span>
              </div>

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
              <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-sm font-bold text-white">قەرزی بازاڕ بە دۆلار:</span>
                  <span className="font-mono font-black text-rose-400 text-lg">$ {formatNumber(DEBTS_USD)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">قەرزی بازاڕ بە دینار:</span>
                  <span className="font-mono font-black text-amber-400 text-lg">دینار {formatNumber(DEBTS_IQD)}</span>
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


      {/* 5. DEDICATED PASSWORD PROMPT FOR HEMN3 (ACTUAL PROFIT BUTTON) */}
      {activeModal === "hemn3_prompt" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <h3 className="text-base font-black text-white">کردنەوەی قازانجی فیعلی</h3>
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

            <p className="text-xs text-slate-400 leading-relaxed">
              تکایە وشەی نهێنی دەسەڵاتی کارگێڕی (hemn3@) بنووسە بۆ بینینی کڵێشەی قازانجی فیعلی و هاوکێشەی خاوەن پشکەکان.
            </p>

            <form onSubmit={handleHemn3ModalSubmit} className="space-y-4">
              <input
                type="password"
                value={hemn3ModalInput}
                onChange={(e) => setHemn3ModalInput(e.target.value)}
                placeholder="وشەی نهێنی بنووسە..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors text-center font-mono"
                autoFocus
              />

              {hemn3ModalError && (
                <p className="text-xs font-bold text-rose-400 text-center">
                  {hemn3ModalError}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal("none")}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  چوونە ژوورەوە
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "../../store/store";
import { useRouter } from "next/navigation";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";
import DateInput from "../../components/DateInput";

export default function BalanceSheetPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showShareholdersModal, setShowShareholdersModal] = useState(false);
  const [shareholderSearch, setShareholderSearch] = useState("");
  const [showProfitDistModal, setShowProfitDistModal] = useState(false);
  const [profitBreakdownExpanded, setProfitBreakdownExpanded] = useState(false);
  const [adjustedProfit, setAdjustedProfit] = useState<string>("");
  const [distributionNote, setDistributionNote] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDist, setSelectedDist] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  const [showShareholderFormModal, setShowShareholderFormModal] = useState(false);
  const [editingSh, setEditingSh] = useState<any>(null);
  const [shForm, setShForm] = useState({
    name: "",
    phone: "",
    sharePercentage: "0",
    isActive: true
  });

  const { currencies, fetchCurrencies } = useStore() as any;

  const [asOfDate, setAsOfDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [currencyId, setCurrencyId] = useState("all");
  const [currencyLabel, setCurrencyLabel] = useState("$");
  const [defaultCurrencyId, setDefaultCurrencyId] = useState("all");

  useEffect(() => {
    fetchCurrencies?.();
  }, [fetchCurrencies]);

  useEffect(() => {
    if (currencies && currencies.length > 0) {
      const usd = currencies.find((c: any) => c.code === "USD");
      const defaultId = usd ? usd.id.toString() : currencies[0].id.toString();
      setDefaultCurrencyId(defaultId);
      if (currencyId === "all") {
        setCurrencyId(defaultId);
        setCurrencyLabel(usd ? usd.symbol : currencies[0].symbol);
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
    
    const usd = currencies?.find((c: any) => c.code === "USD");
    const defaultId = usd ? usd.id.toString() : (currencies?.[0]?.id.toString() || "all");
    
    setCurrencyId(defaultId);
    setCurrencyLabel(usd ? usd.symbol : (currencies?.[0]?.symbol || "$"));
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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
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
      console.error("Error fetching profit distribution history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    fetchHistory();
    setShowHistoryModal(true);
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
        })
      });

      if (res.ok) {
        showToast("قازانج بە سەرکەوتوویی دابەشکرا و خەزن کرا ✅", "success");
        setShowProfitDistModal(false);
        setDistributionNote("");
        fetchData(); // Refresh balance sheet
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

  const handleSaveShareholder = async () => {
    if (!shForm.name.trim()) {
      showToast("تکایە ناوی خاوەن پشک بنووسە ❌", "error");
      return;
    }
    
    const sharePct = Number(shForm.sharePercentage) || 0;

    // Calculate total share percentage of other shareholders
    const otherShs = (data?.shareholders || []).filter((sh: any) => !editingSh || sh.id !== editingSh.id);
    const currentTotal = otherShs.reduce((sum: number, sh: any) => sum + (sh.sharePercentage || 0), 0);
    if (currentTotal + sharePct > 100) {
      showToast(`کۆی ڕێژەکان لە ١٠٠٪ زیاتر دەبێت! ئێستا ${currentTotal}% بەکارهاتووە. تەنها ${(100 - currentTotal).toFixed(2)}% ماوە. ⚠️`, "error");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        name: shForm.name.trim(),
        phone: shForm.phone.trim() || null,
        sharePercentage: sharePct,
        isActive: shForm.isActive,
        isShareholder: true
      };

      let res;
      if (editingSh) {
        payload.id = editingSh.id;
        res = await fetch("/api/accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingSh ? "هاوبەش بە سەرکەوتوویی نوێکرایەوە ✅" : "هاوبەشی نوێ زیادکرا ✅", "success");
        setShowShareholderFormModal(false);
        setEditingSh(null);
        fetchData(); // Reload balance sheet to show changes
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "خەزنکردن سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error("Save shareholder error:", e);
      showToast("خەزنکردن سەرکەوتوو نەبوو ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShareholder = async (id: number) => {
    if (!window.confirm("ئایا دڵنیای لە سڕینەوەی ئەم خاوەن پشکە؟")) return;

    try {
      const res = await fetch(`/api/accounts?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        showToast("خاوەن پشک بە سەرکەوتوویی سڕایەوە ✅", "success");
        fetchData(); // Reload balance sheet
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "سڕینەوە سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error("Delete shareholder error:", e);
      showToast("سڕینەوە سەرکەوتوو نەبوو ❌", "error");
    }
  };

  const handleToggleActiveShareholder = async (sh: any) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sh.id,
          name: sh.name,
          phone: sh.phone,
          sharePercentage: sh.sharePercentage,
          isShareholder: true,
          isActive: !sh.isActive
        })
      });

      if (res.ok) {
        showToast("دۆخی چالاکی گۆڕدرا ✅", "success");
        fetchData(); // Reload balance sheet
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "گۆڕانکاری سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error("Toggle active shareholder error:", e);
      showToast("گۆڕانکاری سەرکەوتوو نەبوو ❌", "error");
    }
  };

  const highlightComponents = () => {
    const ids = ["comp-cash", "comp-warehouse", "comp-receivable", "comp-inventory", "comp-mydebts", "comp-capital"];
    
    // Smooth scroll to the top of assets list to see components clearly
    const targetEl = document.getElementById("comp-cash");
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("bg-emerald-100", "scale-[1.02]", "border-emerald-300", "ring-4", "ring-emerald-300/40");
        el.style.transition = "all 0.5s ease";
        setTimeout(() => {
          el.classList.remove("bg-emerald-100", "scale-[1.02]", "border-emerald-300", "ring-4", "ring-emerald-300/40");
        }, 2500);
      }
    });
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
      <div className="bg-[#0b1f50] text-white p-3 flex items-center justify-between no-print">
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

      <div id={selectedDist ? "print-area-inactive" : "print-area"}>
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی میزانیە</h2>
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
            <div id="comp-cash" className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.assets.cash)}</span>
              <span className="text-sm text-slate-500">کاش</span>
            </div>

            {/* بەدەی کۆگا */}
            <div id="comp-warehouse" className="flex items-center justify-between p-3 pr-5 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.assets.warehouseValue)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">بەهای کۆگا</span>
                <span className="text-slate-400 text-xs">📦</span>
              </div>
            </div>

            {/* قەرزی جەلکک */}
            <div id="comp-receivable" className="flex items-center justify-between p-3 pr-5 border-b border-slate-100 hover:bg-slate-50 transition">
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
            <div id="comp-inventory" className="flex items-center justify-between p-3 pr-5 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm text-slate-600">{fmt(data.assets.allInventory)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">مەوجودات</span>
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
            <div id="comp-mydebts" className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition">
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
            <div id="comp-capital" className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm font-bold text-slate-800">{fmt(data.liabilitiesEquity.capital)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500">سەرمایەی خاوەن پشکەکان</span>
                <span className="text-slate-400 text-xs">💰</span>
              </div>
            </div>

            {/* قازانجی فعلی */}
            {(() => {
              const warehouseValue = data.assets.warehouseValue || 0;
              const cash = data.assets.cash || 0;
              const accountsReceivable = data.assets.accountsReceivable || 0;
              const otherAssets = data.assets.allInventory || 0;
              const myDebts = data.liabilitiesEquity.myDebts || 0;
              const capital = data.liabilitiesEquity.capital || 0;
              const realProfit = warehouseValue + cash + accountsReceivable + otherAssets - myDebts - capital;

              return (
                <div 
                  onClick={highlightComponents}
                  className="flex items-center justify-between p-3 pr-8 border-b border-slate-100 hover:bg-emerald-50 transition bg-green-50/50 cursor-pointer"
                  title="کلیک بکە بۆ بینینی سەرچاوەکانی ئەم بەهایە"
                >
                  <span className="text-sm font-bold text-green-700">{fmt(realProfit)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-slate-500">قازانجی فعلی</span>
                    <span className="text-green-400 text-xs">📈</span>
                  </div>
                </div>
              );
            })()}

            {/* Total */}
            <div className="bg-slate-50 border-t border-slate-300 p-4 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">{fmt(data.liabilitiesEquity.total)}</span>
              <span className="text-sm font-bold text-slate-600">کۆی قەرز و سەرمایە</span>
            </div>
          </div>

          {/* Bottom Buttons for Shareholders */}
          <div className="md:col-span-2 flex justify-center mt-4 gap-4 flex-wrap no-print">
            <button
              onClick={() => setShowShareholdersModal(true)}
              className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-slate-800 transition duration-200 cursor-pointer shadow-md text-sm"
            >
              <span>خاوەن پشکەکان</span>
              <span>👥</span>
            </button>
            <button
              onClick={() => {
                router.push("/reports/profit-distribution");
              }}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-emerald-700 transition duration-200 cursor-pointer shadow-md text-sm"
            >
              <span>دابەشکردنی قازانج</span>
              <span>💰</span>
            </button>
          </div>

        </div>
        ) : (
          <div className="p-12 text-center text-red-500">هەڵەیەک ڕوویدا لە هێنانی داتاکان</div>
        )}
      </div>

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
                <DateInput value={asOfDate} onChange={setAsOfDate} label="بەرواری" />
              </div>

              {/* Currency */}
              <div>
                <div className="section-title flex-row-reverse">فلتەرە سەرەکییەکان <span>⚙</span></div>
                <div className="mui-outline">
                  <label>دراو</label>
                  <select value={currencyId} onChange={e => {
                    setCurrencyId(e.target.value);
                    const sel = e.target.options[e.target.selectedIndex];
                    setCurrencyLabel(e.target.value === "all" ? "$" : sel.text.split(" - ")[0] || "$");
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

      {/* Shareholders List Modal */}
      {showShareholdersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowShareholdersModal(false)} className="text-white hover:text-slate-300 text-lg border-none bg-transparent cursor-pointer">✕</button>
                <h2 className="font-bold text-lg">👥 بەڕێوەبردنی خاوەن پشکەکان</h2>
              </div>
              <span className="text-sm font-bold opacity-80 self-center">ژمارەی خاوەن پشکەکان: {data?.shareholders?.length || 0}</span>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <button
                onClick={() => exportTableToExcel("shareholders-list-table", "hawbashakan.xlsx")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition duration-150 cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                ناردن بۆ ئێکسڵ 📊
              </button>
              <input
                type="text"
                placeholder="🔍 گەڕان بەدوای ناوی خاوەن پشک یان تەلەفۆن..."
                value={shareholderSearch}
                onChange={e => setShareholderSearch(e.target.value)}
                className="w-full max-w-sm px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] bg-white text-right text-sm font-bold text-slate-700 shadow-sm"
                dir="rtl"
              />
            </div>

            {/* Modal Body / Table */}
            <div className="p-6 overflow-y-auto flex-1 text-right" dir="rtl">
              <table id="shareholders-list-table" className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="py-3 px-2 text-slate-500 font-bold text-xs w-12 text-center">#</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-right">ناو</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">تەلەفۆن</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">ڕێژە</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-left">باڵانس / بەشە سەرمایە</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs text-center">دۆخ</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs w-64 text-center">کردار</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.shareholders ? (() => {
                    const filtered = data.shareholders.filter((sh: any) =>
                      sh.name.toLowerCase().includes(shareholderSearch.toLowerCase()) ||
                      sh.phone.toLowerCase().includes(shareholderSearch.toLowerCase())
                    );
                    
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                            هیچ خاوەن پشکێک نەدۆزرایەوە
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((sh: any, index: number) => (
                      <tr
                        key={sh.id}
                        className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="py-3.5 px-2 text-slate-400 text-xs font-bold text-center">{index + 1}</td>
                        <td className="py-3.5 px-4 text-slate-800 font-bold text-sm text-right">{sh.name}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium text-xs text-center" dir="ltr">{sh.phone || "—"}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="bg-blue-100 text-blue-700 font-black text-xs px-2.5 py-0.5 rounded-full">
                            {sh.sharePercentage || 0}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-black text-sm text-left" dir="ltr">
                          {typeof sh.balanceUSD === "number" ? `$ ${sh.balanceUSD.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "$ 0"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActiveShareholder(sh);
                            }}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-85 active:scale-95 transition-all select-none ${
                              sh.isActive !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            title="کلیک بکە بۆ گۆڕینی دۆخی چالاکبوون"
                          >
                            {sh.isActive !== false ? 'چالاک 🟢' : 'ناچالاک 🔴'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/accounts?edit=${sh.id}`);
                            }}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                            title="دەستکاری"
                          >
                            دەستکاری 📝
                          </button>
                          {sh.canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteShareholder(sh.id);
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                              title="سڕینەوە"
                            >
                              سڕینەوە 🗑️
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowShareholdersModal(false);
                              router.push(`/reports/account-statement?accountId=${sh.id}`);
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                            title="کەشفی حساب"
                          >
                            کەشفی حساب 📑
                          </button>
                        </td>
                      </tr>
                    ));
                  })() : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                        لە بارکردندایە...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-start">
              <button
                onClick={() => setShowShareholdersModal(false)}
                className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition cursor-pointer border-none"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Profit Distribution Modal */}
      {showProfitDistModal && data && (() => {
        const warehouseValue = data.assets.warehouseValue || 0;
        const cash = data.assets.cash || 0;
        const accountsReceivable = data.assets.accountsReceivable || 0;
        const otherAssets = data.assets.allInventory || 0;
        const myDebts = data.liabilitiesEquity.myDebts || 0;
        const capital = data.liabilitiesEquity.capital || 0;
        const calculatedProfit = warehouseValue + cash + accountsReceivable + otherAssets - myDebts - capital;
        const profitToDistribute = Number(adjustedProfit) || 0;
        const shareholders = (data.shareholders || []).filter((sh: any) => sh.isActive !== false);
        const totalSharePercentage = shareholders.reduce((sum: number, sh: any) => sum + (sh.sharePercentage || 0), 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-emerald-700 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowProfitDistModal(false)} className="text-white hover:text-slate-300 text-lg border-none bg-transparent cursor-pointer">✕</button>
                  <h2 className="font-bold text-lg">📊 دابەشکردنی قازانج بەسەر خاوەن پشکەکان</h2>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1" dir="rtl">
                {/* Actual Profit Box - Clickable */}
                <div
                  onClick={() => setProfitBreakdownExpanded(!profitBreakdownExpanded)}
                  className="bg-gradient-to-l from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-5 mb-5 cursor-pointer hover:border-emerald-500 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-emerald-700 font-bold text-sm mb-1">قازانجی فعلی</div>
                      <div className="text-3xl font-black text-emerald-800" dir="ltr">
                        {fmt(calculatedProfit)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                      <span>{profitBreakdownExpanded ? '▲' : '▼'} کلیک بکە بۆ وردەکاری</span>
                    </div>
                  </div>

                  {/* Breakdown - expandable */}
                  {profitBreakdownExpanded && (
                    <div className="mt-4 pt-4 border-t border-emerald-200 space-y-2">
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
                  )}
                </div>

                {/* Editable profit amount */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                  <label className="block text-sm font-bold text-slate-600 mb-2">بڕی قازانجی دابەشکراو (دەستکاری بکە):</label>
                  <input
                    type="text"
                    value={adjustedProfit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.-]/g, '');
                      setAdjustedProfit(val);
                    }}
                    className="w-full px-4 py-3 border-2 border-emerald-300 rounded-xl text-xl font-black text-emerald-800 focus:outline-none focus:border-emerald-500 bg-white text-center"
                    dir="ltr"
                    placeholder="0"
                  />
                  {profitToDistribute !== calculatedProfit && (
                    <div className="text-xs text-amber-600 font-bold mt-2 text-center">
                      ⚠️ بڕەکە دەستکاریکراوە • قازانجی فعلی: {fmt(calculatedProfit)}
                    </div>
                  )}
                </div>

                {/* Note input */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-right" dir="rtl">
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
                {shareholders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold">
                    هیچ خاوەن پشکێک نەدۆزرایەوە. تکایە لە بەشی هەژمارەکان خاوەن پشک زیاد بکە.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                        {shareholders.map((sh: any, index: number) => {
                          const previousBalance = sh.balanceUSD || 0; // positive = deposited more, negative = withdrew more
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
                        })}

                        {/* Total Row */}
                        <tr className="bg-slate-100 border-t-2 border-slate-300">
                          <td className="py-3 px-2"></td>
                          <td className="py-3 px-4 text-slate-800 font-black text-sm text-right">کۆ</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-black text-xs px-3 py-1 rounded-full ${totalSharePercentage === 100 ? 'bg-emerald-100 text-emerald-700' : totalSharePercentage > 100 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
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
                      </tbody>
                    </table>

                    {totalSharePercentage !== 100 && (
                      <div className="mt-3 text-center text-amber-600 font-bold text-xs bg-amber-50 border border-amber-200 rounded-xl p-3">
                        ⚠️ کۆی ڕێژەکان {totalSharePercentage}% ە بەڵام دەبێت ١٠٠% بێت. تکایە ڕێژەکان لە بەشی هەژمارەکان دیاری بکە.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-start gap-3">
                <button
                  disabled={isSaving}
                  onClick={() => handleSaveDistribution(calculatedProfit, profitToDistribute, shareholders)}
                  className={`px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition cursor-pointer border-none flex items-center gap-1.5 ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? "چاوەڕوانبە..." : "خەزنکردن و دابەشکردن 💾"}
                </button>
                <button
                  onClick={() => setShowProfitDistModal(false)}
                  className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition cursor-pointer border-none"
                >
                  داخستن
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Profit Distribution History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white no-print">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (selectedDist) {
                      setSelectedDist(null);
                    } else {
                      setShowHistoryModal(false);
                    }
                  }} 
                  className="text-white hover:text-slate-300 text-lg border-none bg-transparent cursor-pointer"
                >
                  {selectedDist ? "⬅ گەڕانەوە" : "✕ داخستن"}
                </button>
                <h2 className="font-bold text-lg">
                  {selectedDist ? "📄 پسووڵەی دابەشکردنی قازانج" : "📋 مێژووی دابەشکردنی قازانج"}
                </h2>
              </div>
              {selectedDist && (
                <button
                  onClick={() => window.print()}
                  className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition duration-150 cursor-pointer border-none shadow-sm flex items-center gap-1.5 text-black"
                >
                  چاپکردنی پسووڵە 🖨️
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-right" dir="rtl">
              {loadingHistory ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  خەریکی هێنانی داتاکانە...
                </div>
              ) : selectedDist ? (
                /* RECEIPT VIEW */
                <div id="print-area" className="space-y-6">
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
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  هیچ مێژوویەکی دابەشکردن نییە
                </div>
              ) : (
                /* LIST VIEW */
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
                        <td className="py-3 px-4 text-slate-500 text-xs text-right max-w-[150px] truncate">{dist.note || "—"}</td>
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-start gap-3 no-print">
              {selectedDist ? (
                <button
                  onClick={() => setSelectedDist(null)}
                  className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition cursor-pointer border-none"
                >
                  گەڕانەوە بۆ لیست
                </button>
              ) : (
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition cursor-pointer border-none"
                >
                  داخستن
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

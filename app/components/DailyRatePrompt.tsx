"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { store, useStore } from "../store/store";

export default function DailyRatePrompt() {
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const currencies = useStore((s) => s.currencies);
  const fetchCurrencies = useStore((s) => s.fetchCurrencies);

  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newRateText, setNewRateText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Find the IQD (Dinar) currency — the exchange rate is stored on this record
  // e.g. rate=1520 means 100 USD = 152,000 IQD
  const iqdCurrency = currencies.find(
    (c: any) => c.code === "IQD" || c.name === "دینار" || c.name?.includes("دینار")
  );

  const getCurrentRate100USD = () => {
    if (!iqdCurrency) return 150000;
    let rate = Number(iqdCurrency.rate || 1500);
    // rate is stored as e.g. 1520, multiply by 100 to get the per-100$ value
    if (rate < 10000) rate = rate * 100;
    return rate;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = sessionStorage.getItem("__dismissed_daily_banner");
    if (dismissed === "true") {
      setIsOpen(false);
    }
  }, []);

  // NEVER show on login page
  if (pathname === "/login" || !isOpen || !iqdCurrency) return null;

  const currentRate100 = getCurrentRate100USD();

  const handleConfirmSameRate = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("__daily_rate_verified_date", todayStr);
    sessionStorage.setItem("__dismissed_daily_banner", "true");
    setIsOpen(false);
  };

  const handleOpenEdit = () => {
    setNewRateText(String(currentRate100));
    setIsEditing(true);
  };

  const handleSaveRate = async () => {
    const num = Number(newRateText.replace(/[^0-9]/g, ""));
    if (!num || num < 50000 || num > 300000) {
      alert("تکایە نرخێکی ڕاست بە دینار بنووسە (بۆ نموونە 152000)");
      return;
    }

    try {
      setIsSaving(true);
      // Convert back: if user enters 152000, save as 1520 (rate per 1 USD * 100)
      const rateToSave = num > 10000 ? num / 100 : num;

      const res = await fetch("/api/currencies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: iqdCurrency.id,
          name: iqdCurrency.name,
          symbol: iqdCurrency.symbol,
          rate: rateToSave,
          code: iqdCurrency.code,
        }),
      });

      if (res.ok) {
        await fetchCurrencies();
        const todayStr = new Date().toISOString().split("T")[0];
        localStorage.setItem("__daily_rate_verified_date", todayStr);
        sessionStorage.setItem("__dismissed_daily_banner", "true");
        setToast(`نرخی دۆلار بە سەرکەوتوویی بۆ ${num.toLocaleString("en-US")} دینار نوێکرایەوە ✅`);
        setTimeout(() => {
          setToast("");
          setIsOpen(false);
        }, 2000);
      } else {
        alert("کێشەیەک لە پاشەکەوتکردنی نرخدا ڕووی دا");
      }
    } catch (e) {
      console.error(e);
      alert("کێشەی پەیوەندیکردن بە سێرڤەرەوە ڕووی دا");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="text-white shadow-2xl border-b-2 border-amber-400/40 sticky top-0 z-50"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #162044 40%, #1a2760 70%, #0f1d3d 100%)",
        padding: "20px 32px",
      }}
    >
      {/* Top: Rate info */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" style={{ animation: "pulse 2s ease-in-out infinite" }}>
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <div className="text-center">
          <h4 className="font-black text-base text-amber-300 m-0" style={{ fontSize: "17px", letterSpacing: "0.3px" }}>
            ئاگاداری ڕۆژانەی نرخی دۆلار
          </h4>
          <p className="text-sm text-blue-100 m-0 mt-1 font-bold" style={{ fontSize: "14px" }}>
            نرخی ١٠٠ دۆلار لە ڕێکخستنەکان:{" "}
            <span
              className="text-amber-300 font-black bg-white/10 rounded-lg border border-amber-400/30"
              style={{ fontSize: "16px", padding: "3px 12px", marginInlineStart: "6px", marginInlineEnd: "6px" }}
            >
              {currentRate100.toLocaleString("en-US")} دینار
            </span>
            — ئایا ئەمڕۆ هەمان نرخە؟
          </p>
        </div>
      </div>

      {/* Bottom: Action buttons — centered & large */}
      <div className="flex items-center justify-center gap-4">
        {toast ? (
          <div
            className="bg-emerald-500 text-white font-black rounded-2xl shadow-lg text-center"
            style={{ fontSize: "15px", padding: "12px 28px" }}
          >
            {toast}
          </div>
        ) : !isEditing ? (
          <>
            <button
              onClick={handleConfirmSameRate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition-all border border-emerald-400/30 cursor-pointer hover:scale-105 active:scale-95"
              style={{ fontSize: "15px", padding: "12px 32px", minWidth: "180px" }}
            >
              بەڵێ، هەمان نرخە ✔️
            </button>
            <button
              onClick={handleOpenEdit}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg transition-all border border-amber-300/40 cursor-pointer hover:scale-105 active:scale-95"
              style={{ fontSize: "15px", padding: "12px 32px", minWidth: "180px" }}
            >
              نەخێر، نرخەکە بگۆڕە ✏️
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-bold text-blue-200" style={{ fontSize: "14px" }}>نرخی نوێی ١٠٠$:</span>
            <input
              type="text"
              inputMode="numeric"
              value={newRateText}
              onChange={(e) => setNewRateText(e.target.value.replace(/[^0-9]/g, ""))}
              className="text-center text-slate-900 bg-white rounded-xl border-2 border-blue-300 outline-none font-bold"
              style={{ width: "140px", padding: "10px 12px", fontSize: "16px" }}
              placeholder="152000"
            />
            <button
              onClick={handleSaveRate}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl shadow-lg transition-all cursor-pointer hover:scale-105"
              style={{ fontSize: "14px", padding: "10px 24px" }}
            >
              {isSaving ? "پاشەکەوت دەکرێت..." : "پاشەکەوت ✔️"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-300 hover:text-white cursor-pointer transition-colors"
              style={{ fontSize: "13px", padding: "8px 14px" }}
            >
              پاشگەزبوونەوە
            </button>
          </>
        )}
      </div>
    </div>
  );
}

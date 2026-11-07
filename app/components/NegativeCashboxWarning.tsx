"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store/store";

export default function NegativeCashboxWarning() {
  const cashboxes = useStore((s) => s.cashboxes) || [];
  const allCurrencies = useStore((s) => s.currencies) || [];
  const fetchCashboxes = useStore((s) => s.fetchCashboxes);
  const router = useRouter();

  useEffect(() => {
    // Fetch immediately on mount
    fetchCashboxes();

    // Poll cashboxes every 5 seconds to get real-time balance changes
    const interval = setInterval(() => {
      fetchCashboxes();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCashboxes]);

  // Ignore minor drob/fractions (e.g. -0.39$ or < 250 IQD)
  function isSignificantNegative(bal: any): boolean {
    const amount = Number(bal.amount || 0);
    const currency = bal.currency || allCurrencies.find((c: any) => c.id === bal.currencyId);
    const code = currency?.code || "";
    const isIQD = code === "IQD" || currency?.symbol === "دینار" || currency?.name?.includes("دینار") || Number(bal.currencyId) === 2;
    if (isIQD) {
      return amount <= -250;
    }
    return amount <= -1;
  }

  // Find all active cashboxes with any significant negative currency balance
  const negativeBoxes = cashboxes.filter((cb: any) => {
    if (!cb.isActive) return false;
    return cb.balances?.some((bal: any) => isSignificantNegative(bal));
  });

  if (negativeBoxes.length === 0) return null;

  return (
    <div
      style={{
        direction: "rtl",
        background: "linear-gradient(135deg, #7f1d1d, #991b1b)",
        color: "#fecaca",
        padding: "12px 24px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "2px solid #ef4444",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        zIndex: 50,
        gap: 16,
        animation: "pulseShadow 3s infinite",
        fontFamily: '"Speda", "Inter", sans-serif',
      }}
    >
      <style>{`
        @keyframes pulseShadow {
          0%, 100% { box-shadow: 0 4px 6px -1px rgba(127, 29, 29, 0.4), 0 2px 4px -1px rgba(127, 29, 29, 0.2); }
          50% { box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4), 0 4px 6px -2px rgba(239, 68, 68, 0.2); }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg style={{ width: 26, height: 26, color: "#fca5a5" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
            ئاگاداری: باڵانسی قاسەکان نێگەتیڤە! پێویستە قاسەکەت ڕێک بخەیتەوە.
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {negativeBoxes.map((cb: any) => {
              const negBals = cb.balances.filter((bal: any) => isSignificantNegative(bal));
              return (
                <div
                  key={cb.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ffe4e6",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontWeight: 800, color: "#ffffff" }}>{cb.name}:</span>
                  {negBals.map((bal: any, idx: number) => {
                    const code = bal.currency?.code || "";
                    const isIQD = code === "IQD" || bal.currency?.symbol === "دینار" || bal.currency?.name?.includes("دینار");
                    const symbol = bal.currency?.symbol || "$";
                    const absVal = Math.abs(Number(bal.amount)).toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: isIQD ? 0 : 2,
                    });
                    return (
                      <span key={bal.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <span
                          dir="ltr"
                          style={{
                            display: "inline-flex",
                            flexDirection: "row",
                            alignItems: "baseline",
                            gap: 3,
                            fontWeight: 800,
                            color: "#ffffff",
                          }}
                        >
                          {isIQD ? (
                            <>
                              <span style={{ fontSize: "0.88em", opacity: 0.9 }}>دینار</span>
                              <span>-{absVal}</span>
                            </>
                          ) : (
                            <>
                              <span>-</span>
                              <span style={{ fontSize: "0.88em", opacity: 0.9 }}>{symbol}</span>
                              <span>{absVal}</span>
                            </>
                          )}
                        </span>
                        {idx < negBals.length - 1 && <span style={{ color: "#fecaca" }}>،</span>}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <button
        onClick={() => router.push("/cashboxes")}
        style={{
          background: "#ffffff",
          color: "#991b1b",
          border: "none",
          padding: "8px 16px",
          borderRadius: 8,
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#ffe4e6";
          e.currentTarget.style.transform = "scale(1.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span>بڕۆ بۆ لاپەڕەی قاسەکان</span>
        <span style={{ fontSize: 16 }}>←</span>
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store/store";

export default function NegativeCashboxWarning() {
  const cashboxes = useStore((s) => s.cashboxes) || [];
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

  // Find all active cashboxes with any currency balance < -0.01
  const negativeBoxes = cashboxes.filter((cb: any) => {
    if (!cb.isActive) return false;
    return cb.balances?.some((bal: any) => Number(bal.amount) < -0.01);
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
        <span style={{ fontSize: 24, animation: "bounce 2s infinite" }}>⚠️</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
            ئاگاداری: باڵانسی قاسەکان نێگەتیڤە! پێویستە قاسەکەت ڕێک بخەیتەوە.
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {negativeBoxes.map((cb: any) => {
              const negBals = cb.balances.filter((bal: any) => Number(bal.amount) < -0.01);
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
                    const symbol = bal.currency?.symbol || "$";
                    const absVal = Math.abs(Number(bal.amount)).toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    });
                    const formatted = code === "IQD" ? `${absVal} دینار-` : `${symbol}${absVal}-`;
                    return (
                      <span key={bal.id} dir="ltr" style={{ whiteSpace: "nowrap" }}>
                        {formatted}
                        {idx < negBals.length - 1 ? "، " : ""}
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

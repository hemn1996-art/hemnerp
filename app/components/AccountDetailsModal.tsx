"use client";

import React, { useEffect } from "react";

export type AccountDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  currencies?: any[];
  accountTypes?: any[];
  onViewStatement?: (accountId: number) => void;
};

export default function AccountDetailsModal({
  isOpen,
  onClose,
  account,
  currencies = [],
  accountTypes = [],
  onViewStatement,
}: AccountDetailsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !account) return null;

  // Resolve account type name
  const accountTypeName =
    account.accountType?.name ||
    accountTypes.find((t: any) => Number(t.id) === Number(account.accountTypeId))?.name ||
    "کڕیار";

  // Resolve address
  const fullAddress = account.fullAddress || account.address || account.city?.name || account.city || "";

  // Resolve credit limit
  const creditLimitNum = Number(account.creditLimit || 0);
  const creditLimitCurr = currencies.find((c: any) => c.id === (account.creditLimitCurrencyId || 11));
  const isCreditLimitIQD = creditLimitCurr?.code === "IQD" || creditLimitCurr?.name?.includes("دینار") || (account.creditLimitCurrencyId || 11) === 11;
  const creditLimitSymbol = isCreditLimitIQD ? "دینار" : (creditLimitCurr?.symbol || "$");

  // Resolve balances
  const balMap: Record<string, number> = {};
  if (account.balanceByCurrency && typeof account.balanceByCurrency === "object") {
    for (const [cId, val] of Object.entries(account.balanceByCurrency)) {
      const n = Number(val || 0);
      if (Math.abs(n) > 0.0001) {
        balMap[cId] = n;
      }
    }
  }
  if (Object.keys(balMap).length === 0 && typeof account.balance === "number") {
    const fallbackCurId = String(account.balanceCurrencyId || account.creditLimitCurrencyId || 11);
    balMap[fallbackCurId] = Number(account.balance || 0);
  }

  // Calculate whether credit limit is exceeded
  const primaryBal = Object.values(balMap)[0] || Number(account.balance || 0);
  const isOverCreditLimit =
    !account.isShareholder &&
    creditLimitNum > 0 &&
    Math.abs(primaryBal) > creditLimitNum;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid #e2e8f0",
          fontFamily: "inherit",
        }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Navy Header */}
        <div
          style={{
            backgroundColor: "#071838",
            color: "#ffffff",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ width: 24 }} /> {/* Balance spacer to keep title centered */}
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 800,
              textAlign: "center",
              flex: 1,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            {account.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              lineHeight: 0,
              opacity: 0.9,
              transition: "opacity 0.15s ease",
            }}
            title="داخستن"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body Rows */}
        <div style={{ padding: "16px 22px" }}>
          {/* Row 1: جۆری هەژمار */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>جۆری هەژمار</span>
            <span style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>{accountTypeName}</span>
          </div>

          {/* Row 2: ژمارە تەلەفۆن */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>ژمارە تەلەفۆن</span>
            <span style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }} dir="ltr">
              {account.phone || ""}
            </span>
          </div>

          {/* Row 3: ناونیشان */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>ناونیشان</span>
            <span style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>{fullAddress}</span>
          </div>

          {/* Row 5: داشکاندن */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>داشکاندن</span>
            <span style={{ fontSize: "14px", color: "#334155", fontWeight: 600 }}>
              %{account.discountPercent || 0}
            </span>
          </div>

          {/* Row 6: سنووری قەرز */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>سنووری قەرز</span>
            <span style={{ fontSize: "14px", color: "#334155", fontWeight: 600 }}>
              {creditLimitNum > 0 ? (
                <span dir="ltr">
                  {creditLimitSymbol} {creditLimitNum.toLocaleString("en-US", { maximumFractionDigits: isCreditLimitIQD ? 0 : 2 })}
                </span>
              ) : (
                "دیاری نەکراوە"
              )}
            </span>
          </div>

          {/* Row 7: باڵانس */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>باڵانس</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
              {(() => {
                const entries = Object.entries(balMap);
                if (entries.length === 0) {
                  return (
                    <span style={{ color: "#16a34a", fontWeight: 900, fontSize: "15px" }}>
                      0
                    </span>
                  );
                }
                return entries.map(([curIdText, val]) => {
                  const curId = Number(curIdText);
                  const curr = currencies.find((c: any) => c.id === curId);
                  const isIQD = curr?.code === "IQD" || curr?.name?.includes("دینار") || curId === 11;
                  // val > 0.01: customer owes us -> GREEN (#16a34a)
                  // val < -0.01: we owe customer -> RED (#dc2626)
                  const color = val > 0.01 ? "#16a34a" : val < -0.01 ? "#dc2626" : "#64748b";
                  const formattedNum = Math.abs(val).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: isIQD ? 0 : 2,
                  });
                  const symbolOrName = isIQD ? "دینار" : (curr?.symbol || "$");

                  return (
                    <span
                      key={curIdText}
                      style={{
                        color,
                        fontWeight: 900,
                        fontSize: "15px",
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 4,
                      }}
                      dir="ltr"
                    >
                      <span>{symbolOrName}</span>
                      <span>{formattedNum}</span>
                    </span>
                  );
                });
              })()}
            </div>
          </div>

          {/* Row 8: سنووری قەرزی تێپەڕاندووە */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>سنووری قەرزی تێپەڕاندووە</span>
            <span style={{ fontSize: "14px", fontWeight: 800 }}>
              {isOverCreditLimit ? (
                <span style={{ color: "#dc2626" }}>بەڵێ</span>
              ) : (
                <span style={{ color: "#334155" }}>نەخێر</span>
              )}
            </span>
          </div>

          {/* Statement Quick Link */}
          {onViewStatement && account.id && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                onClick={() => onViewStatement(account.id)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "background 0.15s ease",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>کەشفی حسابی هەژمار</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

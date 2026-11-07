"use client";

import React, { useState, useEffect } from "react";

interface CostEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    productId: number;
    productName: string;
    warehouseId: number;
    cost: number;
    rawCost?: number;
    isIQD?: boolean;
    currencyCode?: string;
    currencySymbol?: string;
  } | null;
  onSaveSuccess: () => void;
  marketRate?: number;
}

interface CostHistoryItem {
  id: string;
  txId: number;
  voucherId: number;
  voucherType: string;
  voucherNo: string | number;
  isDeleted: boolean;
  employeeName: string;
  date: string;
  cost: number;
  currencyId: number;
  currencySymbol: string;
  note: string | null;
  direction: "up" | "down" | "neutral";
  isLatest: boolean;
}

export default function CostEditModal({
  isOpen,
  onClose,
  item,
  onSaveSuccess,
  marketRate = 1520,
}: CostEditModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [newCost, setNewCost] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<CostHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCount, setHistoryCount] = useState<number>(0);

  const isIQD = item?.isIQD === true || item?.currencyCode === "IQD";
  const currentCost = isIQD ? (item?.rawCost || item?.cost || 0) : (item?.cost || 0);
  const currencySymbol = isIQD ? "دینار" : "$";
  const decimals = isIQD ? 0 : 2;

  useEffect(() => {
    if (isOpen && item) {
      setActiveTab("details");
      setNewCost(currentCost > 0 ? String(currentCost) : "");
      setReason("");
      setErrorMsg(null);
      fetchHistory(item.productId);
    }
  }, [isOpen, item]);

  const fetchHistory = async (productId: number) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/reports/stock/cost-history?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
        setHistoryCount(data.count || 0);
      }
    } catch (err) {
      console.error("Failed to load cost history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    const costVal = parseFloat(newCost);
    if (isNaN(costVal) || costVal < 0) {
      setErrorMsg("تکایە بڕی تێچوو بە دروستی بنووسە");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("تکایە هۆکاری گۆڕینی نرخ بنووسە (ناچارە)");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/reports/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          warehouseId: item.warehouseId,
          cost: costVal,
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        onSaveSuccess();
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "کێشەیەک ڕوویدا لە نوێکردنەوەی تێچوو");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("کێشەی پەیوەندی کردن بە سێرڤەرەوە ڕوویدا");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCostDisplay = (val: number, isIqdItem: boolean) => {
    const formatted = val.toLocaleString("en-US", {
      minimumFractionDigits: isIqdItem ? 0 : 2,
      maximumFractionDigits: 4,
    });
    return isIqdItem ? `دینار ${formatted}` : `$ ${formatted}`;
  };

  const formatHistoryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}/${month}/${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-right rtl animate-in zoom-in-95 duration-150 border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0b1f50] text-white px-6 py-4 flex items-center justify-between select-none">
          <h3 className="font-bold text-base tracking-wide">
            نوێکردنەوەی نرخی تێچوو
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Product Name Subtitle */}
        <div className="pt-4 pb-2 px-6 text-center border-b border-gray-50">
          <h4 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">
            {item.productName}
          </h4>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6 gap-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-3 pt-2 text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === "details"
                ? "text-[#0b1f50] border-b-2 border-[#0b1f50]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>وردەکاری</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 pt-2 text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 relative ${
              activeTab === "history"
                ? "text-[#0b1f50] border-b-2 border-[#0b1f50]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>مێژووی نرخی تێچوو</span>
            {historyCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-black">
                {historyCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "details" ? (
            <div className="space-y-5">
              {/* Cost Comparison Box */}
              <div className="bg-gray-50/90 border border-gray-200 rounded-xl p-4 flex items-center justify-between text-sm shadow-2xs">
                {/* Current Cost */}
                <div className="text-right">
                  <span className="text-xs text-gray-400 font-bold block mb-1">ئێستا</span>
                  <span className="text-sm md:text-base font-black text-gray-700" dir="ltr">
                    {formatCostDisplay(currentCost, isIQD)}
                  </span>
                </div>

                {/* Arrow */}
                <div className="text-gray-400 font-bold text-lg px-2">
                  ←
                </div>

                {/* New Cost Preview */}
                <div className="text-left">
                  <span className="text-xs text-gray-400 font-bold block mb-1">نوێ</span>
                  <span className="text-sm md:text-base font-black text-[#0b1f50]" dir="ltr">
                    {formatCostDisplay(parseFloat(newCost) || currentCost, isIQD)}
                  </span>
                </div>
              </div>

              {/* Input: Cost */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  * کۆست {isIQD ? "دینار" : "دۆلار"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newCost}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        setNewCost(val);
                      }
                    }}
                    placeholder="بڕی تێچووی نوێ..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-800 outline-none text-right font-bold shadow-sm focus:border-[#0b1f50] focus:ring-1 focus:ring-[#0b1f50] transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    {currencySymbol}
                  </span>
                </div>
              </div>

              {/* Input: Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  * هۆکار
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="هۆکاری نوێکردنەوەی تێچوو بنووسە..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-800 outline-none text-right font-medium shadow-sm focus:border-[#0b1f50] focus:ring-1 focus:ring-[#0b1f50] transition-all resize-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
                  {errorMsg}
                </div>
              )}
            </div>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {historyLoading ? (
                <div className="text-center py-10 text-gray-400 font-bold text-xs">
                  باردەکرێت...
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold text-xs">
                  هیچ مێژوویەکی تێچوو نەدۆزرایەوە
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {historyList.map((entry, idx) => {
                    const isEntryIQD = entry.currencyId === 2 || entry.currencySymbol === "دینار";
                    const isUp = entry.direction === "up";
                    const isDown = entry.direction === "down";
                    const amountColor = isUp
                      ? "text-rose-600"
                      : isDown
                      ? "text-emerald-600"
                      : "text-gray-700";

                    return (
                      <div key={entry.id || idx} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        {/* Right side in RTL: Amount, direction arrow, badges, voucher, note */}
                        <div className="flex flex-col gap-1 items-start text-right">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${amountColor}`} dir="ltr">
                              {formatCostDisplay(entry.cost, isEntryIQD)}
                            </span>
                            {/* Arrow Indicator */}
                            {isUp && <span className="text-rose-600 font-black text-sm">↑</span>}
                            {isDown && <span className="text-emerald-600 font-black text-sm">↓</span>}
                            {!isUp && !isDown && <span className="text-gray-400 font-black text-xs">•</span>}

                            {/* Latest Badge */}
                            {entry.isLatest && (
                              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                                نوێترین
                              </span>
                            )}

                            {/* Deleted Badge */}
                            {entry.isDeleted && (
                              <span className="border border-rose-300 text-rose-600 bg-rose-50/70 text-[10px] font-black px-2 py-0.5 rounded-md">
                                سڕاوەتەوە
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-bold text-gray-700">
                            <span>{entry.voucherType}</span> <span>{entry.voucherNo}</span>
                          </div>

                          {entry.note && (
                            <div className="text-[11px] text-gray-500 italic">
                              {entry.note}
                            </div>
                          )}
                        </div>

                        {/* Left side in RTL: Date & Employee */}
                        <div className="flex flex-col items-end text-left shrink-0">
                          <span className="text-[11px] text-gray-400 font-medium" dir="ltr">
                            {formatHistoryDate(entry.date)}
                          </span>
                          <span className="text-xs font-bold text-gray-600 mt-0.5">
                            {entry.employeeName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
          >
            پاشگەزبوونەوە
          </button>
          {activeTab === "details" && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !reason.trim() || !newCost}
              className="bg-[#0b1f50] hover:bg-[#061f5f] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>خەزن دەکرێت...</span>
              ) : (
                <>
                  <span>✓</span>
                  <span>خەزنکردن</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

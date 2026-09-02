import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CashboxLike, CurrencyLike } from "./types";
import DateInput from "../DateInput";

type Props = {
  statementCashbox: CashboxLike | null;
  vouchers: any[];
  currencies: CurrencyLike[];
  closeStatement: () => void;
  isFullPage?: boolean;
};

export default function StatementModal({
  statementCashbox,
  vouchers,
  currencies,
  closeStatement,
  isFullPage = false,
}: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isMovementsExpanded, setIsMovementsExpanded] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const lastCashboxIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (statementCashbox) {
      if (lastCashboxIdRef.current !== statementCashbox.id) {
        lastCashboxIdRef.current = statementCashbox.id;
        setStartDate("");
        setEndDate("");
        setCurrentPage(1);
      }
    }
  }, [statementCashbox?.id]);

  if (!statementCashbox) return null;

  function getCurrencySymbol(currencyId: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function formatMoney(amount: number, currencyId: number, isChange = false) {
    const symbol = getCurrencySymbol(currencyId);
    const code = getCurrencyCode(currencyId);
    const num = Number(amount || 0);
    const absVal = Math.abs(num);
    const isIQD = code === "IQD";
    const formattedNum = isIQD
      ? Math.round(absVal).toLocaleString("en-US")
      : absVal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const isNegative = num < -0.0001;

    if (isIQD) {
      if (isChange) {
        return num >= 0 ? `+ ${formattedNum} دینار` : `- ${formattedNum} دینار`;
      }
      return isNegative ? `- ${formattedNum} دینار` : `${formattedNum} دینار`;
    }

    if (isChange) {
      return num >= 0 ? `+ ${symbol} ${formattedNum}` : `- ${symbol} ${formattedNum}`;
    }
    return isNegative ? `- ${symbol} ${formattedNum}` : `${symbol} ${formattedNum}`;
  }

  function formatChanges(changesMap: Record<number, number>) {
    const parts = Object.entries(changesMap)
      .filter(([, amt]) => Math.abs(amt) > 0.001)
      .map(([curId, amt]) => {
        return formatMoney(amt, Number(curId), true);
      });
    return parts.length ? parts.join(" و ") : "0";
  }

  function formatRunningBalanceMap(balanceMap: Record<number, number>) {
    const parts = Object.entries(balanceMap)
      .filter(([, amt]) => Math.abs(amt) > 0.001)
      .map(([curId, amt]) => formatMoney(amt, Number(curId), false));
    return parts.length ? parts.join(" + ") : "0";
  }

  function formatRowDate(dateStr: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

    return `${day}/${month}/${year}, ${formattedTime}`;
  }

  function getKurdishType(type: string) {
    if (type === "sales") return "فرۆشتن";
    if (type === "purchase") return "کڕین";
    if (type === "money_in") return "پارەی هاتوو";
    if (type === "money_out") return "پارەی ڕۆشتوو";
    if (type === "expense") return "خەرجی";
    if (type === "sales_return") return "گەڕانەوەی فرۆشتن";
    if (type === "purchase_return") return "گەڕانەوەی کڕین";
    if (type === "cashbox_exchange") return "گۆڕینەوەی دراو";
    if (type === "cashbox_transfer") return "گواستنەوەی دراو";
    if (type === "shareholder_deposit") return "دانانی پارە";
    if (type === "shareholder_withdrawal") return "کشانەوەی پارە";
    if (type === "cashbox_withdrawal") return "کشانەوەی پارە";
    if (type === "my_debt_discount") return "داشکاندنم بۆ کراوە";
    if (type === "people_debt_discount") return "داشکاندنم کردوە";
    if (type === "debt_discount" || type === "debt discount") return "داشکاندنم کردوە";
    if (type === "material_issue" || type === "سەرفی مواد" || type === "سەرفی مەواد") return "سەرفی مەواد";
    if (type === "warehouse_damage" || type === "خەسارەی کۆگا" || type === "زیانی کۆگا") return "زیانی کۆگا";
    if (type === "warehouse_stock" || type === "جەردی کۆگا") return "جەردی کۆگا";
    if (type === "product_transfer" || type === "گواستنەوەی کاڵا" || type === "گواستنەوەی کەرەستە") return "گواستنەوەی کەرەستە";
    if (type === "initial_balance") return "باڵانسی سەرەتایی";

    return type;
  }

  // 1. Compute all chronological movements for this cashbox including initial balance
  const allMovements = useMemo(() => {
    const list: any[] = [];

    vouchers.forEach((v: any) => {
      const changes: { currencyId: number; amount: number }[] = [];

      if (v.cashboxId === statementCashbox.id) {
        if (v.rawType === "cashbox_exchange" || v.type === "cashbox_exchange") {
          v.paidAmounts?.forEach((pa: any) => {
            changes.push({ currencyId: Number(pa.currencyId), amount: Number(pa.amount) });
          });
        } else {
          const isIncoming = [
            "sales",
            "money_in",
            "shareholder_deposit",
            "purchase_return",
          ].includes(v.rawType || v.type);

          v.paidAmounts?.forEach((pa: any) => {
            const amt = Math.abs(Number(pa.amount));
            const change = isIncoming ? amt : -amt;
            changes.push({ currencyId: Number(pa.currencyId), amount: change });
          });
        }
      } else if (v.fromCashboxId === statementCashbox.id) {
        v.paidAmounts?.forEach((pa: any) => {
          changes.push({ currencyId: Number(pa.currencyId), amount: -Math.abs(Number(pa.amount)) });
        });
      } else if (v.toCashboxId === statementCashbox.id) {
        v.paidAmounts?.forEach((pa: any) => {
          changes.push({ currencyId: Number(pa.currencyId), amount: Math.abs(Number(pa.amount)) });
        });
      }

      if (changes.length > 0) {
        const combined: Record<number, number> = {};
        changes.forEach((ch) => {
          combined[ch.currencyId] = (combined[ch.currencyId] || 0) + ch.amount;
        });

        list.push({
          id: v.id,
          date: new Date(v.date),
          dateStr: v.date,
          type: v.type,
          rawType: v.rawType || v.type,
          accountName: v.accountName || v.account?.name || "-",
          note: v.internalNote || v.printNote || "-",
          changes: combined,
          isInitial: false,
        });
      }
    });

    // Sort chronologically ascending (stable with id)
    list.sort((a, b) => a.date.getTime() - b.date.getTime() || (typeof a.id === "number" && typeof b.id === "number" ? a.id - b.id : 0));

    // Sum all voucher movements per currency across all time
    const totalMovementSum: Record<number, number> = {};
    list.forEach((m) => {
      Object.entries(m.changes).forEach(([curId, change]) => {
        const cId = Number(curId);
        totalMovementSum[cId] = (totalMovementSum[cId] || 0) + Number(change);
      });
    });

    // Compute initial starting balance from current DB balance:
    // initial = currentInDB - totalMovementSum
    const initialBalanceMap: Record<number, number> = {};
    (statementCashbox.balances || []).forEach((b) => {
      const cId = Number(b.currencyId);
      const currentAmount = Number(b.amount || 0);
      const totalMovement = totalMovementSum[cId] || 0;
      const initialAmount = currentAmount - totalMovement;
      if (Math.abs(initialAmount) > 0.0001) {
        initialBalanceMap[cId] = initialAmount;
      }
    });

    // Start running map from initialBalanceMap
    const runningMap: Record<number, number> = { ...initialBalanceMap };
    const movementsWithInitial: any[] = [];

    const hasInitialBalance = Object.values(initialBalanceMap).some((amt) => Math.abs(amt) > 0.0001);
    if (hasInitialBalance) {
      movementsWithInitial.push({
        id: "initial",
        date: new Date(statementCashbox.createdAt || 0),
        dateStr: statementCashbox.createdAt || "",
        type: "باڵانسی سەرەتایی",
        rawType: "initial_balance",
        accountName: "-",
        note: "باڵانسی سەرەتایی قاسە لە کاتی دروستکردندا",
        changes: { ...initialBalanceMap },
        runningBalance: { ...initialBalanceMap },
        isInitial: true,
      });
    }

    list.forEach((m) => {
      Object.entries(m.changes).forEach(([curId, change]) => {
        const cId = Number(curId);
        runningMap[cId] = (runningMap[cId] || 0) + Number(change);
      });
      m.runningBalance = { ...runningMap };
      movementsWithInitial.push(m);
    });

    return movementsWithInitial;
  }, [vouchers, statementCashbox]);

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // 2. Filter movements by date (reversed for display: newest first)
  const filteredMovements = useMemo(() => {
    const list = allMovements.filter((m) => {
      if (m.isInitial && !startDate) return true;
      if (!m.dateStr) return true;
      const d = new Date(m.dateStr);
      if (isNaN(d.getTime())) return true;
      const y = d.getFullYear();
      const mon = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const mDateOnly = `${y}-${mon}-${day}`;
      if (startDate && mDateOnly < startDate) return false;
      if (endDate && mDateOnly > endDate) return false;
      return true;
    });
    return list.slice().reverse();
  }, [allMovements, startDate, endDate]);

  // 3. Paginated movements
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMovements.slice(startIndex, startIndex + pageSize);
  }, [filteredMovements, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;

  // 4. Calculate statement totals (banner display represents the latest running balance)
  const latestRunningBalanceMap = useMemo(() => {
    if (allMovements.length === 0) {
      const emptyMap: Record<number, number> = {};
      (statementCashbox.balances || []).forEach((b) => {
        if (Math.abs(Number(b.amount || 0)) > 0.0001) {
          emptyMap[b.currencyId] = Number(b.amount || 0);
        }
      });
      return emptyMap;
    }
    const lastItem = allMovements[allMovements.length - 1];
    return lastItem.runningBalance || {};
  }, [allMovements, statementCashbox]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      "#",
      "بەروار",
      "پسوڵە",
      "جۆر",
      "هەژمار",
      "تێبینی",
      "پارەی دراو",
      "باڵانس",
    ];
    const csvRows = [headers.join(",")];

    filteredMovements.forEach((m, idx) => {
      const row = [
        idx + 1,
        formatRowDate(m.dateStr),
        m.isInitial ? "سەرەتایی" : m.id,
        getKurdishType(m.type),
        String(m.accountName || "-").replace(/,/g, " "),
        String(m.note || "-").replace(/,/g, " "),
        formatChanges(m.changes).replace(/,/g, " | "),
        formatRunningBalanceMap(m.runningBalance).replace(/,/g, " | "),
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `جووڵەکانی_قاسەی_${statementCashbox.name}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderBannerBalances = () => {
    const activeEntries = Object.entries(latestRunningBalanceMap).filter(
      ([, amt]) => Math.abs(Number(amt || 0)) > 0.001
    );

    if (activeEntries.length === 0) {
      return <span className="text-2xl font-black text-slate-800">0</span>;
    }

    return (
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {activeEntries.map(([curId, amt]) => {
          const numAmt = Number(amt || 0);
          const isNeg = numAmt < -0.001;
          const formatted = formatMoney(numAmt, Number(curId), false);
          return (
            <span
              key={curId}
              dir="ltr"
              className={`text-xl md:text-2xl font-black px-4 py-1.5 rounded-xl shadow-sm border ${
                isNeg
                  ? "text-red-700 bg-red-50 border-red-200"
                  : "text-emerald-900 bg-emerald-50 border-emerald-300"
              }`}
            >
              {formatted}
            </span>
          );
        })}
      </div>
    );
  };

  const renderRunningBalanceBadges = (balanceMap: Record<number, number>) => {
    const activeEntries = Object.entries(balanceMap || {}).filter(
      ([, amt]) => Math.abs(Number(amt || 0)) > 0.001
    );

    if (activeEntries.length === 0) {
      return <span className="text-slate-400 font-bold text-sm">0</span>;
    }

    return (
      <div className="flex flex-col gap-1 items-center justify-center">
        {activeEntries.map(([curId, amt]) => {
          const numAmt = Number(amt || 0);
          const isNeg = numAmt < -0.001;
          const formatted = formatMoney(numAmt, Number(curId), false);
          return (
            <span
              key={curId}
              dir="ltr"
              className={`font-black text-sm px-2.5 py-0.5 rounded-md ${
                isNeg
                  ? "text-red-700 bg-red-50 border border-red-200"
                  : "text-slate-900 bg-slate-50 border border-slate-200"
              }`}
            >
              {formatted}
            </span>
          );
        })}
      </div>
    );
  };

  const wrapperClass = isFullPage
    ? "w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col print:border-none print:shadow-none"
    : "w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col print:shadow-none print:max-h-none print:overflow-visible print:rounded-none";

  const content = (
    <div id="print-area" className={wrapperClass} dir="rtl" onClick={(e) => e.stopPropagation()}>
      {/* Modal Header */}
      <div className="flex justify-between items-center border-b border-slate-100 p-6 bg-slate-50/50 print:border-b-2 print:border-black rounded-t-2xl">
        <div>
          <h2 className="m-0 text-2xl font-black text-slate-850 flex items-center gap-2">
            <span>جووڵەی قاسە ~ {statementCashbox.name}</span>
          </h2>
          <p className="mt-1 text-slate-500 font-medium no-print">
            مامەڵە و باڵانسی قاسە بەپێی بەروار
          </p>
        </div>
        {isFullPage ? (
          <button
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-900 transition-all font-bold no-print flex items-center gap-2 text-sm cursor-pointer active:scale-95 shadow-sm"
            onClick={closeStatement}
          >
            ← گەڕانەوە بۆ قاسەکان
          </button>
        ) : (
          <button
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center text-xl font-bold no-print cursor-pointer"
            onClick={closeStatement}
            title="پاشگەزبوونەوە"
          >
            ×
          </button>
        )}
      </div>

      {/* Modal Body */}
      <div className="p-6 grid gap-6 print:overflow-visible print:p-4">
        {/* Filters Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-visible no-print">
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full px-5 py-4 bg-slate-50/60 border-b border-slate-100 flex justify-between items-center text-slate-700 hover:bg-slate-50 transition-all rounded-t-2xl"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>فلتەرەکان</span>
            </div>
            <span className="text-slate-400 text-sm">
              {isFiltersExpanded ? "▲ شاردنەوە" : "▼ نیشاندان"}
            </span>
          </button>

          {isFiltersExpanded && (
            <div className="p-5 grid gap-4 md:grid-cols-4 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-600">
                  بەرواری دەستپێک
                </label>
                <DateInput
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-600">
                  بەرواری کۆتایی
                </label>
                <DateInput
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-750 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                  title="ڕێکخستنەوە"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>ڕێکخستنەوە</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-blue-200 cursor-pointer"
                  title="پرێنت"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>پرێنت</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
                  title="ئێکسڵ"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>ئێکسڵ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Movements List Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
          <button
            onClick={() => setIsMovementsExpanded(!isMovementsExpanded)}
            className="w-full px-5 py-4 bg-slate-50/60 border-b border-slate-100 flex justify-between items-center text-slate-700 hover:bg-slate-50 transition-all no-print"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>جووڵەکان</span>
            </div>
            <span className="text-slate-400 text-sm">
              {isMovementsExpanded ? "▲ شاردنەوە" : "▼ نیشاندان"}
            </span>
          </button>

          {isMovementsExpanded && (
            <div className="p-5 grid gap-5 print:p-0">
              {/* Balance Summary Display */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex justify-between items-center text-emerald-900 shadow-sm print:bg-slate-50 print:border-black print:border-2">
                <strong className="text-lg">باڵانس:</strong>
                {renderBannerBalances()}
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-sm print:border-black print:rounded-none">
                <table className="w-full min-w-[800px] border-collapse print:min-w-full">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-center print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                      <th className="p-4 border-b border-slate-200 font-bold w-12">
                        #
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold">
                        بەروار
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold w-20">
                        پسوڵە
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold">
                        جۆر
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold">
                        هەژمار
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold max-w-xs">
                        تێبینی
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold">
                        پارەی دراو
                      </th>
                      <th className="p-4 border-b border-slate-200 font-bold">
                        باڵانس
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-center">
                    {filteredMovements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-14 text-slate-400 font-bold border-b border-slate-100"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <div className="text-lg">هیچ جوڵەیەک نەدۆزرایەوە بۆ ئەم ماوەیە.</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      (window.location.search.includes("print")
                        ? filteredMovements
                        : paginatedMovements
                      ).map((row, index) => {
                        const originalIndex =
                          (currentPage - 1) * pageSize + index + 1;

                        // Format each currency change with color coding
                        const renderPaidAmount = () => {
                          return Object.entries(row.changes).map(
                            ([curId, amt]: any, idx) => {
                              const isPositive = amt >= 0;
                              const textClass = isPositive
                                ? "text-emerald-700 font-black"
                                : "text-red-700 font-black";
                              const formatted = formatMoney(
                                amt,
                                Number(curId),
                                true
                              );
                              return (
                                <div key={idx} className={`${textClass}`} dir="ltr">
                                  {formatted}
                                </div>
                              );
                            }
                          );
                        };

                        return (
                          <tr
                            key={row.isInitial ? "initial" : row.id}
                            className={`hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0 print:border-b print:border-black ${
                              row.isInitial ? "bg-amber-50/40 font-semibold" : ""
                            }`}
                          >
                            <td className="p-4 text-slate-500 font-bold text-sm">
                              {originalIndex}
                            </td>
                            <td className="p-4 text-slate-700 text-sm" dir="ltr">
                              {row.isInitial ? "سەرەتایی" : formatRowDate(row.dateStr)}
                            </td>
                            <td className="p-4">
                              {row.isInitial ? (
                                <span className="inline-block bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-black">
                                  سەرەتایی
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      closeStatement();
                                      const url = (row.rawType === "cashbox_transfer")
                                        ? `/currency-transfer?editId=${row.id}`
                                        : (row.rawType === "cashbox_exchange")
                                          ? `/currency-exchange?editId=${row.id}`
                                          : `/invoices?editId=${row.id}&type=${row.rawType}&t=${Date.now()}`;
                                      router.push(url);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-1 rounded-lg text-sm transition-all cursor-pointer shadow-sm active:scale-95 print:bg-white print:text-black print:border print:border-black no-print"
                                  >
                                    {row.id}
                                  </button>
                                  <span className="hidden print:inline font-extrabold text-sm text-black">
                                    {row.id}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="p-4 font-bold text-slate-800 text-sm">
                              {getKurdishType(row.type)}
                            </td>
                            <td className="p-4 text-slate-700 text-sm">
                              {row.accountName}
                            </td>
                            <td className="p-4 text-slate-500 text-sm text-center align-middle max-w-xs break-words">
                              {row.note}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {renderPaidAmount()}
                              </div>
                            </td>
                            <td className="p-4 text-slate-900 font-extrabold text-sm">
                              {renderRunningBalanceBadges(row.runningBalance)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredMovements.length > 0 && (
                <div className="flex flex-wrap justify-between items-center gap-4 mt-2 no-print">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">
                      بینینی
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm bg-white cursor-pointer"
                    >
                      <option value={10}>10 دێڕ</option>
                      <option value={20}>20 دێڕ</option>
                      <option value={50}>50 دێڕ</option>
                      <option value={100}>100 دێڕ</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentPage((p: any) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none font-bold transition-all text-sm cursor-pointer"
                    >
                      پێشتر
                    </button>
                    <span className="text-sm font-bold text-slate-650">
                      لاپەڕەی {currentPage} لە {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p: any) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none font-bold transition-all text-sm cursor-pointer"
                    >
                      دواتر
                    </button>
                  </div>

                  <div className="bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-full font-bold text-sm">
                    کۆی گشتی: {filteredMovements.length.toLocaleString("en-US")}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      {!isFullPage && (
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center no-print rounded-b-2xl">
          <button
            className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={closeStatement}
          >
            داخستن
          </button>
        </div>
      )}
    </div>
  );

  if (isFullPage) {
    return (
      <div className="w-full">
        {/* Styles for print styling */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-area, #print-area * {
              visibility: visible !important;
            }
            #print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in print:bg-white print:p-0 print:static print:inset-auto">
      {/* Styles for print styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {content}
    </div>
  );
}

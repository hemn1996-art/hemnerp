import { useState, useMemo } from "react";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isMovementsExpanded, setIsMovementsExpanded] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (!statementCashbox) return null;

  // Helper formatting functions
  function getCurrencySymbol(currencyId: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function formatMoney(amount: number, currencyId: number) {
    const symbol = getCurrencySymbol(currencyId);
    const code = getCurrencyCode(currencyId);
    if (code === "IQD") {
      return `${Number(amount || 0).toLocaleString("en-US")} دینار`;
    }
    return `${Number(amount || 0).toLocaleString("en-US")} ${symbol}`;
  }

  function formatChanges(changesMap: Record<number, number>) {
    const parts = Object.entries(changesMap)
      .filter(([, amt]) => Math.abs(amt) > 0.001)
      .map(([curId, amt]) => {
        const formatted = formatMoney(Math.abs(amt), Number(curId));
        return amt >= 0 ? `+ ${formatted}` : `- ${formatted}`;
      });
    return parts.length ? parts.join(" و ") : "0";
  }

  function formatRunningBalanceMap(balanceMap: Record<number, number>) {
    const parts = Object.entries(balanceMap)
      .filter(([, amt]) => Math.abs(amt) > 0.001)
      .map(([curId, amt]) => formatMoney(amt, Number(curId)));
    return parts.length ? parts.join(" + ") : "0";
  }

  function formatRowDate(dateStr: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
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

  // Translates English invoice/voucher type names to Kurdish
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
    if (type === "my_debt_discount") return "داشکاندن لە قەرزی من";
    if (type === "people_debt_discount") return "داشکاندن لە قەرزی خەڵک";
    if (type === "debt_discount" || type === "debt discount") return "داشکاندن لە قەرزی خەڵک";

    // Fallback if already translated in store
    return type;
  }

  // 1. Compute all chronological movements for this cashbox
  const allMovements = useMemo(() => {
    const list: any[] = [];

    vouchers.forEach((v: any) => {
      const changes: { currencyId: number; amount: number }[] = [];

      if (v.cashboxId === statementCashbox.id) {
        const isIncoming = [
          "sales",
          "money_in",
          "shareholder_deposit",
          "cashbox_exchange",
        ].includes(v.rawType || v.type);

        v.paidAmounts?.forEach((pa: any) => {
          const change = isIncoming ? Number(pa.amount) : -Number(pa.amount);
          changes.push({ currencyId: pa.currencyId, amount: change });
        });
      } else if (v.fromCashboxId === statementCashbox.id) {
        v.paidAmounts?.forEach((pa: any) => {
          changes.push({ currencyId: pa.currencyId, amount: -Number(pa.amount) });
        });
      } else if (v.toCashboxId === statementCashbox.id) {
        v.paidAmounts?.forEach((pa: any) => {
          changes.push({ currencyId: pa.currencyId, amount: Number(pa.amount) });
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
          type: v.type, // UI mapped Kurdish type
          rawType: v.rawType || v.type,
          accountName: v.accountName || "-",
          note: v.internalNote || "-",
          changes: combined,
        });
      }
    });

    // Sort chronologically ascending to calculate correct running balance
    list.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance map
    const runningMap: Record<number, number> = {};
    list.forEach((m) => {
      Object.entries(m.changes).forEach(([curId, change]) => {
        const cId = Number(curId);
        runningMap[cId] = (runningMap[cId] || 0) + Number(change);
      });
      m.runningBalance = { ...runningMap };
    });

    return list;
  }, [vouchers, statementCashbox.id]);

  // 2. Filter movements by date
  const filteredMovements = useMemo(() => {
    return allMovements.filter((m) => {
      const mDateOnly = new Date(m.dateStr).toISOString().slice(0, 10);
      if (startDate && mDateOnly < startDate) return false;
      if (endDate && mDateOnly > endDate) return false;
      return true;
    });
  }, [allMovements, startDate, endDate]);

  // 3. Paginated movements
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMovements.slice(startIndex, startIndex + pageSize);
  }, [filteredMovements, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;

  // 4. Calculate statement totals (for the banner display)
  const statementBalance = useMemo(() => {
    if (filteredMovements.length === 0) return "0";
    // We show the final running balance of the filtered movements list
    const lastMovement = filteredMovements[filteredMovements.length - 1];
    return formatRunningBalanceMap(lastMovement.runningBalance);
  }, [filteredMovements]);

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
        m.id,
        getKurdishType(m.type),
        m.accountName.replace(/,/g, " "),
        m.note.replace(/,/g, " "),
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

  const wrapperClass = isFullPage
    ? "w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col print:border-none print:shadow-none"
    : "w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col print:shadow-none print:max-h-none print:overflow-visible print:rounded-none";

  const content = (
    <div id="print-area" className={wrapperClass} dir="rtl">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden no-print">
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full px-5 py-4 bg-slate-50/60 border-b border-slate-100 flex justify-between items-center text-slate-700 hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-2 font-bold">
              <span>🔍</span> فلتەرەکان
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
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setCurrentPage(1);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-750 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                  title="پاککردنەوە"
                >
                  🔄 پاککردنەوە
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-blue-200 cursor-pointer"
                  title="پرێنت"
                >
                  🖨️ پرێنت
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
                  title="ئێکسڵ"
                >
                  📊 ئێکسڵ
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
            <div className="flex items-center gap-2 font-bold">
              <span>📊</span> جووڵەکان
            </div>
            <span className="text-slate-400 text-sm">
              {isMovementsExpanded ? "▲ شاردنەوە" : "▼ نیشاندان"}
            </span>
          </button>

          {isMovementsExpanded && (
            <div className="p-5 grid gap-5 print:p-0">
              {/* Balance Summary Display */}
              <div className="bg-emerald-50/60 border border-emerald-250 rounded-2xl p-4 flex justify-between items-center text-emerald-850 shadow-sm print:bg-slate-50 print:border-black print:border-2">
                <strong className="text-lg">باڵانس:</strong>
                <span className="text-2xl font-black ltr tracking-tight">
                  {statementBalance}
                </span>
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
                            <span className="text-5xl opacity-40">📭</span>
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
                                ? "text-green-600 font-bold"
                                : "text-red-600 font-bold";
                              const formatted = formatMoney(
                                Math.abs(amt),
                                Number(curId)
                              );
                              return (
                                <div key={idx} className={`${textClass} ltr`}>
                                  {isPositive ? `+ ${formatted}` : `- ${formatted}`}
                                </div>
                              );
                            }
                          );
                        };

                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0 print:border-b print:border-black"
                          >
                            <td className="p-4 text-slate-500 font-bold text-sm">
                              {originalIndex}
                            </td>
                            <td className="p-4 text-slate-700 text-sm ltr">
                              {formatRowDate(row.dateStr)}
                            </td>
                            <td className="p-4">
                              <span className="bg-blue-600 text-white font-extrabold px-3.5 py-1 rounded-lg text-sm print:bg-white print:text-black print:border print:border-black">
                                {row.id}
                              </span>
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
                              <div className="flex flex-col gap-1 items-center">
                                {renderPaidAmount()}
                              </div>
                            </td>
                            <td className="p-4 text-slate-900 font-extrabold text-sm ltr">
                              {formatRunningBalanceMap(row.runningBalance)}
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

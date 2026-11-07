"use client";
import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "../../store/store";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";
import DateInput from "../../components/DateInput";
import BackButton from "../../components/BackButton";
import { formatCurrencyJSX } from "../../utils/currencyHelper";
import QuickDateFilter from "../../components/QuickDateFilter";
import { getDefaultReportDateRange } from "../../utils/datePresets";

interface Product { id: number; name: string; code: string | null; costPrice: number | null; }
interface VoucherLine { id: number; productId: number; qty: number; unitPrice: number; discountAmount: number; lineTotal: number; note: string | null; product: Product; }
interface VoucherPaidAmount { id: number; currencyId: number; amount: number; exchangeRate: number; currency: any; }
interface VoucherExpense { id: number; amount: number; currencyId: number; note: string | null; accountId: number | null; addToAccountDebt?: boolean; }
interface LedgerEntry { id: number; debit: number; credit: number; currencyId: number; exchangeRate?: number; date?: string; currency: any; accountId?: number | null; }
interface Account { id: number; name: string; phone?: string; creditLimit?: number; accountTypeId: number; isShareholder: boolean; exchangeRateType?: string; customExchangeRate?: number; }
interface RawVoucher { id: number; isDeleted?: boolean; referenceNo: string | null; type: string; date: string; accountId: number | null; currencyId: number | null; exchangeRate: number; totalAmount: number; totalDiscount: number; discountCurrencyId?: number | null; netAmount: number; internalNote: string | null; printNote: string | null; hasDelivery: boolean; deliveryFee: number | null; account: Account | null; lines: VoucherLine[]; paidAmounts: VoucherPaidAmount[]; expenses: VoucherExpense[]; ledgerEntries: LedgerEntry[]; }

function AccountStatementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get("accountId");

  const { accounts, currencies, fetchAccounts, fetchCurrencies } = useStore() as any;
  const [vouchers, setVouchers] = useState<RawVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filters (default: 1st of current month to today)
  const defaultDates = useMemo(() => getDefaultReportDateRange(), []);
  const [startDate, setStartDate] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("__erp_statement_start_date");
      if (saved) return saved;
    }
    return defaultDates.startDate;
  });
  const [endDate, setEndDate] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("__erp_statement_end_date");
      if (saved) return saved;
    }
    return defaultDates.endDate;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("__erp_statement_start_date", startDate);
    }
  }, [startDate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("__erp_statement_end_date", endDate);
    }
  }, [endDate]);

  const [filterCurrencyId, setFilterCurrencyId] = useState<string>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [filterShowItems, setFilterShowItems] = useState("شاردنەوە");
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    voucherId: true,
    type: true,
    totalAmount: true,
    discount: true,
    paidAmount: true,
    note: true,
    balance: true,
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCurrencyId !== "all") count++;
    if (filterShowItems !== "شاردنەوە") count++;

    if (startDate !== defaultDates.startDate) count++;
    if (endDate !== defaultDates.endDate) count++;
    
    return count;
  }, [filterCurrencyId, filterShowItems, startDate, endDate, defaultDates]);

  const handleResetFilters = () => {
    setStartDate(defaultDates.startDate);
    setEndDate(defaultDates.endDate);
    setFilterCurrencyId("all");
    setFilterShowItems("شاردنەوە");
    try {
      localStorage.removeItem("__erp_statement_start_date");
      localStorage.removeItem("__erp_statement_end_date");
    } catch (e) {}
  };

  const visibleColCount = 1 +
    (visibleColumns.date ? 1 : 0) +
    (visibleColumns.voucherId ? 1 : 0) +
    (visibleColumns.type ? 1 : 0) +
    (visibleColumns.totalAmount ? 1 : 0) +
    (visibleColumns.discount ? 1 : 0) +
    (visibleColumns.paidAmount ? 1 : 0) +
    (visibleColumns.note ? 1 : 0) +
    (visibleColumns.balance ? 1 : 0);

  const [singleAccount, setSingleAccount] = useState<any>(null);

  useEffect(() => {
    fetchAccounts();
    fetchCurrencies();
    loadVouchers();
    if (accountIdParam) {
      fetch("/api/accounts")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const acc = data.find((a: any) => a.id === Number(accountIdParam));
            if (acc) setSingleAccount(acc);
          }
        })
        .catch(() => {});
    }
  }, [accountIdParam]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vouchers");
      if (res.ok) {
        const data = await res.json();
        const filtered = (data || []).filter((v: any) => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange" && v.rawType !== "cashbox_transfer" && v.rawType !== "cashbox_exchange");
        setVouchers(filtered);
      }
    } finally {
      setLoading(false);
    }
  };

  const account = singleAccount || accounts.find((a: any) => a.id === Number(accountIdParam));

  const getKurdishType = (type: string) => {
    switch (type) {
      case "sales": return "فرۆشتن";
      case "purchase": return "کڕین";
      case "money_in":
      case "پارە وەرگرتن":
      case "پارەی هاتوو":
        return "پارە وەرگرتن";
      case "money_out":
      case "پارەدان":
      case "پارەی ڕۆشتوو":
        return "پارەدان";
      case "expense": return "خەرجی";
      case "sales_return": return "گەڕانەوەی فرۆشتن";
      case "purchase_return": return "گەڕانەوەی کڕین";
      case "cashbox_transfer": return "گواستنەوەی پارە";
      case "cashbox_exchange": return "گۆڕینەوەی پارە";
      case "shareholder_deposit": return "دانانی پارە";
      case "shareholder_withdrawal": return "کشانەوەی پارە";
      case "my_debt_discount": return "داشکاندنم بۆ کراوە";
      case "people_debt_discount":
      case "debt_discount":
      case "debt discount":
        return "داشکاندنم کردوە";
      case "material_issue":
      case "سەرفی مواد":
      case "سەرفی مەواد":
        return "سەرفی مەواد";
      case "warehouse_damage":
      case "خەسارەی کۆگا":
      case "زیانی کۆگا":
        return "زیانی کۆگا";
      case "warehouse_stock":
      case "جەردی کۆگا":
        return "جەردی کۆگا";
      case "product_transfer":
      case "گواستنەوەی کاڵا":
      case "گواستنەوەی کەرەستە":
        return "گواستنەوەی کەرەستە";
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatMoney = (amount: number, curId: number) => {
    return formatCurrencyJSX(Math.abs(amount), curId, currencies);
  };

  const cleanShareholderManualNote = (rawNote: string | null | undefined): string => {
    if (!rawNote) return "";
    let clean = String(rawNote);

    // 1. Remove verbose exchange summary: e.g. "... دینار ڕەیتی گۆڕینەوە ... کۆی گشتی ..."
    clean = clean.replace(/[^\n|]*ڕەیتی\s*گۆڕینەوە[^\n|]*/gi, "");

    // 2. Remove verbose deposit/withdrawal note: e.g. "(... دینار بە ڕەیتی 100 دۆلاری ...)"
    clean = clean.replace(/\([^\)]*دینار\s*بە\s*ڕەیتی\s*100\s*دۆلاری[^\)]*\)/gi, "");
    clean = clean.replace(/[^\n|]*دینار\s*بە\s*ڕەیتی\s*100\s*دۆلاری[^\n|]*/gi, "");

    // 3. Remove "ڕەیتی ١٠٠ دۆلار ... بڕی دراو = ..."
    clean = clean.replace(/[^\n|]*ڕەیتی\s*(?:١٠٠|100)\s*دۆلار[^\n|]*/gi, "");

    // 4. Remove any existing simple rate badges
    clean = clean.replace(/[^\n|]*ڕەیتی\s*(?:100\$|دۆلار)[^\n|]*/gi, "");

    // 5. Remove any standalone "کۆی گشتی" leftovers
    clean = clean.replace(/[^\n|]*کۆی\s*گشتی[^\n|]*/gi, "");

    // 6. Split by lines / pipes, trim punctuation and clean up
    const lines = clean
      .split(/[\n|؛;]/)
      .map(part => part.replace(/^[\s\-|—()]+|[\s\-|—()]+$/g, "").trim())
      .filter(part => part.length > 0);

    return lines.join(" - ");
  };

  const convertAmount = (amount: number, fromCurrencyId: number | null, toCurrencyId: number | null, rate = 1500) => {
    if (!fromCurrencyId || !toCurrencyId || Number(fromCurrencyId) === Number(toCurrencyId)) return amount;
    const fromCur = currencies.find((c: any) => Number(c.id) === Number(fromCurrencyId));
    const toCur = currencies.find((c: any) => Number(c.id) === Number(toCurrencyId));
    if (!fromCur || !toCur || fromCur.code.toUpperCase() === toCur.code.toUpperCase()) return amount;

    let usd = amount;
    if (fromCur.code === "IQD") usd = amount / rate;
    if (toCur.code === "IQD") return usd * rate;
    return usd;
  };

  const renderBalances = (balances: Record<string, number>, isFooter = false, showNote = false) => {
    let entries = Object.entries(balances);
    if (filterCurrencyId !== "all") {
      entries = entries.filter(([curId]) => curId === filterCurrencyId);
    }
    const activeEntries = entries.filter(([_, val]) => Math.abs(val) > 0.01);
    if (activeEntries.length === 0) {
      return (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className={isFooter ? "text-slate-800 font-black text-base" : "text-gray-400 font-bold text-sm"}>0</span>
          {showNote && account?.exchangeRateType === "FIXED" && (
            <span className="text-xs font-black text-purple-950 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm">
              📌 (نرخی جێگیری 100$: {((account?.customExchangeRate || 132000) > 10000 ? (account?.customExchangeRate || 132000) : (account?.customExchangeRate || 132000) * 100).toLocaleString("en-US")} د.ع)
            </span>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5 items-center justify-center">
        {activeEntries.map(([curId, val]) => {
          const isNegative = val < -0.01;

          const noteText = isNegative
            ? " (ئەم بڕە ئێمە قەرزارین)"
            : ` (${account?.name || "هەژمارەکە"} قەرزاری ئێمەیە)`;

          if (isFooter) {
            return (
              <div key={curId} className="flex flex-col md:flex-row items-center justify-center gap-1.5 flex-wrap">
                <div
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 print:py-0.5 print:px-2 rounded-xl print:rounded-md border-2 print:border shadow-sm whitespace-nowrap print:whitespace-nowrap ${
                    isNegative
                      ? "bg-rose-50 border-rose-300 text-rose-950"
                      : "bg-emerald-50 border-emerald-300 text-emerald-950"
                  }`}
                >
                  <span className={`text-base print:text-[10px] font-black ${isNegative ? "text-rose-700" : "text-emerald-700"}`} dir="ltr">
                    {formatMoney(val, Number(curId))}
                  </span>
                  {showNote && (
                    <span className={`text-xs print:text-[9px] font-black ${isNegative ? "text-rose-900" : "text-emerald-900"}`} dir="rtl">
                      {noteText}
                    </span>
                  )}
                </div>

                {showNote && account?.exchangeRateType === "FIXED" && (
                  <div className="inline-flex items-center gap-1 text-xs print:text-[8.5px] font-black text-purple-950 bg-purple-100 border border-purple-300 px-2.5 py-1 print:py-0.5 print:px-1.5 rounded-xl print:rounded-md shadow-sm whitespace-nowrap" title={`نرخی جێگیری 100$: ${((account?.customExchangeRate || 132000) > 10000 ? (account?.customExchangeRate || 132000) : (account?.customExchangeRate || 132000) * 100).toLocaleString("en-US")} دینار`}>
                    📌 (دۆلاری جێگیر: 100$ = {((account?.customExchangeRate || 132000) > 10000 ? (account?.customExchangeRate || 132000) : (account?.customExchangeRate || 132000) * 100).toLocaleString("en-US")} د.ع)
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={curId} className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap print:whitespace-nowrap justify-center text-xs md:text-sm print:text-[10.5px]">
              <span className={`font-bold tracking-tight whitespace-nowrap print:whitespace-nowrap ${isNegative ? "text-rose-600" : "text-emerald-600"}`} dir="ltr">
                {formatMoney(val, Number(curId))}
              </span>
              {showNote && (
                <span className={`text-[11px] font-bold ${isNegative ? "text-rose-700" : "text-emerald-700"}`}>
                  {noteText}
                </span>
              )}
              {showNote && account?.exchangeRateType === "FIXED" && (
                <span className="text-[10px] font-black text-purple-900 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded-md shadow-sm">
                  📌 جێگیر: 100$ = {((account?.customExchangeRate || 132000) > 10000 ? (account?.customExchangeRate || 132000) : (account?.customExchangeRate || 132000) * 100).toLocaleString("en-US")} د.ع
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const usdCurrency = currencies.find((c: any) => c.code === "USD");
  const usdId = usdCurrency ? usdCurrency.id : 1;
  const isShareholder = account?.isShareholder === true;

  const processed = useMemo(() => {
    // 1. Filter vouchers related to this account
    let list = vouchers.filter((v) => 
      !v.isDeleted && (
        v.accountId === Number(accountIdParam) || 
        (v.ledgerEntries && v.ledgerEntries.some(le => le.accountId === Number(accountIdParam)))
      )
    );
    list = list.filter(v => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange");

    // 2. Partition and map each voucher to separate transaction rows
    const rowsList: any[] = [];
    const targetAccountId = Number(accountIdParam);

    list.forEach(v => {
      const expenseEntries = v.ledgerEntries.filter(le => 
        v.expenses && v.expenses.some(exp => exp.accountId === le.accountId && le.credit === Number(exp.amount))
      );
      const mainEntries = v.ledgerEntries.filter(le => !expenseEntries.includes(le));

      // A. Main Invoice row (if the invoice is for this account)
      if (v.accountId === targetAccountId) {
        let entries = mainEntries.filter(le => le.accountId === targetAccountId);
        if (entries.length === 0) {
          const curId = v.currencyId || 1;
          const netAmt = v.netAmount || 0;
          let debit = 0;
          let credit = 0;

          if (["sales", "purchase_return", "people_debt", "قەرزم لای خەڵکە", "داشکاندنم بۆ کراوە", "my_debt_discount"].includes(v.type)) {
            debit = netAmt;
          } else if (["purchase", "sales_return", "my_debt", "من قەرزارم", "people_debt_discount", "debt_discount", "داشکاندنم کردوە"].includes(v.type)) {
            credit = netAmt;
          } else if (["money_in", "پارە وەرگرتن", "پارەی هاتوو", "shareholder_deposit", "دانانی پارە"].includes(v.type)) {
            credit = v.paidAmounts?.[0]?.amount || v.totalAmount || netAmt;
          } else if (["money_out", "پارەدان", "پارەی ڕۆشتوو", "shareholder_withdrawal", "کشانەوەی پارە"].includes(v.type)) {
            debit = v.paidAmounts?.[0]?.amount || v.totalAmount || netAmt;
          }

          if (debit > 0 || credit > 0) {
            entries = [{ accountId: targetAccountId, currencyId: curId, debit, credit, exchangeRate: v.exchangeRate } as any];
          }
        }

        let rowCurrencyId = (entries && entries.length > 0 && entries[0].currencyId) ? entries[0].currencyId : (v.currencyId || 1);
        let rowTotalAmount = (v.type === "shareholder_deposit" || v.type === "shareholder_withdrawal" || !v.netAmount) ? (v.totalAmount || v.netAmount || 0) : v.netAmount;
        let rowTotalDiscount = v.totalDiscount || 0;

        if (v.lines && Array.isArray(v.lines) && v.lines.length > 0) {
          const allLinesIQD = v.lines.every((l: any) => l.currencyId === 2 || l.currencyId === 12);
          const allLinesUSD = v.lines.every((l: any) => l.currencyId === 1 || l.currencyId === 11);
          if (allLinesIQD) {
            rowCurrencyId = 2;
            const sumIQD = v.lines.reduce((s: number, l: any) => s + (Number(l.lineTotal || (Number(l.qty || 0) * Number(l.unitPrice || 0))) || 0), 0);
            if (sumIQD > 5000 && rowTotalAmount < 10000) {
              rowTotalAmount = sumIQD;
            }
          } else if (allLinesUSD) {
            rowCurrencyId = 1;
          }
        }

        // For simple legacy vouchers without ledger entries where payment was recorded in Dinars
        if ((!entries || entries.length === 0) && (v.type === "money_out" || v.type === "money_in" || v.type === "پارەدان" || v.type === "پارە وەرگرتن" || v.type === "پارەی ڕۆشتوو" || v.type === "پارەی هاتوو")) {
          const nonZeroPayments = (v.paidAmounts || []).filter((pa: any) => pa.amount > 0);
          if (nonZeroPayments.length === 1) {
            const singlePaidCurId = nonZeroPayments[0].currencyId;
            if (singlePaidCurId === 2 && rowTotalAmount < 5000 && nonZeroPayments[0].amount > 10000) {
              rowCurrencyId = 2;
              rowTotalAmount = nonZeroPayments[0].amount;
            }
          }
        }

        rowsList.push({
          id: `${v.id}-main`,
          voucherId: v.id,
          referenceNo: v.referenceNo,
          date: v.date,
          type: v.type,
          originalType: v.type,
          kurdishType: getKurdishType(v.type),
          totalAmount: rowTotalAmount,
          currencyId: rowCurrencyId,
          totalDiscount: rowTotalDiscount,
          discountCurrencyId: v.discountCurrencyId || (rowTotalDiscount > 0 ? (v.currencyId || rowCurrencyId || 1) : null),
          paidAmounts: v.paidAmounts ? v.paidAmounts.map(pa => ({ currencyId: pa.currencyId, amount: pa.amount, exchangeRate: pa.exchangeRate })) : [],
          note: v.printNote || v.internalNote || "",
          rawPrintNote: v.printNote,
          rawInternalNote: v.internalNote,
          exchangeRate: v.exchangeRate,
          ledgerEntries: entries,
          hasLines: v.lines && v.lines.length > 0,
          lines: v.lines
        });
      }

      // B. Expense Debt row (for each expense added as debt to this account)
      if (v.expenses && Array.isArray(v.expenses)) {
        v.expenses.forEach(exp => {
          if (exp.accountId === targetAccountId) {
            const relatedLedgers = expenseEntries.filter(le => le.accountId === exp.accountId && le.credit === Number(exp.amount));
            rowsList.push({
              id: `${v.id}-expense-${exp.id}`,
              voucherId: v.id,
              date: v.date,
              type: "expense-debt",
              originalType: v.type,
              kurdishType: "خەرجی پسووڵە",
              totalAmount: Number(exp.amount),
              currencyId: exp.currencyId || v.currencyId || 1,
              totalDiscount: 0,
              paidAmounts: [],
              note: exp.note || "",
              ledgerEntries: relatedLedgers,
              hasLines: false,
              lines: []
            });
          }
        });
      }
    });

    // 3. Sort rows chronologically
    rowsList.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) return ta - tb;
      if (a.voucherId !== b.voucherId) return a.voucherId - b.voucherId;
      return a.id.includes("-main") ? -1 : 1;
    });



    const runningBalances: Record<string, number> = {};
    let previousBalances: Record<string, number> = {};

    const sDate = startDate ? new Date(startDate) : null;
    if (sDate) sDate.setHours(0,0,0,0);
    const eDate = endDate ? new Date(endDate) : null;
    if (eDate) eDate.setHours(23,59,59,999);

    const items = rowsList.map((row: any) => {
      row.ledgerEntries.forEach((le: LedgerEntry) => {
        if (isShareholder) {
          const curKey = String(usdId);
          const change = le.debit - le.credit;
          let rate = 1500;
          if (le.exchangeRate && le.exchangeRate > 10) {
            rate = le.exchangeRate;
          } else {
            const curObj = currencies.find((c: any) => c.id === le.currencyId);
            if (curObj && curObj.rate > 1) {
              rate = curObj.rate;
            }
          }
          const convertedChange = le.currencyId === usdId ? change : change / rate;
          runningBalances[curKey] = (runningBalances[curKey] || 0) + convertedChange;
        } else {
          const curKey = String(le.currencyId);
          runningBalances[curKey] = (runningBalances[curKey] || 0) + (le.debit - le.credit);
        }
      });

      const vDate = new Date(row.date);
      vDate.setHours(0,0,0,0);
      const inRange = (!sDate || vDate >= sDate) && (!eDate || vDate <= eDate);

      // Check if matches currency filter
      let matchesCurrency = true;
      if (filterCurrencyId !== "all") {
        const targetCurId = Number(filterCurrencyId);
        const hasLedger = row.ledgerEntries.some((le: LedgerEntry) => le.currencyId === targetCurId);
        const hasPayment = row.paidAmounts.some((pa: any) => pa.currencyId === targetCurId);
        const isMain = row.currencyId === targetCurId;
        matchesCurrency = hasLedger || hasPayment || isMain;
      }

      return {
        ...row,
        rowBalances: { ...runningBalances },
        inRange,
        matchesCurrency
      };
    });

    // Determine previousBalances (the state of runningBalances just before the first inRange item)
    const beforeItems = items.filter(i => !i.inRange && new Date(i.date) < new Date(startDate || "0"));
    if (beforeItems.length > 0) {
      previousBalances = { ...beforeItems[beforeItems.length - 1].rowBalances };
    } else {
      previousBalances = {};
    }

    const visibleItems = items.filter(i => i.inRange && i.matchesCurrency);
    const finalBalances = visibleItems.length > 0 ? { ...visibleItems[visibleItems.length - 1].rowBalances } : { ...previousBalances };

    return { visibleItems, previousBalances, finalBalances };
  }, [vouchers, accountIdParam, startDate, endDate, filterCurrencyId, account]);

  const shareholderSummary = useMemo(() => {
    if (!isShareholder) return null;
    let totalDepositedUSD = 0;
    let totalWithdrawnUSD = 0;

    processed.visibleItems.forEach((item: any) => {
      const type = item.originalType || item.type;
      if (type === "shareholder_deposit") {
        let valUSD = 0;
        if (item.paidAmounts && item.paidAmounts.length > 0) {
          valUSD = item.paidAmounts.reduce((sum: number, pa: any) => {
            let rate = Number(pa.exchangeRate) || 0;
            if (rate > 0 && rate < 100) rate = rate * 100;
            if (rate > 10000) rate = rate / 100;
            if (rate <= 0) rate = 1500;
            return sum + (pa.currencyId === usdId ? pa.amount : pa.amount / rate);
          }, 0);
        } else {
          valUSD = item.totalAmount || 0;
        }
        totalDepositedUSD += valUSD;
      } else if (type === "shareholder_withdrawal") {
        let valUSD = 0;
        if (item.paidAmounts && item.paidAmounts.length > 0) {
          valUSD = item.paidAmounts.reduce((sum: number, pa: any) => {
            let rate = Number(pa.exchangeRate) || 0;
            if (rate > 0 && rate < 100) rate = rate * 100;
            if (rate > 10000) rate = rate / 100;
            if (rate <= 0) rate = 1500;
            return sum + (pa.currencyId === usdId ? pa.amount : pa.amount / rate);
          }, 0);
        } else {
          valUSD = item.totalAmount || 0;
        }
        totalWithdrawnUSD += valUSD;
      }
    });

    return { totalDepositedUSD, totalWithdrawnUSD };
  }, [isShareholder, processed.visibleItems, usdId]);

  useEffect(() => {
    if (filterShowItems === "پیشاندان") {
      const newExpanded: Record<number, boolean> = {};
      processed.visibleItems.forEach(v => {
        if (v.lines && v.lines.length > 0) {
          newExpanded[v.id] = true;
        }
      });
      setExpandedRows(newExpanded);
    } else {
      setExpandedRows({});
    }
  }, [filterShowItems, processed.visibleItems]);

  const toggleRow = (id: number) => {
    setExpandedRows(p => ({ ...p, [id]: !p[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!accountIdParam || !account) {
    return (
      <div className="min-h-screen bg-[#f4f7fc] text-slate-800 rtl font-sans p-10 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-[#0b1f50] mb-4">هەڵبژاردنی هەژمار</h2>
          <p className="text-gray-500 mb-6 text-sm">تکایە هەژمارێک هەڵبژێرە بۆ بینینی کەشفی حسابەکەی</p>
          <select 
            className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium bg-gray-50 outline-none focus:border-[#0b1f50] mb-6"
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/reports/account-statement?accountId=${e.target.value}`);
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>-- هەڵبژاردنی هەژمار --</option>
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-800 rtl font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 2mm !important;
            margin: 0 !important;
            background: white !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .overflow-hidden,
          .overflow-x-auto,
          .overflow-y-auto {
            overflow: hidden !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 1.5px solid #334155 !important;
            box-sizing: border-box !important;
          }
          th {
            border: 1px solid #475569 !important;
            padding: 4px 2px !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
            background-color: #03133f !important;
            color: white !important;
            text-align: center !important;
            white-space: nowrap !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          th.allow-wrap {
            white-space: normal !important;
          }
          td {
            border: 1px solid #94a3b8 !important;
            padding: 3px 2px !important;
            font-size: 10.5px !important;
            line-height: 1.2 !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          td.allow-wrap {
            white-space: normal !important;
            word-break: break-word !important;
          }
          td:not(.allow-wrap) {
            white-space: nowrap !important;
            word-break: keep-all !important;
          }
          /* Keep all numeric, currency, and paid amount cells strictly single line */
          .single-line-amount,
          .paid-amount-item,
          td[dir="ltr"],
          td[dir="ltr"] * {
            white-space: nowrap !important;
            word-break: keep-all !important;
            font-variant-numeric: tabular-nums !important;
          }
          .paid-amount-item {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 2px !important;
            font-size: 10.5px !important;
            font-weight: 800 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top navbar */}
      <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))} className="text-gray-800 text-2xl font-bold cursor-pointer hover:bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center transition-colors">
            ☰
          </button>
          <span className="font-bold text-gray-800 text-lg">کەشف حساب</span>
        </div>
        <BackButton />
      </div>


      <div id="print-area" className="p-2 md:p-6 mx-auto bg-white min-h-screen shadow-sm print-border">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 no-print border-b border-gray-100 pb-4">
          <div className="flex gap-2 items-center w-full md:w-auto flex-wrap">
            <button onClick={() => setShowFilterModal(true)} className="flex items-center justify-center gap-1.5 bg-[#0b1f50] text-white font-bold px-3.5 py-2 rounded-xl hover:bg-[#061f5f] transition-colors cursor-pointer text-xs shadow-xs border-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>فلتەرەکان</span>
              {activeFiltersCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button 
                onClick={handleResetFilters}
                className="flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold px-3.5 py-2 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer text-xs shadow-xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>ڕێکخستنەوە</span>
              </button>
            )}
            <button 
              onClick={loadVouchers}
              className="flex items-center justify-center gap-1.5 bg-blue-600 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer text-xs shadow-xs border-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>گەڕان</span>
            </button>

            <button onClick={handlePrint} className="flex items-center justify-center gap-1.5 bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer text-xs shadow-xs border-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>پرینت</span>
            </button>

            <button onClick={() => exportTableToExcel("account-statement-table", `keshf_hisab_${account.name}.xlsx`)}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 border border-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer text-xs shadow-xs border-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>ناردن بۆ ئێکسڵ</span>
            </button>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <QuickDateFilter
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
            <DateInput value={startDate} onChange={setStartDate} label="بەرواری دەستپێک" className="h-10 text-xs" />
            <DateInput value={endDate} onChange={setEndDate} label="بەرواری کۆتایی" className="h-10 text-xs" />
          </div>
        </div>

        {/* Print Header */}
        <div id="pdf-print-header-area" className="hidden print:block mb-6">
          <PrintHeader />
        </div>

        {/* Info Header Box */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4.5 md:p-5 mb-6 overflow-hidden no-print" style={{ direction: "rtl" }}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.35fr_1fr] gap-4 md:gap-5 items-stretch">
            {/* Account Details */}
            <div className="flex items-center gap-3.5 p-4 bg-slate-50/90 hover:bg-slate-50 transition-colors rounded-xl border border-slate-200/80 shadow-2xs min-h-[92px]">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#061f5f] to-[#03133f] text-white flex items-center justify-center font-black shadow-md flex-shrink-0">
                <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-xs text-slate-500 font-bold mb-0.5">کەشف حسابی</span>
                <span className="text-base md:text-lg font-black text-slate-900 truncate tracking-tight">{account?.name || "دیاری نەکراوە"}</span>
                {account?.phone && <span className="text-xs text-slate-600 font-bold mt-0.5" dir="ltr">{account.phone}</span>}
              </div>
            </div>

            {/* Date Details (Middle Box - Larger & Spacious) */}
            <div className="flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100/70 rounded-xl border border-slate-200/90 shadow-2xs text-center min-h-[92px]">
              <div className="flex flex-col items-center justify-center w-full">
                <span className="text-xs md:text-sm text-slate-600 font-extrabold mb-1.5">بەرواری کەشف حساب</span>
                <div className="text-sm md:text-base font-black text-slate-900 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200/90 shadow-2xs font-black text-slate-900" dir="ltr">{formatDate(startDate)}</span>
                  <span className="text-slate-500 font-bold text-xs">بۆ</span>
                  <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200/90 shadow-2xs font-black text-slate-900" dir="ltr">{formatDate(endDate)}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold mt-1.5" dir="ltr">
                  پرینت: {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {/* Top Balance Box (Centered, Large Bold Font, No Empty Void) */}
            <div className="flex flex-col justify-center items-center p-4 bg-gradient-to-b from-slate-50 to-slate-100/70 rounded-xl border border-slate-200/90 shadow-2xs text-center min-h-[96px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs md:text-sm text-slate-600 font-extrabold">باڵانسی هەژمار:</span>
                {account?.exchangeRateType === "FIXED" && (
                  <span className="text-[11px] font-black text-purple-950 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                    📌 جێگیر: 100$ = {((account.customExchangeRate || 132000) > 10000 ? (account.customExchangeRate || 132000) : (account.customExchangeRate || 132000) * 100).toLocaleString("en-US")} د.ع
                  </span>
                )}
              </div>
              <div className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center">
                {renderBalances(processed.finalBalances, false, false)}
              </div>
            </div>
          </div>
        </div>

        {/* Shareholder Summary Cards (when viewing a shareholder account) */}
        {isShareholder && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 no-print" style={{ direction: "rtl" }}>
            {/* Total Deposit Card */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/70 border-2 border-emerald-300 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-900 font-black">کۆی دانانی پارە (داخڵکردن)</span>
                  <span className="text-[11px] text-emerald-700 font-bold">لە ماوەی دیاریکراودا</span>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-800 tracking-tight" dir="ltr">
                {formatMoney(shareholderSummary?.totalDepositedUSD || 0, usdId)}
              </div>
            </div>

            {/* Total Withdrawal Card */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-rose-100/70 border-2 border-rose-300 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-rose-900 font-black">کۆی کشانەوەی پارە (دەرکردن)</span>
                  <span className="text-[11px] text-rose-700 font-bold">لە ماوەی دیاریکراودا</span>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-rose-800 tracking-tight" dir="ltr">
                {formatMoney(shareholderSummary?.totalWithdrawnUSD || 0, usdId)}
              </div>
            </div>
          </div>
        )}

        {/* Print-Only Classic Compact Info Header Table */}
        <div id="pdf-print-info-table" className="hidden print:block w-full border border-[#0b1f50] rounded-lg overflow-hidden mb-3 bg-slate-50 text-[11px] shadow-sm" style={{ direction: "rtl" }}>
          <table className="w-full text-right border-collapse">
            <tbody>
              <tr className="border-b border-[#0b1f50] bg-[#0b1f50] text-white">
                <td className="py-2 px-3 border-l border-slate-600 w-1/3 print:whitespace-normal">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 font-bold">کەشف حساب:</span>
                    <span className="font-black text-white text-xs">{account?.name}</span>
                  </div>
                </td>
                <td className="py-2 px-3 border-l border-slate-600 w-1/3 text-center print:whitespace-normal">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-white text-xs">
                    <span className="text-slate-300 font-bold">بەروار</span>
                    <span dir="ltr">{formatDate(startDate)}</span>
                    <span className="text-slate-300 font-bold">بۆ</span>
                    <span dir="ltr">{formatDate(endDate)}</span>
                  </div>
                </td>
                <td className="py-1.5 px-3 w-1/3 print:whitespace-normal">
                  <div className="inline-flex items-center gap-1.5 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-md shadow-sm">
                    <span className="text-rose-900 font-extrabold text-xs">باڵانس:</span>
                    <span className="font-black text-xs text-rose-950" dir="ltr">{renderBalances(processed.finalBalances, false, false)}</span>
                  </div>
                </td>
              </tr>
              <tr className="bg-slate-50 text-slate-800">
                <td className="py-1.5 px-3 border-l border-slate-300 print:whitespace-normal">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">ژمارە تەلەفۆن:</span>
                    <span className="font-bold text-slate-900 text-xs" dir="ltr">{account?.phone || "-"}</span>
                  </div>
                </td>
                <td className="py-1.5 px-3 border-l border-slate-300 text-center print:whitespace-normal">
                  {account?.exchangeRateType === "FIXED" && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-purple-950 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md shadow-sm">
                      📌 دۆلاری جێگیر: 100$ = {((account.customExchangeRate || 132000) > 10000 ? (account.customExchangeRate || 132000) : (account.customExchangeRate || 132000) * 100).toLocaleString("en-US")} د.ع
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-3 print:whitespace-normal">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">پرینتکردن:</span>
                    <span className="font-bold text-slate-800 text-[9.5px]" dir="ltr">
                      {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Main Table */}
        <div className="border border-slate-300 bg-white overflow-hidden rounded-xl shadow-sm print:border-none print:shadow-none">
          {/* Table Header */}
          <table id="account-statement-table" className="w-full text-right text-sm print:text-xs">
            <thead className="bg-[#03133f] text-white">
              <tr className="divide-x divide-x-reverse divide-[#ffffff20]">
                <th className="p-2 font-black text-center text-xs w-[3.5%]">#</th>
                {visibleColumns.date && <th className="p-2 font-black text-center text-xs w-[9.5%]">بەروار</th>}
                {visibleColumns.voucherId && <th className="p-2 font-black text-center text-xs w-[7%]">پسووڵە</th>}
                {visibleColumns.type && <th className="p-2 font-black text-center text-xs w-[12%]">جۆری پسووڵە</th>}
                {visibleColumns.totalAmount && <th className="p-2 font-black text-center text-xs w-[12%]">کۆی گشتی</th>}
                {visibleColumns.discount && <th className="p-2 font-black text-center text-xs w-[8%]">داشکاندن</th>}
                {visibleColumns.paidAmount && <th className="p-2 font-black text-center text-xs w-[14%]">پارەی دراو</th>}
                {visibleColumns.balance && <th className="p-2 font-black text-center text-xs w-[15%]">باڵانس</th>}
                {visibleColumns.note && <th className="p-2 font-black text-center text-xs w-[19%] allow-wrap">تێبینی</th>}
              </tr>
            </thead>
            <tbody className="bg-white">
              {/* Previous Balance Row */}
              <tr className="border-b-2 border-[#0b1f50] bg-[#f0f4ff]">
                <td className="p-3 text-center text-gray-400">—</td>
                {visibleColumns.date && <td className="p-3 text-center text-gray-500 italic font-medium">پێشووتر ...</td>}
                {visibleColumns.voucherId && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.type && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.totalAmount && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.discount && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.paidAmount && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.balance && <td className="p-3 text-center font-black text-[#0b1f50]" dir="ltr">{renderBalances(processed.previousBalances)}</td>}
                {visibleColumns.note && <td className="p-3 text-center text-gray-400">—</td>}
              </tr>

              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400 font-bold">باردەکرێت...</td></tr>
              ) : (
                processed.visibleItems.map((v, vIdx) => {
                  const isRowExpanded = filterShowItems === "پیشاندان" || expandedRows[v.id];
                  const hasLines = v.lines && v.lines.length > 0;

                  // Color scheme per voucher type
                  const typeColors: Record<string, { 
                    header: string; 
                    badge: string; 
                    itemBg: string; 
                    itemBorder: string; 
                    balanceBg: string;
                    rowBorder?: string;
                    typeBadge?: string;
                    indicatorDot?: string;
                    paidText?: string;
                    amountColor?: string;
                  }> = {
                    sales:             { header: "bg-blue-50 border-blue-300",   badge: "bg-blue-600 text-white",   itemBg: "bg-blue-50/40",   itemBorder: "border-blue-200",   balanceBg: "bg-blue-100", paidText: "text-emerald-700" },
                    purchase:          { header: "bg-emerald-50 border-emerald-300", badge: "bg-emerald-600 text-white", itemBg: "bg-emerald-50/40", itemBorder: "border-emerald-200", balanceBg: "bg-emerald-100", paidText: "text-emerald-700" },
                    money_in:          { header: "bg-teal-50 border-teal-300",   badge: "bg-teal-600 text-white",   itemBg: "bg-teal-50/40",   itemBorder: "border-teal-200",   balanceBg: "bg-teal-100", paidText: "text-teal-700" },
                    "پارە وەرگرتن":   { header: "bg-teal-50 border-teal-300",   badge: "bg-teal-600 text-white",   itemBg: "bg-teal-50/40",   itemBorder: "border-teal-200",   balanceBg: "bg-teal-100", paidText: "text-teal-700" },
                    "پارەی هاتوو":     { header: "bg-teal-50 border-teal-300",   badge: "bg-teal-600 text-white",   itemBg: "bg-teal-50/40",   itemBorder: "border-teal-200",   balanceBg: "bg-teal-100", paidText: "text-teal-700" },
                    money_out:         { header: "bg-rose-50 border-rose-300",   badge: "bg-rose-600 text-white",   itemBg: "bg-rose-50/40",   itemBorder: "border-rose-200",   balanceBg: "bg-rose-100", paidText: "text-rose-700" },
                    "پارەدان":         { header: "bg-rose-50 border-rose-300",   badge: "bg-rose-600 text-white",   itemBg: "bg-rose-50/40",   itemBorder: "border-rose-200",   balanceBg: "bg-rose-100", paidText: "text-rose-700" },
                    "پارەی ڕۆشتوو":    { header: "bg-rose-50 border-rose-300",   badge: "bg-rose-600 text-white",   itemBg: "bg-rose-50/40",   itemBorder: "border-rose-200",   balanceBg: "bg-rose-100", paidText: "text-rose-700" },
                    expense:           { header: "bg-orange-50 border-orange-300", badge: "bg-orange-600 text-white", itemBg: "bg-orange-50/40", itemBorder: "border-orange-200", balanceBg: "bg-orange-100", paidText: "text-orange-700" },
                    sales_return:      { header: "bg-purple-50 border-purple-300", badge: "bg-purple-600 text-white", itemBg: "bg-purple-50/40", itemBorder: "border-purple-200", balanceBg: "bg-purple-100", paidText: "text-purple-700" },
                    purchase_return:   { header: "bg-indigo-50 border-indigo-300", badge: "bg-indigo-600 text-white", itemBg: "bg-indigo-50/40", itemBorder: "border-indigo-200", balanceBg: "bg-indigo-100", paidText: "text-indigo-700" },
                    my_debt_discount:  { header: "bg-sky-50 border-sky-300",     badge: "bg-sky-600 text-white",     itemBg: "bg-sky-50/40",     itemBorder: "border-sky-200",     balanceBg: "bg-sky-100", paidText: "text-sky-700" },
                    people_debt_discount: { header: "bg-violet-50 border-violet-300", badge: "bg-violet-600 text-white", itemBg: "bg-violet-50/40", itemBorder: "border-violet-200", balanceBg: "bg-violet-100", paidText: "text-violet-700" },
                    "expense-debt":    { header: "bg-amber-50 border-amber-300", badge: "bg-amber-600 text-white",   itemBg: "bg-amber-50/40",   itemBorder: "border-amber-200",   balanceBg: "bg-amber-100", paidText: "text-amber-700" },
                    shareholder_deposit: {
                      header: "bg-emerald-50/90 border-emerald-300 hover:bg-emerald-100/60",
                      rowBorder: "border-r-4 border-r-emerald-500",
                      badge: "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700",
                      typeBadge: "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs",
                      itemBg: "bg-emerald-50/40",
                      itemBorder: "border-emerald-300",
                      balanceBg: "bg-emerald-100/80 text-emerald-950",
                      paidText: "text-emerald-700",
                      amountColor: "text-emerald-800",
                      indicatorDot: "bg-emerald-500",
                    },
                    shareholder_withdrawal: {
                      header: "bg-rose-50/90 border-rose-300 hover:bg-rose-100/60",
                      rowBorder: "border-r-4 border-r-rose-500",
                      badge: "bg-rose-600 text-white shadow-xs hover:bg-rose-700",
                      typeBadge: "bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs",
                      itemBg: "bg-rose-50/40",
                      itemBorder: "border-rose-300",
                      balanceBg: "bg-rose-100/80 text-rose-950",
                      paidText: "text-rose-700",
                      amountColor: "text-rose-800",
                      indicatorDot: "bg-rose-500",
                    },
                  };
                  const tc = typeColors[v.type] || { header: "bg-gray-50 border-gray-300", badge: "bg-gray-600 text-white", itemBg: "bg-gray-50/40", itemBorder: "border-gray-200", balanceBg: "bg-gray-100", paidText: "text-gray-800" };

                  return (
                    <React.Fragment key={v.id}>
                      {/* === VOUCHER HEADER ROW === */}
                      <tr
                        onClick={filterShowItems === "شاردنەوە" && hasLines ? () => toggleRow(v.id) : undefined}
                        className={`border-b-0 border-t-2 border-gray-300 transition-colors ${filterShowItems === "شاردنەوە" && hasLines ? "cursor-pointer hover:brightness-95" : ""} ${tc.header} ${tc.rowBorder || ""}`}
                      >
                        <td className="p-3 text-center text-gray-500 font-bold text-xs">{vIdx + 1}</td>
                        {visibleColumns.date && <td className="p-3 text-center text-gray-700 font-bold text-xs">{formatDate(v.date)}</td>}
                        {visibleColumns.voucherId && (
                          <td className="p-3 text-center">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/invoices?editId=${v.voucherId}&type=${v.originalType || v.type}`);
                              }}
                              className={`font-black text-sm px-3 py-1 rounded-lg cursor-pointer hover:opacity-85 transition-opacity print:bg-transparent print:text-slate-900 print:px-0 print:py-0 print:rounded-none print:shadow-none print:font-extrabold ${tc.badge}`}
                            >
                              {v.voucherId}
                            </span>
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="p-3 text-center font-bold text-gray-800">
                            <div className="flex flex-col items-center justify-center">
                              {tc.typeBadge ? (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black ${tc.typeBadge}`}>
                                  {tc.indicatorDot && <span className={`w-2 h-2 rounded-full ${tc.indicatorDot} inline-block animate-pulse`}></span>}
                                  {v.kurdishType}
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-1 font-extrabold">
                                  {filterShowItems === "شاردنەوە" && hasLines && (
                                    <span className="text-gray-400 text-xs">{isRowExpanded ? "▲" : "▼"}</span>
                                  )}
                                  {v.kurdishType}
                                </span>
                              )}
                              {["purchase", "money_out"].includes(v.type) && v.referenceNo && String(v.referenceNo).trim() !== "" && String(v.referenceNo) !== String(v.voucherId) && (
                                <span className="text-[11px] text-gray-500 font-bold mt-0.5 normal-case font-sans">
                                  ({v.type === "purchase" ? "لای فرۆشیار" : "لای وەرگر"}: {String(v.referenceNo).replace('OLD-', '').replace(/-11$/, '').replace(/-12$/, '')})
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.totalAmount && (
                          <td className={`p-3 text-center font-black print:p-1 whitespace-nowrap print:whitespace-nowrap text-xs print:text-[10.5px] ${tc.amountColor || "text-gray-800"}`} dir="ltr">
                            {formatMoney(v.totalAmount, v.currencyId || 1)}
                          </td>
                        )}
                        {visibleColumns.discount && (
                          <td className="p-3 text-center text-red-500 print:p-1 whitespace-nowrap print:whitespace-nowrap text-xs print:text-[10.5px]" dir="ltr">
                            {v.totalDiscount > 0 ? formatMoney(v.totalDiscount, v.discountCurrencyId || v.currencyId || 1) : "—"}
                          </td>
                        )}
                        {visibleColumns.paidAmount && (
                          <td className={`p-3 text-center ${tc.paidText || "text-emerald-700"} font-bold print:p-1 whitespace-nowrap print:whitespace-nowrap`} dir="ltr">
                            {v.paidAmounts && v.paidAmounts.length > 0 ? (
                              <div className="flex flex-col items-center justify-center gap-1 print:gap-0.5 whitespace-nowrap print:whitespace-nowrap">
                                {v.paidAmounts.map((pa: any, pIdx: number) => {
                                  const curObj = currencies.find((c: any) => Number(c.id) === Number(pa.currencyId));
                                  const isIQD = curObj?.code === "IQD" || curObj?.symbol === "دینار" || pa.currencyId === 2 || pa.currencyId === 12;
                                  const isDeposit = v.type === "shareholder_deposit";
                                  const isWithdrawal = v.type === "shareholder_withdrawal";

                                  // Formatting the actual paid amount in its currency
                                  const formattedActual = formatMoney(pa.amount, pa.currencyId);

                                  // Color & pill customization per currency and voucher type
                                  let curPillClass = "text-slate-800";
                                  if (isDeposit) {
                                    curPillClass = isIQD
                                      ? "text-blue-700 bg-blue-50/90 border border-blue-200/90"
                                      : "text-emerald-700 bg-emerald-50/90 border border-emerald-200/90";
                                  } else if (isWithdrawal) {
                                    curPillClass = isIQD
                                      ? "text-amber-800 bg-amber-50/90 border border-amber-200/90"
                                      : "text-rose-700 bg-rose-50/90 border border-rose-200/90";
                                  } else {
                                    curPillClass = isIQD ? "text-blue-700" : (tc.paidText || "text-emerald-700");
                                  }

                                  // In shareholder statements, balance is USD. If paid in IQD, show converted USD equivalent
                                  let convertedSubtext = null;
                                  if (isShareholder && isIQD) {
                                    const actualRate = (pa.exchangeRate && pa.exchangeRate > 10)
                                      ? pa.exchangeRate
                                      : (v.exchangeRate && v.exchangeRate > 10 ? v.exchangeRate : 1500);
                                    const usdEq = pa.amount / actualRate;
                                    convertedSubtext = (
                                      <span className={`text-[10px] font-bold ${isWithdrawal ? "text-rose-600" : "text-emerald-600"} opacity-90 print:text-[9px] print:inline print:ms-1`} dir="ltr">
                                        ({formatMoney(usdEq, usdId)})
                                      </span>
                                    );
                                  }

                                  return (
                                    <div
                                      key={pIdx}
                                      className={`paid-amount-item inline-flex flex-col print:flex-row items-center justify-center px-2 py-0.5 rounded-md text-xs font-black shadow-2xs ${curPillClass} print:bg-transparent print:border-none print:shadow-none print:p-0 whitespace-nowrap print:whitespace-nowrap`}
                                    >
                                      <div className="flex items-center gap-1 print:inline-flex whitespace-nowrap print:whitespace-nowrap" dir="ltr">
                                        <span className="text-xs print:text-[10.5px] font-bold whitespace-nowrap print:whitespace-nowrap">{formattedActual}</span>
                                      </div>
                                      {convertedSubtext}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              (v.type === "shareholder_deposit" || v.type === "shareholder_withdrawal") && v.totalAmount > 0 ? (
                                <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black shadow-2xs ${
                                  v.type === "shareholder_deposit"
                                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                    : "text-rose-700 bg-rose-50 border border-rose-200"
                                } print:bg-transparent print:border-none print:shadow-none print:p-0 whitespace-nowrap`} dir="ltr">
                                  <span className="text-xs print:text-[10.5px] font-bold whitespace-nowrap">{formatMoney(v.totalAmount, v.currencyId || 1)}</span>
                                </div>
                              ) : (
                                "—"
                              )
                            )}
                          </td>
                        )}
                        {visibleColumns.balance && (
                          <td className={`p-3 text-center font-black text-sm print:text-[10.5px] print:p-1 whitespace-nowrap print:whitespace-nowrap ${tc.balanceBg}`} dir="ltr">
                            {renderBalances(v.rowBalances)}
                          </td>
                        )}
                        {visibleColumns.note && (
                          <td className="p-3 text-center text-gray-500 text-xs allow-wrap">
                            {(() => {
                              const isDeposit = v.type === "shareholder_deposit";
                              const isWithdrawal = v.type === "shareholder_withdrawal";
                              const isShareholderRow = isDeposit || isWithdrawal || isShareholder;

                              if (isShareholderRow) {
                                // 1. Determine if payment / transaction was in IQD
                                const iqdPayment = v.paidAmounts?.find((pa: any) => {
                                  if (!pa || Number(pa.amount) <= 0) return false;
                                  const c = currencies.find((cur: any) => Number(cur.id) === Number(pa.currencyId));
                                  return c?.code === "IQD" || c?.symbol === "دینار" || Number(pa.currencyId) === 2 || Number(pa.currencyId) === 12;
                                });
                                const isVoucherIQD = v.currencyId !== usdId && (v.currencyId === 2 || v.currencyId === 12 || currencies.find((c: any) => Number(c.id) === Number(v.currencyId))?.code === "IQD");
                                const isIQDTransaction = Boolean(iqdPayment) || isVoucherIQD;

                                // 2. Extract clean manual note
                                const rawManualCandidate = v.rawInternalNote || v.internalNote || v.rawPrintNote || v.printNote || v.note;
                                const manualNote = cleanShareholderManualNote(rawManualCandidate);

                                // 3. If IQD, show dollar exchange rate at the time of the voucher
                                if (isIQDTransaction) {
                                  let rate = 1540;
                                  if (iqdPayment && iqdPayment.exchangeRate && iqdPayment.exchangeRate > 10) {
                                    rate = iqdPayment.exchangeRate;
                                  } else if (v.exchangeRate && v.exchangeRate > 10) {
                                    rate = v.exchangeRate;
                                  } else {
                                    const ledgerWithRate = v.ledgerEntries?.find((le: any) => le.exchangeRate && le.exchangeRate > 10);
                                    if (ledgerWithRate) {
                                      rate = ledgerWithRate.exchangeRate;
                                    } else {
                                      const curObj = currencies.find((c: any) => c.code === "IQD" || c.id === 2);
                                      if (curObj && curObj.rate > 1) {
                                        rate = curObj.rate;
                                      }
                                    }
                                  }
                                  const rate100 = rate >= 10000 ? rate : rate * 100;
                                  const formattedRate = Math.round(rate100).toLocaleString("en-US");
                                  const rateBadge = (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs" dir="rtl">
                                      ڕەیتی 100$: {formattedRate} دینار
                                    </span>
                                  );

                                  if (manualNote) {
                                    return (
                                      <div className="flex flex-col items-center justify-center gap-1 py-0.5">
                                        <span className="font-semibold text-slate-800 text-xs">{manualNote}</span>
                                        {rateBadge}
                                      </div>
                                    );
                                  }
                                  return rateBadge;
                                }

                                // 4. If USD (not Dinars): ONLY manual note or "—"
                                if (manualNote) {
                                  return <span className="font-medium text-slate-800 text-xs">{manualNote}</span>;
                                }
                                return <span className="text-gray-400">—</span>;
                              }

                              return v.note || "—";
                            })()}
                          </td>
                        )}
                      </tr>

                      {/* === ITEM LINES (expanded) === */}
                      {isRowExpanded && hasLines && (
                        <tr className={`border-b-2 border-gray-400 print:break-inside-avoid`}>
                          <td colSpan={visibleColCount} className={`p-0 ${tc.itemBg}`}>
                            <div className={`border-r-4 ${tc.itemBorder} mr-6 ml-2 my-2 rounded-lg overflow-hidden shadow-sm`}>
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className={`${tc.badge} opacity-80`}>
                                    <th className="py-2 px-3 font-bold text-center">#</th>
                                    <th className="py-2 px-3 font-bold text-right">کەرەستە</th>
                                    <th className="py-2 px-3 font-bold text-center">عدد</th>
                                    <th className="py-2 px-3 font-bold text-center">نرخ</th>
                                    <th className="py-2 px-3 font-bold text-center">داشکاندن</th>
                                    <th className="py-2 px-3 font-bold text-center">گشتی</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {v.lines.map((line: any, idx: number) => {
                                    const lineCurId = line.currencyId || v.currencyId || 1;
                                    return (
                                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-2.5 px-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{line.product?.name || "—"}</td>
                                        <td className="py-2.5 px-3 text-center font-extrabold text-gray-800">
                                          {line.qty} <span className="text-gray-400 font-normal">{line.note || "دانە"}</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-gray-700" dir="ltr">
                                          {formatMoney(line.unitPrice, lineCurId)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-red-400" dir="ltr">
                                          {line.discountAmount > 0 ? formatMoney(line.discountAmount, lineCurId) : "—"}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-black text-gray-900" dir="ltr">
                                          {formatMoney(line.lineTotal, v.currencyId || 1)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                {/* Items subtotal footer */}
                                <tfoot>
                                  <tr className={`${tc.balanceBg} border-t border-gray-200`}>
                                    <td colSpan={5} className="py-2 px-3 text-right font-black text-gray-700 text-xs">کۆی {v.lines.length} دانە کاڵا</td>
                                    <td className="py-2 px-3 text-center font-black text-gray-900" dir="ltr">
                                      {formatMoney(v.lines.reduce((s: number, l: any) => s + l.lineTotal, 0), v.currencyId || 1)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* Final Balance Row */}
              {!loading && processed.visibleItems.length > 0 && (
                <tr className="border-t-2 border-slate-300 bg-slate-100/90 text-slate-900">
                  <td colSpan={visibleColCount - (visibleColumns.balance ? 1 : 0) - (visibleColumns.note ? 1 : 0)} className="p-2.5 text-right font-black text-sm print:text-xs">باڵانسی کۆتایی</td>
                  <td colSpan={(visibleColumns.balance ? 1 : 0) + (visibleColumns.note ? 1 : 0)} className="p-2 text-center font-black" dir="ltr">
                    {renderBalances(processed.finalBalances, true, true)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-right text-xs print:text-[10px] font-bold text-gray-700 mt-2 pb-4 flex justify-between items-center print:px-1">
          <span>کۆی گشتی جووڵەکان: {processed.visibleItems.length}</span>
        </div>
      </div>

      {/* Filter Modal - For remaining options */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg m-0">ئۆپشنەکانی فلتەرکردن</h3>
              <div className="flex gap-4 items-center">
                <button onClick={handleResetFilters} className="text-white hover:text-gray-300 text-sm font-bold flex items-center gap-1">
                  لابردنی هەموو ⌫
                </button>
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer">×</button>
              </div>
            </div>
            <div className="p-6 space-y-5 text-right">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">دراو</label>
                <select value={filterCurrencyId} onChange={(e) => setFilterCurrencyId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold bg-white outline-none focus:border-[#0b1f50] shadow-sm">
                  <option value="all">هەموو دراوەکان (بە دراوی سەرەکی)</option>
                  {currencies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کەرەستە</label>
                <select 
                  value={filterShowItems} 
                  onChange={(e) => setFilterShowItems(e.target.value)} 
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold bg-white outline-none focus:border-[#0b1f50] text-gray-700 shadow-sm"
                >
                  <option value="شاردنەوە">شاردنەوە</option>
                  <option value="پیشاندان">پیشاندان</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کۆڵۆمەکانی خشتە</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.date} onChange={() => setVisibleColumns(p => ({ ...p, date: !p.date }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    بەروار
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.voucherId} onChange={() => setVisibleColumns(p => ({ ...p, voucherId: !p.voucherId }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    پسووڵە
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.type} onChange={() => setVisibleColumns(p => ({ ...p, type: !p.type }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    جۆری پسووڵە
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.totalAmount} onChange={() => setVisibleColumns(p => ({ ...p, totalAmount: !p.totalAmount }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    کۆی گشتی
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.discount} onChange={() => setVisibleColumns(p => ({ ...p, discount: !p.discount }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    داشکاندن
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.paidAmount} onChange={() => setVisibleColumns(p => ({ ...p, paidAmount: !p.paidAmount }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    پارەی دراو
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.note} onChange={() => setVisibleColumns(p => ({ ...p, note: !p.note }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    تێبینی
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.balance} onChange={() => setVisibleColumns(p => ({ ...p, balance: !p.balance }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    باڵانس
                  </label>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                <button onClick={() => setShowFilterModal(false)} className="text-gray-500 hover:text-gray-700 font-bold px-4 py-2">پاشگەزبوونەوە</button>
                <button onClick={() => setShowFilterModal(false)} className="bg-[#0b1f50] text-white px-6 py-2.5 rounded-lg shadow-md text-sm font-bold hover:bg-[#061f5f] transition-colors">
                  جێبەجێکردن ✔️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountStatementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-500">باردەکرێت...</div>}>
      <AccountStatementContent />
    </Suspense>
  );
}

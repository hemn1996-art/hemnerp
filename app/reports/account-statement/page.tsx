"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "../../store/store";

interface Product { id: number; name: string; code: string | null; costPrice: number | null; }
interface VoucherLine { id: number; productId: number; qty: number; unitPrice: number; discountAmount: number; lineTotal: number; note: string | null; product: Product; }
interface VoucherPaidAmount { id: number; currencyId: number; amount: number; exchangeRate: number; currency: any; }
interface VoucherExpense { id: number; amount: number; currencyId: number; note: string | null; accountId: number | null; addToAccountDebt?: boolean; }
interface LedgerEntry { id: number; debit: number; credit: number; currencyId: number; date?: string; currency: any; accountId?: number | null; }
interface Account { id: number; name: string; phone?: string; creditLimit?: number; accountTypeId: number; isShareholder: boolean; }
interface RawVoucher { id: number; type: string; date: string; accountId: number | null; currencyId: number | null; exchangeRate: number; totalAmount: number; totalDiscount: number; netAmount: number; internalNote: string | null; printNote: string | null; hasDelivery: boolean; deliveryFee: number | null; account: Account | null; lines: VoucherLine[]; paidAmounts: VoucherPaidAmount[]; expenses: VoucherExpense[]; ledgerEntries: LedgerEntry[]; }

function AccountStatementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get("accountId");

  const { accounts, currencies, fetchAccounts, fetchCurrencies } = useStore() as any;
  const [vouchers, setVouchers] = useState<RawVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

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

  const visibleColCount = 1 +
    (visibleColumns.date ? 1 : 0) +
    (visibleColumns.voucherId ? 1 : 0) +
    (visibleColumns.type ? 1 : 0) +
    (visibleColumns.totalAmount ? 1 : 0) +
    (visibleColumns.discount ? 1 : 0) +
    (visibleColumns.paidAmount ? 1 : 0) +
    (visibleColumns.note ? 1 : 0) +
    (visibleColumns.balance ? 1 : 0);

  useEffect(() => {
    fetchAccounts();
    fetchCurrencies();
    loadVouchers();
  }, []);



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

  const account = accounts.find((a: any) => a.id === Number(accountIdParam));

  const getKurdishType = (type: string) => {
    switch (type) {
      case "sales": return "فرۆشتن";
      case "purchase": return "کڕین";
      case "money_in": return "وەرگرتنی پارە";
      case "money_out": return "پارەی ڕۆشتوو";
      case "expense": return "خەرجی";
      case "sales_return": return "گەڕانەوەی فرۆشتن";
      case "purchase_return": return "گەڕانەوەی کڕین";
      case "cashbox_transfer": return "گواستنەوەی پارە";
      case "cashbox_exchange": return "گۆڕینەوەی پارە";
      case "shareholder_deposit": return "دانانی پارە";
      case "shareholder_withdrawal": return "کشانەوەی پارە";
      case "my_debt_discount": return "داشکاندن لە قەرزی من";
      case "people_debt_discount":
      case "debt_discount":
      case "debt discount":
        return "داشکاندن لە قەرزی خەڵک";
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatMoney = (amount: number, curId: number) => {
    const cur = currencies.find((c: any) => c.id === curId);
    const num = Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const symbol = cur?.symbol || cur?.code || "";
    const isNegative = amount < 0;
    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "flex-start", direction: "ltr" }}>
        {isNegative && <span style={{ marginRight: "2px" }}>-</span>}
        <span style={{ fontSize: "0.8em", opacity: 0.7, marginRight: "4px", alignSelf: "flex-start", paddingTop: "2px" }}>
          {symbol}
        </span>
        <span>{num}</span>
      </span>
    );
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

  const renderBalances = (balances: Record<string, number>, isFooter = false) => {
    let entries = Object.entries(balances);
    if (filterCurrencyId !== "all") {
      entries = entries.filter(([curId]) => curId === filterCurrencyId);
    }
    const activeEntries = entries.filter(([_, val]) => Math.abs(val) > 0.01);
    if (activeEntries.length === 0) {
      return <span className={isFooter ? "text-white font-bold text-sm" : "text-gray-400 font-bold text-sm"}>0</span>;
    }
    return (
      <div className="flex flex-col gap-1 items-center justify-center">
        {activeEntries.map(([curId, val]) => {
          const isNegative = val < -0.01;
          let color = isNegative ? "text-red-600 font-bold" : "text-green-600 font-bold";
          if (isFooter) {
            color = "text-white font-bold";
          }
          return (
            <div key={curId} className={`${color} text-sm md:text-base`} dir="ltr">
              {formatMoney(val, Number(curId))}
            </div>
          );
        })}
      </div>
    );
  };

  const processed = useMemo(() => {
    // 1. Filter vouchers related to this account
    let list = vouchers.filter((v) => 
      v.accountId === Number(accountIdParam) || 
      (v.ledgerEntries && v.ledgerEntries.some(le => le.accountId === Number(accountIdParam)))
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
        rowsList.push({
          id: `${v.id}-main`,
          voucherId: v.id,
          date: v.date,
          type: v.type,
          originalType: v.type,
          kurdishType: getKurdishType(v.type),
          totalAmount: v.netAmount,
          currencyId: v.currencyId || 1,
          totalDiscount: v.totalDiscount,
          paidAmounts: v.paidAmounts ? v.paidAmounts.map(pa => ({ currencyId: pa.currencyId, amount: pa.amount, exchangeRate: pa.exchangeRate })) : [],
          note: v.printNote || v.internalNote || "",
          ledgerEntries: mainEntries.filter(le => le.accountId === targetAccountId),
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
        const curKey = String(le.currencyId);
        runningBalances[curKey] = (runningBalances[curKey] || 0) + (le.debit - le.credit);
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
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 0; margin: 0; }
          .no-print { display: none !important; }
          .print-border { border: 1px solid #e5e7eb !important; }
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
      </div>


      <div id="print-area" className="p-2 md:p-6 mx-auto bg-white min-h-screen shadow-sm print-border">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 no-print border-b border-gray-100 pb-4">
          <div className="flex gap-2 items-center w-full md:w-auto">
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-[#e0e7ff] text-[#4f46e5] font-bold px-4 py-2 rounded-lg hover:bg-[#c7d2fe] transition-colors cursor-pointer text-sm shadow-sm flex-1 md:flex-none">
              🖨️ پرینت
            </button>
            <button 
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setFilterCurrencyId("all");
                loadVouchers();
              }}
              className="flex items-center justify-center gap-2 bg-[#e0e7ff] text-[#4f46e5] font-bold px-4 py-2 rounded-lg hover:bg-[#c7d2fe] transition-colors cursor-pointer text-sm shadow-sm flex-1 md:flex-none"
            >
              ڕێکخستنەوە ✖️
            </button>
            <button 
              onClick={loadVouchers}
              className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-4 py-2 rounded-lg hover:bg-[#061f5f] transition-colors cursor-pointer text-sm shadow-sm flex-1 md:flex-none"
            >
              گەڕان 🔍
            </button>
            <button onClick={() => setShowFilterModal(true)} className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-4 py-2 rounded-lg hover:bg-[#061f5f] transition-colors cursor-pointer text-sm shadow-sm flex-1 md:flex-none">
              فلتەرەکان ⚙️
            </button>
          </div>

          <div className="flex gap-4 items-center">
            <div 
              className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-10 shadow-sm cursor-pointer hover:border-[#0b1f50] transition-colors"
              onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement)?.showPicker()}
            >
              <span className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 border-l border-gray-200">بەرواری دەستپێک</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 text-sm text-gray-700 outline-none w-36 bg-white cursor-pointer" />
            </div>
            <div 
              className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-10 shadow-sm cursor-pointer hover:border-[#0b1f50] transition-colors"
              onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement)?.showPicker()}
            >
              <span className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 border-l border-gray-200">بەرواری کۆتایی</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 text-sm text-gray-700 outline-none w-36 bg-white cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Info Header Box */}
        <div className="border border-gray-200 rounded-2xl py-8 px-10 mb-8 bg-white shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-base">
            {/* Left side (Balance Info) */}
            <div className="flex flex-col gap-4 text-right md:text-left md:items-start md:mr-auto">
              <div className="flex justify-start gap-3 flex-row-reverse md:flex-row items-center">
                <span className="text-gray-500 font-extrabold text-base">باڵانس :</span>
                <span className="font-black text-xl text-gray-900" dir="ltr">{renderBalances(processed.finalBalances)}</span>
              </div>
              <div className="flex justify-start gap-3 flex-row-reverse md:flex-row items-center">
                <span className="text-gray-500 font-extrabold text-base">سنووری قەرزی تێپەڕاندووە :</span>
                <span className="font-bold text-gray-800 text-base">
                  {account.creditLimit && Object.entries(processed.finalBalances).some(([curId, val]: [string, any]) => {
                    if (account.creditLimitCurrencyId && String(account.creditLimitCurrencyId) === curId) {
                      return val > account.creditLimit;
                    }
                    return val > account.creditLimit;
                  }) ? "بەڵێ" : "نەخێر"}
                </span>
              </div>
              <div className="flex justify-start gap-3 flex-row-reverse md:flex-row items-center">
                <span className="text-gray-500 font-extrabold text-base">بەرواری پرینتکردن :</span>
                <span className="font-bold text-gray-800 text-base" dir="ltr">{new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              </div>
            </div>

            {/* Right side (Account Info) */}
            <div className="flex flex-col gap-4 text-right">
              <div className="flex justify-end gap-3 items-center">
                <span className="font-black text-slate-900 text-3xl">{account.name}</span>
                <span className="text-slate-500 font-extrabold text-lg"> : کەشف حساب</span>
              </div>
              <div className="flex justify-end gap-3 items-center">
                <span className="font-bold text-slate-800 text-lg">{account.phone || "-"}</span>
                <span className="text-slate-500 font-extrabold text-base"> : ژمارە تەلەفۆن</span>
              </div>
              <div className="flex justify-end gap-3 items-center">
                <span className="font-bold text-slate-800 text-lg">{formatDate(startDate)} بۆ {formatDate(endDate)}</span>
                <span className="text-slate-500 font-extrabold text-base"> : بەروار</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="border border-gray-200 bg-white overflow-hidden print:border-none">
          {/* Table Header */}
          <table className="w-full text-right text-sm print:text-xs">
            <thead className="bg-[#0b1f50] text-white">
              <tr>
                <th className="p-3 font-bold text-center border-x border-[#1a3680] w-10">#</th>
                {visibleColumns.date && <th className="p-3 font-bold text-center border-x border-[#1a3680]">بەروار</th>}
                {visibleColumns.voucherId && <th className="p-3 font-bold text-center border-x border-[#1a3680]">پسووڵە</th>}
                {visibleColumns.type && <th className="p-3 font-bold text-center border-x border-[#1a3680]">جۆری پسووڵە</th>}
                {visibleColumns.totalAmount && <th className="p-3 font-bold text-center border-x border-[#1a3680]">کۆی گشتی</th>}
                {visibleColumns.discount && <th className="p-3 font-bold text-center border-x border-[#1a3680]">داشکاندن</th>}
                {visibleColumns.paidAmount && <th className="p-3 font-bold text-center border-x border-[#1a3680]">پارەی دراو</th>}
                {visibleColumns.note && <th className="p-3 font-bold text-center border-x border-[#1a3680]">تێبینی</th>}
                {visibleColumns.balance && <th className="p-3 font-bold text-center border-x border-[#1a3680]">باڵانس</th>}
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
                {visibleColumns.note && <td className="p-3 text-center text-gray-500 font-bold">نەبەستراو نەقدی</td>}
                {visibleColumns.balance && <td className="p-3 text-center font-black text-[#0b1f50]" dir="ltr">{renderBalances(processed.previousBalances)}</td>}
              </tr>

              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400 font-bold">باردەکرێت...</td></tr>
              ) : (
                processed.visibleItems.map((v, vIdx) => {
                  const isRowExpanded = filterShowItems === "پیشاندان" || expandedRows[v.id];
                  const hasLines = v.lines && v.lines.length > 0;

                  // Color scheme per voucher type
                  const typeColors: Record<string, { header: string; badge: string; itemBg: string; itemBorder: string; balanceBg: string }> = {
                    sales:             { header: "bg-blue-50 border-blue-300",   badge: "bg-blue-600 text-white",   itemBg: "bg-blue-50/40",   itemBorder: "border-blue-200",   balanceBg: "bg-blue-100" },
                    purchase:          { header: "bg-emerald-50 border-emerald-300", badge: "bg-emerald-600 text-white", itemBg: "bg-emerald-50/40", itemBorder: "border-emerald-200", balanceBg: "bg-emerald-100" },
                    money_in:          { header: "bg-teal-50 border-teal-300",   badge: "bg-teal-600 text-white",   itemBg: "bg-teal-50/40",   itemBorder: "border-teal-200",   balanceBg: "bg-teal-100" },
                    money_out:         { header: "bg-rose-50 border-rose-300",   badge: "bg-rose-600 text-white",   itemBg: "bg-rose-50/40",   itemBorder: "border-rose-200",   balanceBg: "bg-rose-100" },
                    expense:           { header: "bg-orange-50 border-orange-300", badge: "bg-orange-600 text-white", itemBg: "bg-orange-50/40", itemBorder: "border-orange-200", balanceBg: "bg-orange-100" },
                    sales_return:      { header: "bg-purple-50 border-purple-300", badge: "bg-purple-600 text-white", itemBg: "bg-purple-50/40", itemBorder: "border-purple-200", balanceBg: "bg-purple-100" },
                    purchase_return:   { header: "bg-indigo-50 border-indigo-300", badge: "bg-indigo-600 text-white", itemBg: "bg-indigo-50/40", itemBorder: "border-indigo-200", balanceBg: "bg-indigo-100" },
                    my_debt_discount:  { header: "bg-sky-50 border-sky-300",     badge: "bg-sky-600 text-white",     itemBg: "bg-sky-50/40",     itemBorder: "border-sky-200",     balanceBg: "bg-sky-100" },
                    people_debt_discount: { header: "bg-violet-50 border-violet-300", badge: "bg-violet-600 text-white", itemBg: "bg-violet-50/40", itemBorder: "border-violet-200", balanceBg: "bg-violet-100" },
                    "expense-debt":    { header: "bg-amber-50 border-amber-300", badge: "bg-amber-600 text-white",   itemBg: "bg-amber-50/40",   itemBorder: "border-amber-200",   balanceBg: "bg-amber-100" },
                  };
                  const tc = typeColors[v.type] || { header: "bg-gray-50 border-gray-300", badge: "bg-gray-600 text-white", itemBg: "bg-gray-50/40", itemBorder: "border-gray-200", balanceBg: "bg-gray-100" };

                  return (
                    <React.Fragment key={v.id}>
                      {/* === VOUCHER HEADER ROW === */}
                      <tr
                        onClick={filterShowItems === "شاردنەوە" && hasLines ? () => toggleRow(v.id) : undefined}
                        className={`border-b-0 border-t-2 border-gray-300 transition-colors ${filterShowItems === "شاردنەوە" && hasLines ? "cursor-pointer hover:brightness-95" : ""} ${tc.header}`}
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
                              className={`font-black text-sm px-3 py-1 rounded-lg cursor-pointer hover:opacity-85 transition-opacity ${tc.badge}`}
                            >
                              {v.voucherId}
                            </span>
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="p-3 text-center font-bold text-gray-800">
                            <span className="flex items-center justify-center gap-1">
                              {filterShowItems === "شاردنەوە" && hasLines && (
                                <span className="text-gray-400 text-xs">{isRowExpanded ? "▲" : "▼"}</span>
                              )}
                              {v.kurdishType}
                            </span>
                          </td>
                        )}
                        {visibleColumns.totalAmount && <td className="p-3 text-center text-gray-800 font-black" dir="ltr">{formatMoney(v.totalAmount, v.currencyId || 1)}</td>}
                        {visibleColumns.discount && <td className="p-3 text-center text-red-500" dir="ltr">{v.totalDiscount > 0 ? formatMoney(v.totalDiscount, v.currencyId || 1) : "—"}</td>}
                        {visibleColumns.paidAmount && (
                          <td className="p-3 text-center text-emerald-700 font-bold" dir="ltr">
                            {v.paidAmounts && v.paidAmounts.length > 0 ? (() => {
                              let accountCurrencyId = v.currencyId;
                              if (!accountCurrencyId || !currencies.some((c: any) => Number(c.id) === Number(accountCurrencyId))) {
                                accountCurrencyId = account?.balanceCurrencyId || account?.creditLimitCurrencyId;
                              }
                              if (!accountCurrencyId || !currencies.some((c: any) => Number(c.id) === Number(accountCurrencyId))) {
                                accountCurrencyId = currencies.length > 0 ? currencies[0].id : 8;
                              }

                              const totalConverted = v.paidAmounts.reduce((sum: number, pa: any) => {
                                const actualRate = (Number(pa.currencyId) === Number(accountCurrencyId))
                                  ? 1
                                  : (pa.exchangeRate && pa.exchangeRate > 10 ? pa.exchangeRate : (v.exchangeRate && v.exchangeRate > 10 ? v.exchangeRate : 1500));
                                return sum + convertAmount(pa.amount, pa.currencyId, accountCurrencyId, actualRate);
                              }, 0);
                              return formatMoney(totalConverted, accountCurrencyId);
                            })() : (
                              "—"
                            )}
                          </td>
                        )}
                        {visibleColumns.note && <td className="p-3 text-center text-gray-500 text-xs">{v.note || "—"}</td>}
                        {visibleColumns.balance && (
                          <td className={`p-3 text-center font-black text-sm ${tc.balanceBg}`} dir="ltr">
                            {renderBalances(v.rowBalances)}
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
                                  {v.lines.map((line: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                      <td className="py-2.5 px-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                      <td className="py-2.5 px-3 text-right font-bold text-gray-800">{line.product?.name || "—"}</td>
                                      <td className="py-2.5 px-3 text-center font-extrabold text-gray-800">
                                        {line.qty} <span className="text-gray-400 font-normal">{line.note || "دانە"}</span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-gray-700" dir="ltr">
                                        {formatMoney(line.unitPrice, v.currencyId || 1)}
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-red-400" dir="ltr">
                                        {line.discountAmount > 0 ? formatMoney(line.discountAmount, v.currencyId || 1) : "—"}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-black text-gray-900" dir="ltr">
                                        {formatMoney(line.lineTotal, v.currencyId || 1)}
                                      </td>
                                    </tr>
                                  ))}
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
                <tr className="border-t-2 border-[#0b1f50] bg-[#0b1f50] text-white">
                  <td colSpan={visibleColCount - (visibleColumns.balance ? 1 : 0)} className="p-3 text-right font-black text-base">باڵانسی کۆتایی</td>
                  {visibleColumns.balance && (
                    <td className="p-3 text-center font-black text-xl" dir="ltr">{renderBalances(processed.finalBalances, true)}</td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-right text-sm font-bold text-gray-700 mt-4 pb-10 flex justify-end items-center gap-2">
          <span>کۆی گشتی جووڵەکان:</span>
          <span>{processed.visibleItems.length}</span>
        </div>
      </div>

      {/* Filter Modal - For remaining options */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg m-0">ئۆپشنەکانی فلتەرکردن</h3>
              <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">دراو</label>
                <select value={filterCurrencyId} onChange={(e) => setFilterCurrencyId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium bg-gray-50 outline-none focus:border-[#0b1f50]">
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
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium bg-gray-50 outline-none focus:border-[#0b1f50] text-gray-700 animate-transition"
                >
                  <option value="شاردنەوە">شاردنەوە</option>
                  <option value="پیشاندان">پیشاندان</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کۆڵۆمەکانی خشتە</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
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

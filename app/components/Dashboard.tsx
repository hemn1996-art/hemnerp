"use client";

import { useEffect, useState } from "react";
import { useStore } from "../store/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type DashboardProps = {
  openInvoice: (type: string) => void;
};

import { useRouter } from "next/navigation";

export default function Dashboard({ openInvoice }: DashboardProps) {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const rawInvoices = useStore((state) => state.invoices) || [];
  const invoices = rawInvoices.filter((v: any) => v.type !== "cashbox_transfer" && v.type !== "cashbox_exchange" && v.rawType !== "cashbox_transfer" && v.rawType !== "cashbox_exchange");
  const fetchInvoices = useStore((state) => state.fetchInvoices);
  const accounts = useStore((state) => state.accounts) || [];
  const fetchAccounts = useStore((state) => state.fetchAccounts);
  const currencies = useStore((state) => state.currencies) || [];
  const fetchCurrencies = useStore((state) => state.fetchCurrencies);

  const [showNotifications, setShowNotifications] = useState(false);
  const [customNotifications, setCustomNotifications] = useState<any[]>([]);
  const [chartType, setChartType] = useState<"sales" | "purchases">("sales");
  const [chartYear, setChartYear] = useState<number>(2026);
  const [chartCurrency, setChartCurrency] = useState<"all" | "USD" | "IQD">("all");

  const [mounted, setMounted] = useState(false);
  const [kpiPeriod, setKpiPeriod] = useState<string>("today");
  const [donutPeriod, setDonutPeriod] = useState<string>("today");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem("__dismissed_notifications");
        setCustomNotifications(stored ? JSON.parse(stored) : []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    window.addEventListener("notifications-updated", load);
    return () => {
      window.removeEventListener("notifications-updated", load);
    };
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchAccounts();
    fetchCurrencies();
  }, [fetchInvoices, fetchAccounts, fetchCurrencies]);

  const iqdRate = currencies.find((c: any) => c.code === "IQD")?.rate || 1500;

  const getPaymentStatus = (total: number, paid: number) => {
    if (paid <= 0.01) {
      return { label: "قەرز", color: "bg-rose-100 text-rose-700 border-rose-200" };
    }
    if (paid >= total - 0.01) {
      return { label: "نەقد", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    }
    return { label: "بەشەکی", color: "bg-amber-100 text-amber-700 border-amber-200" };
  };

  const formatInvoiceCurrency = (val: number, currencyCode: string) => {
    if (currencyCode === "IQD") {
      return `${val.toLocaleString()} دینار`;
    }
    const cur = currencies.find((c: any) => c.code === currencyCode);
    return `${cur?.symbol || "$"}${val.toLocaleString()}`;
  };

  const getFilteredInvoices = (period: string) => {
    if (!mounted) return invoices;

    const now = new Date();
    // Iraq / local calendar day
    const todayStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA");

    // Week boundaries (last 7 days, including today)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return invoices.filter((inv: any) => {
      if (!inv.date) return false;
      const invDate = new Date(inv.date);
      const invDateStr = invDate.toLocaleDateString("en-CA");

      if (period === "today") {
        return invDateStr === todayStr;
      }
      if (period === "yesterday") {
        return invDateStr === yesterdayStr;
      }
      if (period === "week") {
        return invDate >= sevenDaysAgo && invDate <= now;
      }
      if (period === "month") {
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      }
      if (period === "year") {
        return invDate.getFullYear() === currentYear;
      }
      return true; // "all"
    });
  };

  // Helper to calculate separate USD and IQD totals by voucher types
  const getTotals = (filteredInvs: any[], filterType: string, sumField: "total" | "paid" = "total") => {
    let usd = 0;
    let iqd = 0;

    filteredInvs.forEach((inv: any) => {
      if (inv.type === filterType) {
        if (sumField === "total") {
          // Use voucher's main currency
          const code = inv.currencyCode || "USD";
          if (code === "USD") {
            usd += inv.total || 0;
          } else if (code === "IQD") {
            iqd += inv.total || 0;
          }
        } else {
          // Use actual paid amounts currencies
          if (inv.paidAmounts && Array.isArray(inv.paidAmounts)) {
            inv.paidAmounts.forEach((pa: any) => {
              const curCode = currencies.find((c: any) => c.id === pa.currencyId)?.code || "USD";
              if (curCode === "USD") {
                usd += pa.amount || 0;
              } else if (curCode === "IQD") {
                iqd += pa.amount || 0;
              }
            });
          } else {
            // Fallback to voucher currency if paidAmounts is missing
            const code = inv.currencyCode || "USD";
            if (code === "USD") {
              usd += inv.paid || 0;
            } else if (code === "IQD") {
              iqd += inv.paid || 0;
            }
          }
        }
      }
    });

    return { usd, iqd };
  };

  const kpiInvoices = getFilteredInvoices(kpiPeriod);
  const salesTotals = getTotals(kpiInvoices, "فرۆشتن", "total");
  const purchaseTotals = getTotals(kpiInvoices, "کڕین", "total");
  const expenseTotals = getTotals(kpiInvoices, "خەرجی", "total");
  const moneyInTotals = getTotals(kpiInvoices, "پارەی هاتوو", "paid");
  const moneyOutTotals = getTotals(kpiInvoices, "پارەی ڕۆشتوو", "paid");

  const barData = [
    { name: "January", usd: 0, iqd: 0 },
    { name: "February", usd: 0, iqd: 0 },
    { name: "March", usd: 0, iqd: 0 },
    { name: "April", usd: 0, iqd: 0 },
    { name: "May", usd: 0, iqd: 0 },
    { name: "June", usd: 0, iqd: 0 },
    { name: "July", usd: 0, iqd: 0 },
    { name: "August", usd: 0, iqd: 0 },
    { name: "September", usd: 0, iqd: 0 },
    { name: "October", usd: 0, iqd: 0 },
    { name: "November", usd: 0, iqd: 0 },
    { name: "December", usd: 0, iqd: 0 },
  ];

  invoices.forEach((inv) => {
    const typeToMatch = chartType === "sales" ? "فرۆشتن" : "کڕین";
    if (inv.type === typeToMatch && inv.date) {
      const d = new Date(inv.date);
      if (d.getFullYear() === chartYear) {
        const month = d.getMonth(); // 0 to 11
        if (month >= 0 && month < 12) {
          const curCode = inv.currencyCode || "USD";
          if (curCode === "USD") {
            barData[month].usd += inv.total || 0;
          } else if (curCode === "IQD") {
            barData[month].iqd += inv.total || 0;
          }
        }
      }
    }
  });

  const chartSumUsd = barData.reduce((sum, item) => sum + item.usd, 0);
  const chartSumIqd = barData.reduce((sum, item) => sum + item.iqd, 0);

  // 3. Chart Data: Vouchers Donut
  const donutInvoices = getFilteredInvoices(donutPeriod);
  const pieData = [
    { name: "فرۆشتن", typeKey: "sales", value: donutInvoices.filter((x: any) => x.type === "فرۆشتن").length, color: "#ef4444" },
    { name: "کڕین", typeKey: "purchase", value: donutInvoices.filter((x: any) => x.type === "کڕین").length, color: "#10b981" },
    { name: "پارەی هاتوو", typeKey: "money_in", value: donutInvoices.filter((x: any) => x.type === "پارەی هاتوو").length, color: "#8b5cf6" },
    { name: "پارەی ڕۆشتوو", typeKey: "money_out", value: donutInvoices.filter((x: any) => x.type === "پارەی ڕۆشتوو").length, color: "#14b8a6" },
    { name: "خەرجی", typeKey: "expense", value: donutInvoices.filter((x: any) => x.type === "خەرجی").length, color: "#f59e0b" },
  ];

  // Colors for styling
  const COLORS = {
    sales: "#ef4444", // Red
    purchases: "#10b981", // Green
    expenses: "#f59e0b", // Yellow
    moneyIn: "#8b5cf6", // Purple
    moneyOut: "#14b8a6", // Teal
  };

  // Calculate Alerts
  const alerts: Array<{
    id: string;
    accountId?: number;
    accountName?: string;
    type: string;
    title: string;
    message: string;
    severity: "warning" | "danger" | "info" | "success";
  }> = [];

  accounts.forEach((acc: any) => {
    // 1. Credit Limit Check
    if (acc.creditLimit > 0) {
      const limitCurId = acc.creditLimitCurrencyId || 1;
      const limitCurSymbol = currencies.find((c: any) => c.id === limitCurId)?.symbol || "$";
      const bal = acc.balanceByCurrency ? (acc.balanceByCurrency[String(limitCurId)] || 0) : 0;
      if (bal > acc.creditLimit) {
        alerts.push({
          id: `limit-${acc.id}`,
          accountId: acc.id,
          accountName: acc.name,
          type: "limit",
          title: "تێپەڕاندنی سنووری قەرز",
          message: `هەژماری "${acc.name}" سنووری قەرزی تێپەڕاندووە. سنوور: ${acc.creditLimit.toLocaleString()} ${limitCurSymbol}، قەرزی ئێستا: ${bal.toLocaleString()} ${limitCurSymbol}`,
          severity: "warning",
        });
      }
    }

    // 2. Overdue Debt Check
    if (acc.debtAlertDays > 0) {
      const owesMoney = acc.balanceByCurrency
        ? Object.values(acc.balanceByCurrency).some((v) => Number(v) > 0)
        : false;

      if (owesMoney) {
        const accInvoices = invoices.filter((inv) => inv.accountId === acc.id);
        const overdueInvoices = accInvoices.filter((inv) => {
          const isDebtGenerating = inv.rawType === "sales" || inv.rawType === "purchase_return";
          if (!isDebtGenerating) return false;
          
          const unpaid = inv.total > inv.paid;
          if (!unpaid) return false;
          
          const ageInDays = (new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24);
          return ageInDays > acc.debtAlertDays;
        });

        if (overdueInvoices.length > 0) {
          const oldestInv = overdueInvoices.reduce((oldest, current) => {
            return new Date(current.date) < new Date(oldest.date) ? current : oldest;
          }, overdueInvoices[0]);
          
          const ageInDays = Math.floor(
            (new Date().getTime() - new Date(oldestInv.date).getTime()) / (1000 * 60 * 60 * 24)
          );

          alerts.push({
            id: `overdue-${acc.id}`,
            accountId: acc.id,
            accountName: acc.name,
            type: "overdue",
            title: "قەرزی دواکەوتوو",
            message: `هەژماری "${acc.name}" قەرزی دواخستووە بۆ ماوەی ${ageInDays} ڕۆژ (سنوور: ${acc.debtAlertDays} ڕۆژ).`,
            severity: "danger",
          });
        }
      }
    }
  });

  customNotifications.forEach((n: any) => {
    alerts.push({
      id: `announcement-${n.id}`,
      type: "announcement",
      title: n.type === "warning" || n.type === "confirm" ? "ئاگادارکردنەوەی سیستەم" : n.type === "error" ? "هەڵەی سیستەم" : n.type === "success" ? "ئۆپەریشن سەرکەوتوو بوو" : "ئاگاداری سیستەم",
      message: n.message,
      severity: n.type === "error" ? "danger" : n.type === "warning" || n.type === "confirm" ? "warning" : n.type === "success" ? "success" : "info",
    });
  });

  const renderCardValues = (usd: number, iqd: number) => {
    const isUsdZero = usd === 0;
    const isIqdZero = iqd === 0;

    // Default sizes:
    // If both are non-zero: same size (e.g. text-[15px])
    // If one is zero: the zero one is text-[12px] (smaller), the non-zero one is text-[15px]
    // If both are zero: same size text-[13px]
    let usdSize = "text-[15px] font-extrabold text-gray-800";
    let iqdSize = "text-[15px] font-extrabold text-gray-855";

    if (isUsdZero && !isIqdZero) {
      usdSize = "text-[12px] font-semibold text-gray-500 font-mono";
      iqdSize = "text-[15px] font-extrabold text-gray-800";
    } else if (isIqdZero && !isUsdZero) {
      usdSize = "text-[15px] font-extrabold text-gray-800 font-mono";
      iqdSize = "text-[12px] font-semibold text-gray-500";
    } else if (isUsdZero && isIqdZero) {
      usdSize = "text-[13px] font-semibold text-gray-500 font-mono";
      iqdSize = "text-[13px] font-semibold text-gray-500";
    } else {
      usdSize = "text-[15px] font-extrabold text-gray-800 font-mono";
      iqdSize = "text-[15px] font-extrabold text-gray-800";
    }

    return (
      <div className="flex flex-col text-right">
        <span className={`${usdSize} mb-0.5`}>
          $ {usd.toLocaleString()}
        </span>
        <span className={`${iqdSize}`}>
          {iqd.toLocaleString()} دینار
        </span>
      </div>
    );
  };

  return (
    <div className="p-6 rtl text-gray-900 font-sans min-h-screen bg-[#f4f6fc]">
      
      {/* 1. Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm relative flex justify-between items-center z-30">
        {/* Left-side gradient accent bar matching Geno styling wrapped to handle overflow */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-[6px] h-full bg-gradient-to-b from-[#3b82f6] to-[#818cf8]" />
        </div>
        
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl transition-colors hover:bg-gray-100 cursor-pointer"
          >
            ☰
          </button>
          
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-1 text-gray-800">
              سڵاو {currentUser?.name || "کارمەند"}، بەخێربێیتەوە!
            </h1>
            <p className="text-gray-500 text-sm font-normal">ڕاپۆرتی سەرجەم چالاکییە داراییەکان لە یەک چاودێریدا</p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-20">
          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
            >
              <span className="text-lg">🔔</span>
              {alerts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl z-50 overflow-hidden text-right rtl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-100">ئاگادارییەکان</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                    {alerts.length} ئاگاداری
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                  {alerts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl">
                        ✅
                      </div>
                      <span className="text-sm font-bold text-slate-300">هیچ ئاگادارییەک نییە</span>
                      <span className="text-xs text-slate-500">هەموو شتێک بەباشی کاردەکات!</span>
                    </div>
                  ) : (
                    alerts.map((alert) => {
                      let indicatorColor = "bg-blue-500";
                      if (alert.severity === 'danger') indicatorColor = "bg-red-500 animate-pulse";
                      else if (alert.severity === 'warning') indicatorColor = "bg-amber-500";
                      else if (alert.severity === 'success') indicatorColor = "bg-emerald-500";

                      return (
                        <div
                          key={alert.id}
                          onClick={() => {
                            setShowNotifications(false);
                            if (alert.type === "announcement") {
                              const targetId = Number(alert.id.replace("announcement-", ""));
                              const updated = customNotifications.filter((n: any) => n.id !== targetId);
                              localStorage.setItem("__dismissed_notifications", JSON.stringify(updated));
                              setCustomNotifications(updated);
                            } else if (alert.accountId) {
                              router.push(`/reports/account-statement?accountId=${alert.accountId}`);
                            }
                          }}
                          className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer block text-right text-slate-100"
                        >
                          <div className="flex items-center gap-2 mb-1 justify-start">
                            <span className={`w-2.5 h-2.5 rounded-full ${indicatorColor}`} />
                            <span className="font-bold text-sm text-indigo-300">{alert.title}</span>
                            {alert.type === "announcement" && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded mr-auto select-none">
                                پاککردنەوە ×
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-semibold">{alert.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] px-4 py-1.5 rounded-full text-xs font-semibold">
            سەنتەری کارەبای لەندەن
          </span>
        </div>
      </div>

      {/* KPI Section Header */}
      <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-200 shadow-sm flex justify-between items-center z-10">
        <span className="font-bold text-gray-800 text-base">تێڕوانینی پسوولە</span>
        <select
          value={kpiPeriod}
          onChange={(e) => setKpiPeriod(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 outline-none cursor-pointer"
        >
          <option value="today">ئەمڕۆ</option>
          <option value="yesterday">دوێنێ</option>
          <option value="week">ئەم هەفتەیە</option>
          <option value="month">ئەم مانگە</option>
          <option value="year">ئەمساڵ</option>
          <option value="all">هەموو کات</option>
        </select>
      </div>

      {/* 2. Stats Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        
        {/* Card 1: Sales (فرۆشتن) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-250/80 border-b-[4px] border-b-[#ef4444] shadow-sm relative flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md cursor-pointer" onClick={() => router.push('/reports/invoices?type=sales')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-800 font-bold text-[15px]">فرۆشتن</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#fee2e2] text-[#ef4444]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          {renderCardValues(salesTotals.usd, salesTotals.iqd)}
        </div>

        {/* Card 2: Purchases (کڕین) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-250/80 border-b-[4px] border-b-[#22c55e] shadow-sm relative flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md cursor-pointer" onClick={() => router.push('/reports/invoices?type=purchase')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-800 font-bold text-[15px]">کڕین</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#dcfce7] text-[#22c55e]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          {renderCardValues(purchaseTotals.usd, purchaseTotals.iqd)}
        </div>

        {/* Card 3: Expenses (خەرجی) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-250/80 border-b-[4px] border-b-[#f97316] shadow-sm relative flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md cursor-pointer" onClick={() => router.push('/reports/invoices?type=expense')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-800 font-bold text-[15px]">خەرجی</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#ffedd5] text-[#f97316]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          {renderCardValues(expenseTotals.usd, expenseTotals.iqd)}
        </div>

        {/* Card 4: Outgoing Money (پارەی ڕۆشتوو) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-250/80 border-b-[4px] border-b-[#06b6d4] shadow-sm relative flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md cursor-pointer" onClick={() => router.push('/reports/invoices?type=money_out')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-800 font-bold text-[15px]">پارەی ڕۆشتوو</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#ecfeff] text-[#06b6d4]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>
          {renderCardValues(moneyOutTotals.usd, moneyOutTotals.iqd)}
        </div>

        {/* Card 5: Incoming Money (پارەی هاتوو) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-250/80 border-b-[4px] border-b-[#8b5cf6] shadow-sm relative flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md cursor-pointer" onClick={() => router.push('/reports/invoices?type=money_in')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-800 font-bold text-[15px]">پارەی هاتوو</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#f3e8ff] text-[#8b5cf6]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
          {renderCardValues(moneyInTotals.usd, moneyInTotals.iqd)}
        </div>

      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Bar Chart - Sales / Purchases per month */}
        <div className="bg-white rounded-2xl p-6 shadow-sm lg:col-span-2 border border-gray-200">
          <div className="flex justify-between items-center mb-4 relative z-20">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-gray-800 text-base">
                {chartType === "sales" ? "فرۆشی ساڵ" : "کڕینی ساڵ"}
              </span>
              {chartCurrency === "all" ? (
                <div className="flex flex-col gap-0">
                  <span className="text-lg font-black font-mono text-[#3b82f6]">
                    $ {chartSumUsd.toLocaleString()}
                  </span>
                  <span className="text-lg font-black font-mono text-[#22c55e]">
                    {chartSumIqd.toLocaleString()} دینار
                  </span>
                </div>
              ) : chartCurrency === "USD" ? (
                <span className="text-2xl font-black font-mono text-[#3b82f6]">
                  $ {chartSumUsd.toLocaleString()}
                </span>
              ) : (
                <span className="text-2xl font-black font-mono text-[#22c55e]">
                  {chartSumIqd.toLocaleString()} دینار
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={chartCurrency}
                onChange={(e) => setChartCurrency(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 outline-none cursor-pointer"
              >
                <option value="all">هەمووی</option>
                <option value="IQD">دینار</option>
                <option value="USD">$</option>
              </select>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 outline-none cursor-pointer"
              >
                <option value="sales">فرۆشتن</option>
                <option value="purchases">کڕین</option>
              </select>
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 outline-none cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
          
          <div className="h-64 w-full" dir="ltr">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 0, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Outfit' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Outfit' }} width={75} tickFormatter={(val) => chartCurrency === "IQD" ? val.toLocaleString() + ' د.ع' : '$' + val.toLocaleString()} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }} />
                  {(chartCurrency === "all" || chartCurrency === "USD") && (
                    <Bar dataKey="usd" name="$" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={chartCurrency === "all" ? 16 : 22} />
                  )}
                  {(chartCurrency === "all" || chartCurrency === "IQD") && (
                    <Bar dataKey="iqd" name="دینار" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={chartCurrency === "all" ? 16 : 22} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">باردەکرێت...</div>
            )}
          </div>
        </div>

        {/* Donut Chart - Created Vouchers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-gray-800 text-base">پسوولە دروستکراوەکان</span>
            <select
              value={donutPeriod}
              onChange={(e) => setDonutPeriod(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 outline-none cursor-pointer"
            >
              <option value="today">ئەمڕۆ</option>
              <option value="yesterday">دوێنێ</option>
              <option value="week">ئەم هەفتەیە</option>
              <option value="month">ئەم مانگە</option>
              <option value="year">ئەمساڵ</option>
              <option value="all">هەمووی</option>
            </select>
          </div>
          
          <div className="h-44 w-full flex justify-center items-center relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">باردەکرێت...</div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item: any) => (
              <div 
                key={item.name} 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push(`/reports/invoices?type=${item.typeKey}`)}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs text-gray-600 font-bold">{item.name}</span>
                <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-800 mr-auto font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. High Value Invoices Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#0d1e3d] text-white">
          <span className="font-bold text-base">پسوولە بەها بەرزەکان</span>
          <select className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm font-bold outline-none cursor-pointer">
            <option className="text-gray-900">هەمووی</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#0f172a] text-white text-xs font-semibold">
              <tr>
                <th className="px-4 py-3.5 text-center">پسوولە</th>
                <th className="px-4 py-3.5 text-center">جۆر</th>
                <th className="px-4 py-3.5 text-center">دۆخی پارەدان</th>
                <th className="px-4 py-3.5 text-right">هەژمار</th>
                <th className="px-4 py-3.5 text-center">کۆی گشتی</th>
                <th className="px-4 py-3.5 text-center">داشکاندن</th>
                <th className="px-4 py-3.5 text-center">پارەی دراو</th>
                <th className="px-4 py-3.5 text-center">ماوە</th>
                <th className="px-4 py-3.5 text-center">قاسە</th>
                <th className="px-4 py-3.5 text-center">تێبینی</th>
                <th className="px-4 py-3.5 text-center">بەروار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-slate-700 font-semibold">
              {[...invoices]
                .sort((a: any, b: any) => b.total - a.total)
                .slice(0, 5)
                .map((inv, idx) => {
                  let badgeClass = "bg-gray-100 text-gray-800";
                  if (inv.type === "فرۆشتن") badgeClass = "bg-[#fee2e2] text-[#ef4444]";
                  else if (inv.type === "کڕین") badgeClass = "bg-[#dcfce7] text-[#22c55e]";
                  else if (inv.type === "خەرجی") badgeClass = "bg-[#ffedd5] text-[#f97316]";
                  else if (inv.type === "پارەی هاتوو") badgeClass = "bg-[#f3e8ff] text-[#8b5cf6]";
                  else if (inv.type === "پارەی ڕۆشتوو") badgeClass = "bg-[#ecfeff] text-[#06b6d4]";

                  const payStatus = getPaymentStatus(inv.total, inv.paid);
                  const currencyCode = inv.currencyCode || "USD";
                  const remaining = Math.max(inv.total - inv.paid, 0);

                  return (
                    <tr key={inv.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-center">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            const raw = inv.rawType || inv.type;
                            const mappedType = (
                              raw === "sales" || raw === "فرۆشتن" ? "sales" :
                              raw === "purchase" || raw === "کڕین" ? "purchase" :
                              raw === "expense" || raw === "خەرجی" ? "expense" :
                              raw === "money_in" || raw === "پارەی هاتوو" ? "money_in" :
                              raw === "money_out" || raw === "پارەی ڕۆشتوو" ? "money_out" :
                              raw === "sales_return" || raw === "گەڕانەوەی فرۆشتن" ? "sales_return" :
                              raw === "purchase_return" || raw === "گەڕانەوەی کڕین" ? "purchase_return" :
                              raw === "my_debt" || raw === "قەرزی من" ? "my_debt" :
                              raw === "people_debt" || raw === "قەرزی خەڵک" ? "people_debt" :
                              raw === "my_debt_discount" || raw === "داشکاندن لە قەرزی من" ? "my_debt_discount" :
                              raw === "people_debt_discount" || raw === "داشکاندن لە قەرزی خەڵک" ? "people_debt_discount" :
                              raw === "shareholder_deposit" || raw === "دانانی پارە" || raw === "deposit" ? "deposit" :
                              raw === "shareholder_withdrawal" || raw === "کشانەوەی پارە" || raw === "withdrawal" ? "withdrawal" :
                              raw === "product_transfer" || raw === "گواستنەوەی کەرەستە" ? "product_transfer" :
                              raw === "material_issue" || raw === "سەرفی مەواد" ? "material_issue" :
                              raw === "warehouse_damage" || raw === "زیانی کۆگا" ? "warehouse_damage" :
                              raw === "warehouse_stock" || raw === "جەردی کۆگا" ? "warehouse_stock" : raw
                            );
                            router.push(`/invoices?editId=${inv.id}&type=${mappedType}`);
                          }}
                          title="دەستکاریکردنی پسوڵە"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-lg px-6 py-2 rounded-xl cursor-pointer shadow-md transition-all inline-block hover:scale-105"
                        >
                          {inv.id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block ${badgeClass}`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${payStatus.color}`}
                        >
                          {payStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {inv.accountId ? (
                          <span
                            onClick={() => router.push(`/reports/account-statement?accountId=${inv.accountId}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold"
                          >
                            {inv.accountName}
                          </span>
                        ) : (
                          inv.accountName || "-"
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold font-mono text-gray-800">
                        {formatInvoiceCurrency(inv.total, currencyCode)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-rose-600 font-mono">
                        {inv.totalDiscount > 0 ? formatInvoiceCurrency(inv.totalDiscount, currencyCode) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center text-green-600 font-bold font-mono">
                        {inv.paid > 0 ? formatInvoiceCurrency(inv.paid, currencyCode) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center text-red-500 font-bold font-mono">
                        {remaining > 0 ? formatInvoiceCurrency(remaining, currencyCode) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-500">{inv.cashboxName || "-"}</td>
                      <td className="px-4 py-3.5 text-center text-gray-400 text-xs truncate max-w-[120px]">{inv.internalNote || "-"}</td>
                      <td className="px-4 py-3.5 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center text-[10px] leading-tight">
                          <span className="text-gray-800 font-bold mb-0.5 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{inv.employeeName || "سیستەم"}</span>
                          <span className="text-gray-400 font-mono">{inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : "-"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-4xl text-blue-500 animate-bounce">📁</span>
                      <span className="text-sm font-semibold">ببوورە، هیچ داتایەک نەدۆزرایەوە!</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Quick Actions Section */}
      <div className="flex flex-col gap-4">
        <span className="font-bold text-gray-850 text-base">دروستکردنی پسوولە</span>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Action 1: Sale */}
          <button
            onClick={() => openInvoice("فرۆشتن")}
            className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:border-[#ef4444] hover:bg-[#fffafb] cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#fee2e2] text-[#ef4444] transition-all group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="font-bold text-[14px] text-gray-800">فرۆشتن</span>
          </button>

          {/* Action 2: Purchase */}
          <button
            onClick={() => openInvoice("کڕین")}
            className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:border-[#22c55e] hover:bg-[#f7fdf9] cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#dcfce7] text-[#22c55e] transition-all group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="font-bold text-[14px] text-gray-800">کڕین</span>
          </button>

          {/* Action 3: Expense */}
          <button
            onClick={() => openInvoice("خەرجی")}
            className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:border-[#f97316] hover:bg-[#fffbf7] cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#ffedd5] text-[#f97316] transition-all group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="font-bold text-[14px] text-gray-800">خەرجی</span>
          </button>

          {/* Action 4: Outgoing Money */}
          <button
            onClick={() => openInvoice("پارەی ڕۆشتوو")}
            className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:border-[#06b6d4] hover:bg-[#f7fdfd] cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#ecfeff] text-[#06b6d4] transition-all group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <span className="font-bold text-[14px] text-gray-800">پارەی ڕۆشتوو</span>
          </button>

          {/* Action 5: Incoming Money */}
          <button
            onClick={() => openInvoice("پارەی هاتوو")}
            className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:border-[#8b5cf6] hover:bg-[#faf9ff] cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#f3e8ff] text-[#8b5cf6] transition-all group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <span className="font-bold text-[14px] text-gray-800">پارەی هاتوو</span>
          </button>

        </div>
      </div>

    </div>
  );
}
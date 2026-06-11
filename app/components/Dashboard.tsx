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
  const invoices = useStore((state) => state.invoices) || [];
  const fetchInvoices = useStore((state) => state.fetchInvoices);
  const accounts = useStore((state) => state.accounts) || [];
  const fetchAccounts = useStore((state) => state.fetchAccounts);
  const currencies = useStore((state) => state.currencies) || [];
  const fetchCurrencies = useStore((state) => state.fetchCurrencies);

  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchAccounts();
    fetchCurrencies();
  }, [fetchInvoices, fetchAccounts, fetchCurrencies]);

  // 1. Calculate Totals for Cards
  const totalSales = invoices
    .filter((x: any) => x.type === "فرۆشتن")
    .reduce((sum, x) => sum + x.total, 0);

  const totalPurchases = invoices
    .filter((x: any) => x.type === "کڕین")
    .reduce((sum, x) => sum + x.total, 0);

  const totalExpenses = invoices
    .filter((x: any) => x.type === "خەرجی")
    .reduce((sum, x) => sum + x.total, 0);

  // Combine income and outcome if needed, or separate. Let's do Money In and Money Out combined or separate
  const totalIncome = invoices
    .filter((x: any) => x.type === "پارەی هاتوو")
    .reduce((sum, x) => sum + x.paid, 0);

  const totalMoneyOut = invoices
    .filter((x: any) => x.type === "پارەی ڕۆشتوو")
    .reduce((sum, x) => sum + x.paid, 0);

  const barData = [
    { name: "Jan", sales: 0 },
    { name: "Feb", sales: 0 },
    { name: "Mar", sales: 0 },
    { name: "Apr", sales: 0 },
    { name: "May", sales: 0 },
    { name: "Jun", sales: 0 },
    { name: "Jul", sales: 0 },
    { name: "Aug", sales: 0 },
    { name: "Sep", sales: 0 },
    { name: "Oct", sales: 0 },
    { name: "Nov", sales: 0 },
    { name: "Dec", sales: 0 },
  ];

  invoices.forEach((inv) => {
    if (inv.type === "فرۆشتن" && inv.date) {
      const month = new Date(inv.date).getMonth(); // 0 to 11
      if (month >= 0 && month < 12) {
        barData[month].sales += inv.total || 0;
      }
    }
  });

  // 3. Chart Data: Vouchers Donut
  const pieData = [
    { name: "فرۆشتن", typeKey: "sales", value: invoices.filter((x: any) => x.type === "فرۆشتن").length, color: "#ef4444" },
    { name: "کڕین", typeKey: "purchase", value: invoices.filter((x: any) => x.type === "کڕین").length, color: "#10b981" },
    { name: "پارەی هاتوو", typeKey: "money_in", value: invoices.filter((x: any) => x.type === "پارەی هاتوو").length, color: "#8b5cf6" },
    { name: "پارەی ڕۆشتوو", typeKey: "money_out", value: invoices.filter((x: any) => x.type === "پارەی ڕۆشتوو").length, color: "#14b8a6" },
    { name: "خەرجی", typeKey: "expense", value: invoices.filter((x: any) => x.type === "خەرجی").length, color: "#f59e0b" },
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
    accountId: number;
    accountName: string;
    type: "limit" | "overdue";
    title: string;
    message: string;
    severity: "warning" | "danger";
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

  return (
    <div className="p-4 rtl text-gray-900 font-sans min-h-screen bg-[#f4f7fc]">
      {/* 1. Welcome Banner */}
      <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100 shadow-sm relative z-30 flex justify-between items-center">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 rounded-xl opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\\'20\\\' height=\\\'20\\\' viewBox=\\\'0 0 20 20\\\' xmlns=\\\'http://www.w3.org/2000/svg\\\'%3E%3Cg fill=\\\'%23000000\\\' fill-opacity=\\\'1\\\' fill-rule=\\\'evenodd\\\'%3E%3Ccircle cx=\\\'3\\\' cy=\\\'3\\\' r=\\\'3\\\'/%3E%3Ccircle cx=\\\'13\\\' cy=\\\'13\\\' r=\\\'3\\\'/%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '20px 20px' }}></div>
        
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="md:hidden sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl transition-colors hover:bg-gray-100 cursor-pointer"
          >
            ☰
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-center justify-center border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 shadow-sm">
              <span className="text-xs text-gray-400 font-bold mb-1">کۆگای دۆستان</span>
              <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">پڕۆفایلی تایبەت</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black mb-1 text-[#0b1f50] flex items-center gap-2">
                سڵاو، بەخێربێیتەوە! <span className="animate-bounce inline-block">👋</span>
              </h1>
              <p className="text-gray-400 text-sm font-bold">پێداچوونەوەی گشتی بە کارەکان</p>
            </div>
          </div>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative z-20">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
          >
            <span className="text-xl">🔔</span>
            {alerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-right rtl">
              <div className="bg-slate-50 border-b border-gray-150 px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-black text-gray-700">ئاگادارییەکان</span>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {alerts.length} ئاگاداری
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">✅</span>
                    <span className="text-sm font-bold text-gray-400">هیچ ئاگادارییەک نییە</span>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setShowNotifications(false);
                        router.push(`/reports/account-statement?accountId=${alert.accountId}`);
                      }}
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer block text-right"
                    >
                      <div className="flex items-center gap-2 mb-1 justify-start">
                        <span className={`w-2.5 h-2.5 rounded-full ${alert.severity === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="font-bold text-sm text-[#0b1f50]">{alert.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed font-semibold">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Stats Row (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Sales */}
        <div className="bg-white rounded-xl p-5 border-b-4 shadow-sm relative flex flex-col justify-between" style={{ borderColor: COLORS.sales }}>
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-500 font-bold text-sm">فرۆشتن</div>
            <div className="text-red-500 text-2xl">🛍️</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800 ltr text-right mb-1">
              $ {totalSales.toLocaleString()}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span onClick={() => router.push('/reports/invoices?type=sales')} className="text-gray-400 cursor-pointer hover:text-[#0b1f50] font-bold">بینینی ڕاپۆرت ←</span>
            </div>
          </div>
        </div>

        {/* Purchases */}
        <div className="bg-white rounded-xl p-5 border-b-4 shadow-sm relative flex flex-col justify-between" style={{ borderColor: COLORS.purchases }}>
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-500 font-bold text-sm">کڕین</div>
            <div className="text-green-500 text-2xl">🛒</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800 ltr text-right mb-1">
              $ {totalPurchases.toLocaleString()}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span onClick={() => router.push('/reports/invoices?type=purchase')} className="text-gray-400 cursor-pointer hover:text-[#0b1f50] font-bold">بینینی ڕاپۆرت ←</span>
            </div>
          </div>
        </div>

        {/* Money In */}
        <div className="bg-white rounded-xl p-5 border-b-4 shadow-sm relative flex flex-col justify-between" style={{ borderColor: COLORS.moneyIn }}>
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-500 font-bold text-sm">پارەی هاتوو</div>
            <div className="text-purple-500 text-2xl">📥</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800 ltr text-right mb-1">
              $ {totalIncome.toLocaleString()}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span onClick={() => router.push('/reports/invoices?type=money_in')} className="text-gray-400 cursor-pointer hover:text-[#0b1f50] font-bold">بینینی ڕاپۆرت ←</span>
            </div>
          </div>
        </div>

        {/* Money Out */}
        <div className="bg-white rounded-xl p-5 border-b-4 shadow-sm relative flex flex-col justify-between" style={{ borderColor: COLORS.moneyOut }}>
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-500 font-bold text-sm">پارەی ڕۆشتوو</div>
            <div className="text-teal-500 text-2xl">📤</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800 ltr text-right mb-1">
              $ {totalMoneyOut.toLocaleString()}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span onClick={() => router.push('/reports/invoices?type=money_out')} className="text-gray-400 cursor-pointer hover:text-[#0b1f50] font-bold">بینینی ڕاپۆرت ←</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl p-5 border-b-4 shadow-sm relative flex flex-col justify-between" style={{ borderColor: COLORS.expenses }}>
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-500 font-bold text-sm">خەرجی</div>
            <div className="text-yellow-500 text-2xl">📦</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800 ltr text-right mb-1">
              {totalExpenses.toLocaleString()} دینار
            </div>
            <div className="flex justify-between items-center text-xs">
              <span onClick={() => router.push('/reports/invoices?type=expense')} className="text-gray-400 cursor-pointer hover:text-[#0b1f50] font-bold">بینینی ڕاپۆرت ←</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Bar Chart - Sales per month */}
        <div className="bg-white rounded-xl p-5 shadow-sm lg:col-span-2 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">فرۆشی ساڵ</h3>
            <div className="flex gap-2">
              <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium">
                <option>فرۆشتن</option>
              </select>
              <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium">
                <option>2026</option>
              </select>
            </div>
          </div>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={80} tickFormatter={(val) => val.toLocaleString()} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart - Created Vouchers */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">پسووڵە دروستکراوەکان</h3>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium">
              <option>ئەمڕۆ</option>
            </select>
          </div>
          <div className="h-48 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            {pieData.map((item: any) => (
              <div 
                key={item.name} 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push(`/reports/invoices?type=${item.typeKey}`)}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs text-gray-600 font-bold">{item.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-800 mr-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. High Value Vouchers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#0b1f50] text-white">
          <h3 className="font-bold">پسووڵە بەها بەرزەکان</h3>
          <select className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1 text-sm font-medium outline-none">
            <option className="text-gray-900">ئەمڕۆ</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#0f296d] text-white/90 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">جوڵە</th>
                <th className="px-4 py-3 font-medium">جۆر</th>
                <th className="px-4 py-3 font-medium">هەژمار</th>
                <th className="px-4 py-3 font-medium">کۆی گشتی</th>
                <th className="px-4 py-3 font-medium">داشکاندن</th>
                <th className="px-4 py-3 font-medium">پارەی دراو</th>
                <th className="px-4 py-3 font-medium">ماوە</th>
                <th className="px-4 py-3 font-medium">قاسە</th>
                <th className="px-4 py-3 font-medium">تێبینی</th>
                <th className="px-4 py-3 font-medium">بەروار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.slice(-5).reverse().map((inv, idx) => (
                <tr key={inv.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-blue-600 font-bold">{inv.id}</td>
                  <td className="px-4 py-3">{inv.type}</td>
                  <td className="px-4 py-3 text-blue-600">{inv.accountName || "نەناسراو"}</td>
                  <td className="px-4 py-3 font-bold ltr text-right">${inv.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">-</td>
                  <td className="px-4 py-3 text-green-600 font-bold ltr text-right">${inv.paid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-500 font-bold ltr text-right">${(inv.total - inv.paid).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.cashboxName || "-"}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-[100px]">{inv.note || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex flex-col items-center justify-center text-[10px] leading-tight">
                      <span className="text-gray-800 font-bold mb-0.5 whitespace-nowrap bg-gray-100 px-1.5 rounded border border-gray-200">هێمن مەلا فەرهاد</span>
                      <span className="text-gray-500 font-bold">{inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : "02/06/2026"}</span>
                      <span className="text-gray-400">{inv.date ? new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">هیچ پسووڵەیەک نەدۆزرایەوە</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "فرۆشتن", icon: "🛍️", color: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" },
          { label: "کڕین", icon: "🛒", color: "bg-green-50 text-green-600 border-green-200 hover:bg-green-100" },
          { label: "پارەی هاتوو", icon: "📥", color: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100" },
          { label: "پارەی ڕۆشتوو", icon: "📤", color: "bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100" },
          { label: "خەرجی", icon: "💰", color: "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => openInvoice(btn.label)}
            className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${btn.color}`}
          >
            <div className="text-3xl">{btn.icon}</div>
            <div className="font-black text-sm">{btn.label}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
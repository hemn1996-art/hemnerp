"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store/store";

interface ReportItem {
  id: string;
  title: string;
  description: string;
  path: string;
  perm: string;
  adminOnly?: boolean;
  colorClass: {
    bg: string;
    text: string;
  };
  icon: React.ReactNode;
}

export default function ReportsDashboard() {
  const router = useRouter();
  const { currentUser, hasPermission } = useStore() as any;
  const [searchQuery, setSearchQuery] = useState("");

  const reportsList = useMemo<ReportItem[]>(() => [
    {
      id: "invoices",
      title: "ڕاپۆرتی پسووڵە",
      description: "بەدواداچوون لەگەڵ گۆڕینی دارایی پسووڵەکان",
      path: "/reports/invoices",
      perm: "reports_invoices",
      colorClass: { bg: "bg-blue-500/10", text: "text-blue-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: "balance-sheet",
      title: "ڕاپۆرتی میزانیە",
      description: "سەرمایە، قەرز و سەرمایەی هاوبەشەکان لە کاتێکی دیاریکراودا",
      path: "/reports/balance-sheet",
      perm: "reports_balance",
      adminOnly: true,
      colorClass: { bg: "bg-indigo-500/10", text: "text-indigo-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      )
    },

    {
      id: "profit",
      title: "ڕاپۆرتی قازانجی گشتی",
      description: "کۆی فرۆشتن، خەرجی و قازانجی ساف لە ماوەیەکی دیاریکراودا",
      path: "/reports/profit",
      perm: "reports_profit",
      adminOnly: true,
      colorClass: { bg: "bg-green-500/10", text: "text-green-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      id: "profit-distribution",
      title: "ڕاپۆرتی دابەشکردنی قازانج",
      description: "دابەشکردنی قازانجی ساف بەسەر هاوبەشەکاندا",
      path: "/reports/profit-distribution",
      perm: "reports_profit",
      adminOnly: true,
      colorClass: { bg: "bg-purple-500/10", text: "text-purple-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    },
    {
      id: "debts",
      title: "ڕاپۆرتی قەرز",
      description: "تفاسیل بەکۆی حیسابات و قەرزی کڕیاران و فرۆشیاران",
      path: "/reports/debts",
      perm: "reports_debts",
      colorClass: { bg: "bg-rose-500/10", text: "text-rose-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 11a3 3 0 10-6 0M17 11a3 3 0 10-6 0" />
        </svg>
      )
    },
    {
      id: "stock",
      title: "ڕاپۆرتی کۆگا",
      description: "بڕ و نرخی ئێستای کۆگاکان لەسەر بنەمای کڕین و فرۆشتن",
      path: "/reports/stock",
      perm: "reports_stock",
      colorClass: { bg: "bg-amber-500/10", text: "text-amber-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: "stock-snapshot",
      title: "ڕاپۆرتی ئاستی کۆگا",
      description: "بڕ و نرخی کۆگاکان لە مێژوویەکی دیاریکراوی ڕابردوودا",
      path: "/reports/stock-snapshot",
      perm: "reports_stock_snapshot",
      colorClass: { bg: "bg-yellow-500/10", text: "text-yellow-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: "items",
      title: "ڕاپۆرتی کەرەستە",
      description: "کۆی چالاکییەکانی کڕین، فرۆشتن و قازانجی هەر کەرەستەیەک",
      path: "/reports/items",
      perm: "reports_items",
      colorClass: { bg: "bg-orange-500/10", text: "text-orange-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: "material-movements",
      title: "ڕاپۆرتی جووڵەی کەرەستە",
      description: "جوڵەی هاتن و ڕۆشتنی کەرەستەکان لە نێوان کۆگاکان و پسووڵەکاندا",
      path: "/reports/material-movements",
      perm: "reports_material_movements",
      colorClass: { bg: "bg-teal-500/10", text: "text-teal-600" },
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    }
  ], []);

  // Filter items by permission & role
  const allowedReports = useMemo(() => {
    return reportsList.filter(item => {
      if (item.adminOnly && currentUser?.role !== "admin") return false;
      return !item.perm || hasPermission(item.perm, "canView");
    });
  }, [reportsList, currentUser, hasPermission]);

  // Group mappings
  const categories = useMemo(() => [
    {
      id: "sales",
      title: "فرۆشتن",
      reportIds: ["invoices"]
    },
    {
      id: "finance",
      title: "دارایی",
      reportIds: ["balance-sheet", "profit", "profit-distribution", "debts"]
    },
    {
      id: "warehouse",
      title: "کۆگا",
      reportIds: ["stock", "stock-snapshot", "items", "material-movements"]
    }
  ], []);

  // Apply search query
  const filteredAllowedReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allowedReports;
    return allowedReports.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  }, [allowedReports, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 select-none" dir="rtl">
      {/* Search Section */}
      <div className="flex justify-center max-w-2xl mx-auto">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="گەڕان بەدوای ڕاپۆرت..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3.5 pr-4 pl-12 rounded-2xl border border-gray-200 bg-white text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-base text-right"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Categories list */}
      <div className="space-y-10">
        {categories.map(category => {
          const categoryReports = filteredAllowedReports.filter(r =>
            category.reportIds.includes(r.id)
          );

          if (categoryReports.length === 0) return null;

          return (
            <div key={category.id} className="space-y-4">
              <h2 className="text-lg font-extrabold text-gray-700 border-b border-gray-200/60 pb-2">
                {category.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => router.push(report.path)}
                    className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden"
                  >
                    {/* Star Fav Icon */}
                    <button className="text-gray-300 hover:text-yellow-400 transition-colors p-1 z-10">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>

                    {/* Middle title and description */}
                    <div className="flex-1 px-4 text-right">
                      <h3 className="text-sm font-black text-gray-800 group-hover:text-blue-600 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-bold mt-1 line-clamp-2">
                        {report.description}
                      </p>
                    </div>

                    {/* Right Icon Box */}
                    <div className={`p-3 rounded-xl ${report.colorClass.bg} ${report.colorClass.text} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      {report.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAllowedReports.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-gray-400 font-bold text-lg">هیچ ڕاپۆرتێک نەدۆزرایەوە بەپێی گەڕانەکەت.</p>
        </div>
      )}
    </div>
  );
}

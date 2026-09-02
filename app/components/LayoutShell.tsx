"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import NegativeCashboxWarning from "./NegativeCashboxWarning";
import DailyRatePrompt from "./DailyRatePrompt";
import { useStore } from "../store/store";

/* ─── Eastern-Arabic / Persian digits → Western (English) ─── */
const ARABIC_DIGIT_MAP: Record<string, string> = {
  "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4",
  "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9",
  "\u06f0": "0", "\u06f1": "1", "\u06f2": "2", "\u06f3": "3", "\u06f4": "4",
  "\u06f5": "5", "\u06f6": "6", "\u06f7": "7", "\u06f8": "8", "\u06f9": "9",
};
const ARABIC_DIGIT_RE = /[\u0660-\u0669\u06f0-\u06f9]/g;

function isNumberInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  return (
    el.type === "number" ||
    el.inputMode === "decimal" ||
    el.inputMode === "numeric" ||
    el.lang === "en"
  );
}

type LayoutShellProps = {
  children: React.ReactNode;
};

export default function LayoutShell({ children }: LayoutShellProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  
  const fetchCurrencies = useStore((s) => s.fetchCurrencies);
  const fetchCurrentUser = useStore((s) => s.fetchCurrentUser);
  const userLoaded = useStore((s) => s.userLoaded);
  const currentUser = useStore((s) => s.currentUser);
  const hasPermission = useStore((s) => s.hasPermission);

  const [announcement, setAnnouncement] = useState<{ id: number; message: string; type: string } | null>(null);
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  // Determine required permission module for current pathname
  const getRequiredModuleForPath = (path: string): string | null => {
    if (path === "/dashboard" || path === "/") return "dashboard";
    if (path.startsWith("/invoices")) return "vouchers";
    if (path.startsWith("/accounts")) return "accounts";
    if (path.startsWith("/account-types")) return "account_types";
    if (path.startsWith("/account-collection")) return "account_collection";
    if (path.startsWith("/locations")) return "accounts";
    if (path.startsWith("/cashboxes")) return "cashboxes";
    if (path.startsWith("/currency-exchange")) return "currency_exchange";
    if (path.startsWith("/currency-transfer")) return "currency_transfer";
    if (path.startsWith("/materials")) return "materials";
    if (path.startsWith("/categories")) return "categories";
    if (path.startsWith("/brands")) return "brands";
    if (path.startsWith("/packaging")) return "packaging";
    if (path.startsWith("/price-types")) return "price_types";
    if (path.startsWith("/fixed-assets") || path.startsWith("/fixed-asset-categories")) return "fixed_assets";
    if (path.startsWith("/employees")) return "hr";
    if (path.startsWith("/settings")) return "settings";

    // Reports
    if (path === "/reports/invoices") return "reports_invoices";
    if (path === "/reports/debts") return "reports_debts";
    if (path === "/reports/expenses") return "reports_expenses";
    if (path === "/reports/profit" || path === "/reports/profit-distribution") return "reports_profit";
    if (path === "/reports/stock") return "reports_stock";
    if (path === "/reports/stock-snapshot") return "reports_stock_snapshot";
    if (path === "/reports/items") return "reports_items";
    if (path === "/reports/material-movements") return "reports_material_movements";
    if (path === "/reports/balance-sheet") return "reports_balance";
    if (path.startsWith("/reports")) return "reports";

    return null;
  };

  const getModuleLabel = (moduleKey: string): string => {
    const map: Record<string, string> = {
      dashboard: "داشبۆرد",
      vouchers: "پسووڵەکان",
      accounts: "هەژمارەکان",
      account_types: "جۆری هەژمار",
      account_collection: "کۆلێکشن",
      cashboxes: "قاسە",
      currency_exchange: "گۆڕینەوەی دراو",
      currency_transfer: "گواستنەوەی دراو",
      materials: "کەرەستەکان",
      categories: "کاتیگۆری",
      brands: "براند",
      packaging: "پێچانەوە",
      price_types: "جۆری نرخ",
      fixed_assets: "مەوجودات",
      hr: "بەڕێوەبردنی کارمەندان (HR)",
      settings: "ڕێکخستنەکان",
      reports_invoices: "ڕاپۆرتی پسووڵە",
      reports_debts: "ڕاپۆرتی قەرز",
      reports_expenses: "ڕاپۆرتی خەرجی",
      reports_profit: "ڕاپۆرتی قازانج",
      reports_stock: "ڕاپۆرتی کۆگا",
      reports_stock_snapshot: "ڕاپۆرتی ئاستی کۆگا",
      reports_items: "ڕاپۆرتی کەرەستە",
      reports_material_movements: "ڕاپۆرتی جوڵەی کەرەستە",
      reports_balance: "ڕاپۆرتی میزانیە",
      reports: "ڕاپۆرتەکان",
    };
    return map[moduleKey] || moduleKey;
  };

  const requiredModule = getRequiredModuleForPath(pathname);

  const checkIsAllowedPageAccess = (): boolean => {
    if (isLoginPage || !requiredModule || !userLoaded) return true;
    if (currentUser?.role === "admin") return true;

    // Special check for /invoices: allowed if user has 'vouchers' canCreate or canUpdate permission
    // OR if ANY 'vouchers_*' sub-permission has canCreate or canUpdate = true!
    if (pathname.startsWith("/invoices")) {
      if (hasPermission("vouchers", "canCreate") || hasPermission("vouchers", "canUpdate")) return true;
      const hasAnyVoucherCreateOrUpdate = currentUser?.permissions?.some(
        (p: any) => p.module.startsWith("vouchers_") && (p.canCreate || p.canUpdate)
      );
      return Boolean(hasAnyVoucherCreateOrUpdate);
    }

    // Special check for /reports: allowed if user has specific report perm or 'reports' perm
    // OR if ANY 'reports_*' sub-permission has canView = true!
    if (pathname.startsWith("/reports")) {
      if (requiredModule && hasPermission(requiredModule, "canView")) return true;
      if (hasPermission("reports", "canView")) return true;
      const hasAnyReportSubPerm = currentUser?.permissions?.some(
        (p: any) => p.module.startsWith("reports_") && p.canView
      );
      return Boolean(hasAnyReportSubPerm);
    }

    return hasPermission(requiredModule, "canView");
  };

  const isAllowedPageAccess = checkIsAllowedPageAccess();

  // Global 401 Interceptor: Immediately log out if any API action (e.g. creating/deleting vouchers) returns 401
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if ((response.status === 401 || response.status === 403) && window.location.pathname !== "/login") {
        const urlStr = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
        // Don't loop on login endpoint failures
        if (!urlStr.includes("/api/login")) {
          document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
          document.cookie = "user_session=; path=/; max-age=0; SameSite=Lax";
          if (typeof sessionStorage !== "undefined") sessionStorage.clear();
          window.location.href = "/login?revoked=true";
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Periodic session check (every 5 minutes, only if tab is visible)
  useEffect(() => {
    if (isLoginPage) return;

    // Check once on navigation
    fetchCurrentUser();

    // Lightweight heartbeat poll every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchCurrentUser();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchCurrentUser, isLoginPage, pathname]);

  // Fetch currencies on mount
  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  useEffect(() => {
    if (!isLoginPage && userLoaded && !currentUser) {
      window.location.href = "/login?revoked=true";
    }
  }, [isLoginPage, userLoaded, currentUser]);

  // Poll for announcements
  useEffect(() => {
    if (isLoginPage || !currentUser) {
      setAnnouncement(null);
      return;
    }

    try {
      const storedDismissed = sessionStorage.getItem("__dismissed_announcement_id");
      if (storedDismissed) {
        setDismissedId(Number(storedDismissed));
      }
    } catch (e) {
      console.error(e);
    }

    const fetchAnnouncement = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data && data.isActive) {
            setAnnouncement(data);
          } else {
            setAnnouncement(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch announcements", err);
      }
    };

    fetchAnnouncement();
    const interval = setInterval(fetchAnnouncement, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [currentUser, isLoginPage]);

  // Real-time updates via SSE — DISABLED temporarily
  // SSE was causing DB connection pool exhaustion on Supabase free tier,
  // because each SSE connection holds a DB connection open and auto-reconnects on failure.
  // This was the root cause of the logout issue.
  // TODO: Re-enable when using a proper connection pooler or upgrade DB tier.
  /*
  useEffect(() => {
    if (isLoginPage || !currentUser) return;

    const eventSource = new EventSource("/api/users/me/updates");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "permissions_updated" || data.type === "user_updated" || data.type === "deactivated") {
          fetchCurrentUser();
        }
      } catch (err) {
        console.error("Error parsing real-time updates:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser, isLoginPage, fetchCurrentUser]);
  */


  /* Global: auto-convert Arabic/Kurdish digits → English on any numeric input */
  useEffect(() => {
    function handleBeforeInput(e: Event) {
      const event = e as InputEvent;
      if (!isNumberInput(event.target)) return;
      if (!event.data || !ARABIC_DIGIT_RE.test(event.data)) return;

      event.preventDefault();
      // Reset lastIndex because regex is global
      ARABIC_DIGIT_RE.lastIndex = 0;
      const converted = event.data.replace(
        /[\u0660-\u0669\u06f0-\u06f9]/g,
        (ch) => ARABIC_DIGIT_MAP[ch] ?? ch
      );
      // Standard way to insert text in contenteditable / input
      document.execCommand("insertText", false, converted);
    }

    document.addEventListener("beforeinput", handleBeforeInput, true);
    return () =>
      document.removeEventListener("beforeinput", handleBeforeInput, true);
  }, []);

  if (!isLoginPage && !userLoaded) {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f3f4f6", fontFamily: '"Speda", sans-serif' }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "4px solid #d1d5db", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#4b5563" }}>داخڵبوون...</span>
        </div>
      </div>
    );
  }

  const handleDismissAnnouncement = (ann: { id: number; message: string; type: string }) => {
    setDismissedId(ann.id);
    try {
      sessionStorage.setItem("__dismissed_announcement_id", ann.id.toString());
      
      const saved = localStorage.getItem("__dismissed_notifications");
      const list = saved ? JSON.parse(saved) : [];
      if (!list.some((n: any) => n.id === ann.id)) {
        list.push({
          id: ann.id,
          message: ann.message,
          type: ann.type,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("__dismissed_notifications", JSON.stringify(list));
        window.dispatchEvent(new Event("notifications-updated"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="layout-shell-root"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#f3f4f6",
        minWidth: "1280px",
        minHeight: "100vh",
      }}
    >
      {/* Daily USD Exchange Rate Prompt (only inside system after login) */}
      {!isLoginPage && <DailyRatePrompt />}

      {/* System Announcement Banner */}
      {announcement && announcement.id !== dismissedId && (
        <div
          onClick={() => handleDismissAnnouncement(announcement)}
          className={`px-6 py-4 flex items-center justify-center transition-all shadow-md border-b font-sans cursor-pointer hover:opacity-95 text-center relative ${
            announcement.type === "warning" || announcement.type === "confirm"
              ? "bg-amber-100 border-amber-300 text-amber-950"
              : announcement.type === "error"
              ? "bg-rose-100 border-rose-300 text-rose-950"
              : announcement.type === "success"
              ? "bg-emerald-100 border-emerald-300 text-emerald-950"
              : "bg-blue-100 border-blue-300 text-blue-950"
          }`}
          style={{ direction: "rtl" }}
          title="بۆ داخستنی ئەم ئاگادارییە، کلیک لە هەر شوێنێکی ئەم بۆکسە بکە"
        >
          <div className="flex items-center justify-center gap-3 w-full">
            <span className="text-2xl animate-bounce">
              {announcement.type === "warning" || announcement.type === "confirm"
                ? "⚠️"
                : announcement.type === "error"
                ? "❌"
                : announcement.type === "success"
                ? "✅"
                : "📢"}
            </span>
            <span className="text-base md:text-xl font-bold tracking-wide select-none leading-relaxed dua-font">
              {announcement.message}
            </span>
            <span className="text-xs opacity-60 mr-4 border border-black/10 px-2.5 py-0.5 rounded-full whitespace-nowrap bg-black/5 select-none">
              داخستن ×
            </span>
          </div>
        </div>
      )}

      {/* Negative Cashbox Balance Alert Banner */}
      {!isLoginPage && currentUser && <NegativeCashboxWarning />}

      {/* Mobile Top Bar - hidden on desktop */}
      {!isLoginPage && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center z-[999] shadow-sm flex-shrink-0">
          <button
            onClick={() => setIsOpenMobile(true)}
            className="text-xl p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border-none cursor-pointer flex items-center justify-center leading-none"
          >
            ☰
          </button>
          <span className="font-black text-lg text-gray-900">کۆگای دۆستان</span>
          <div className="w-10"></div>
        </div>
      )}

      {/* Main Row - sidebar + content, fills all remaining height */}
      <div
        className="layout-main-row"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          position: "relative",
        }}
      >
        {/* Sidebar */}
        {!isLoginPage && (
          <Sidebar isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />
        )}

        {/* Backdrop for Mobile Sidebar */}
        {!isLoginPage && isOpenMobile && (
          <div
            onClick={() => setIsOpenMobile(false)}
            className="fixed inset-0 bg-black/50 z-[999] lg:hidden"
          />
        )}

        {/* Main Content */}
        <main
          id="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            background: "#f3f4f6",
            transition: "padding 0.3s ease-in-out",
          }}
        >
          {!isAllowedPageAccess && requiredModule ? (
            <div className="p-8 text-center rtl font-sans flex flex-col items-center justify-center min-h-[70vh] gap-4" dir="rtl">
              <div className="w-20 h-20 rounded-3xl bg-rose-100 border border-rose-300 flex items-center justify-center text-4xl shadow-md">
                🔒
              </div>
              <h2 className="text-2xl font-black text-rose-950 m-0">
                ڕێگەپێنەدراو! (دەسەڵاتی بینینت نییە)
              </h2>
              <p className="text-sm font-bold text-gray-600 max-w-md m-0 leading-relaxed">
                تۆ دەسەڵاتی بینینی بەشی <span className="text-rose-700 font-black">"{getModuleLabel(requiredModule)}"</span> ت نییە. تکایە بۆ وەرگرتنی دەسەڵات، پەیوەندی بە بەڕێوەبەر (ئەدمین) بکە.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                گەڕانەوە بۆ داشبۆرد 🏠
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

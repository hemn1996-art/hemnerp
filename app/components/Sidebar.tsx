"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "../store/store";

const menuItems = [
  { name: "داشبۆرد", icon: "📊", path: "/dashboard", perm: "dashboard" },
  { name: "پسوڵە", icon: "🧾", path: "/invoices", perm: "vouchers" },
  {
    name: "هەژمار",
    icon: "👤",
    children: [
      { name: "هەژمار",        path: "/accounts", perm: "accounts" },
      { name: "جۆری هەژمار",  path: "/account-types", perm: "account_types" },
      { name: "کۆلێکشن",      path: "/account-collection", perm: "account_collection" },
      { name: "وڵات",          path: "/locations/countries", perm: "accounts" },
      { name: "شار",           path: "/locations/cities", perm: "accounts" },
      { name: "گەڕەک",         path: "/locations/districts", perm: "accounts" },
    ],
  },
  {
    name: "قاسە",
    icon: "💵",
    children: [
      { name: "قاسە",           path: "/cashboxes", perm: "cashboxes" },
      { name: "گۆڕینەوەی دراو",   path: "/currency-exchange", perm: "currency_exchange" },
      { name: "گواستنەوەی دراو", path: "/currency-transfer", perm: "currency_transfer" },
    ],
  },

  {
    name: "کەرەستە",
    icon: "📦",
    children: [
      { name: "کەرەستە", path: "/materials", perm: "materials" },
      { name: "کاتێگۆری", path: "/categories", perm: "categories" },
      { name: "براند", path: "/brands", perm: "brands" },
      { name: "پێچانەوە", path: "/packaging", perm: "packaging" },
      { name: "جۆری نرخ", path: "/price-types", perm: "price_types" }
    ],
  },

  {
    name: "مەوجودات",
    icon: "💼",
    children: [
      { name: "کاتیگۆری مەوجودات", path: "/fixed-asset-categories" },
      { name: "مەوجودات", path: "/fixed-assets" },
    ],
  },

  {
    name: "HR",
    icon: "👥",
    children: [
      { name: "کارمەندەکان", path: "/employees" },
    ],
  },

  {
    name: "ڕاپۆرت",
    icon: "📈",
    children: [
      { name: "ڕاپۆرتی پسووڵە", path: "/reports/invoices", perm: "reports_invoices" },
      { name: "ڕاپۆرتی قەرز", path: "/reports/debts", perm: "reports_debts" },
      { name: "ڕاپۆرتی قازانجی گشتی", path: "/reports/profit", perm: "reports_profit" },
      { name: "ڕاپۆرتی کۆگا", path: "/reports/stock", perm: "reports_stock" },
      { name: "ڕاپۆرتی ئاستی کۆگا", path: "/reports/stock-snapshot", perm: "reports_stock_snapshot" },
      { name: "ڕاپۆرتی کەرەستە", path: "/reports/items", perm: "reports_items" },
      { name: "ڕاپۆرتی جوڵەی کەرەستە", path: "/reports/material-movements", perm: "reports_material_movements" },
      { name: "ڕاپۆرتی میزانیە", path: "/reports/balance-sheet", perm: "reports_balance" },
    ],
  },

  {
    name: "ڕێکخستن",
    icon: "⚙️",
    perm: "settings",
    children: [
      { name: "ڕێکخستنی گشتی", path: "/settings/general", perm: "settings" },
      { name: "کڵێشەی پسووڵە", path: "/settings/templates", perm: "settings" },
      { name: "دراوەکان", path: "/settings/currencies", perm: "settings" },
      { name: "کۆگا", path: "/settings/warehouses", perm: "settings" },
      { name: "باکئەپ", path: "/settings/backup", perm: "settings" }
    ],
  },
];

export default function Sidebar({
  isOpenMobile,
  setIsOpenMobile,
}: {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredOpen, setHoveredOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = useStore((s) => s.currentUser);
  const hasPermission = useStore((s) => s.hasPermission);

  // The sidebar is visually expanded when: not collapsed OR hoveredOpen
  const isExpanded = !collapsed || hoveredOpen;

  /* Auto-open parent when pathname matches a child route */
  useEffect(() => {
    const activeParent = menuItems.find(
      (item: any) => item.children?.some((c: any) => pathname.startsWith(c.path))
    );
    if (activeParent) setOpenMenu(activeParent.name);
  }, [pathname]);

  /* Auto-collapse when user clicks on main content area removed as per user request */

  /* Hover handlers for auto-expand removed as per user request */
  const handleMouseEnter = useCallback(() => {
    // Intentionally empty
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Intentionally empty
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      setIsOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Automatically create a backup of database changes before logging out
      await fetch("/api/backup", { method: "POST" });
    } catch (error) {
      console.error("Auto-backup failed during logout:", error);
    }
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout API failed:", error);
    }
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "user_session=; path=/; max-age=0; SameSite=Lax";
    sessionStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    const mainEl = document.getElementById("main-content");
    if (mainEl && window.innerWidth >= 1024) {
      if (!isExpanded) {
        mainEl.classList.add("sidebar-collapsed");
      } else {
        mainEl.classList.remove("sidebar-collapsed");
      }
    } else if (mainEl) {
      mainEl.classList.remove("sidebar-collapsed");
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleOpen = () => {
      setCollapsed(false);
      setHoveredOpen(false);
    };
    document.addEventListener("open-sidebar", handleOpen);
    return () => document.removeEventListener("open-sidebar", handleOpen);
  }, []);

  return (
    <>
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`bg-[#0d1e3d] text-white transition-all duration-300 ease-in-out flex-shrink-0 z-[1000] no-scrollbar flex flex-col
          fixed top-0 bottom-0 right-0 h-screen overflow-y-auto
          lg:relative lg:top-auto lg:bottom-auto lg:right-auto lg:h-full lg:translate-x-0
          ${isExpanded ? "lg:w-[200px] w-[240px] lg:p-3" : "lg:w-[0px] w-[0px] lg:p-0 lg:overflow-hidden lg:opacity-0"}
          ${isOpenMobile ? "translate-x-0 p-3" : "translate-x-full lg:translate-x-0"}
        `}
      style={{
        // When hover-expanded, float over content instead of pushing it
        ...(hoveredOpen ? { position: 'fixed', right: 0, top: 0, bottom: 0, width: 220, zIndex: 1001, boxShadow: '-4px 0 24px rgba(0,0,0,0.25)' } : {}),
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => {
          if (window.innerWidth < 1024) {
            setIsOpenMobile(false);
          } else {
            setCollapsed(!collapsed);
            setHoveredOpen(false);
          }
        }}
        className={`w-full mb-3 rounded-xl border-none cursor-pointer bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center ${
          isExpanded ? "p-1.5 text-xl" : "p-2 text-lg"
        }`}
      >
        ☰
      </button>

      {isExpanded && (
        <div className="flex flex-col items-center py-4 mb-4 border-b border-white/5">
          <span className="font-extrabold text-2xl tracking-wider bg-gradient-to-r from-white to-[#a5b4fc] bg-clip-text text-transparent font-mono">
            HEMN ERP
          </span>
          <span className="text-[10px] font-bold text-[#818cf8] mt-1 tracking-widest font-mono">
            V 1
          </span>
        </div>
      )}

      <nav className="space-y-1.5">
        {menuItems.map((item: any) => {
          // Permission check: filter menu items
          if (item.perm && !hasPermission(item.perm, "canView")) return null;
          
          // Filter children by permission and role (restricted views)
          const visibleChildren = item.children?.filter((c: any) => {
            if (
              (c.path === "/reports/balance-sheet" || 
               c.path === "/reports/profit" || 
               c.path === "/reports/profit-distribution") && 
              currentUser?.role !== "admin"
            ) {
              return false;
            }
            return !c.perm || hasPermission(c.perm, "canView");
          });
          if (item.children && (!visibleChildren || visibleChildren.length === 0)) return null;
          
          const isActive = item.path ? pathname.startsWith(item.path) : visibleChildren?.some((c: any) => pathname.startsWith(c.path));
          const hasChildren = Boolean(visibleChildren && visibleChildren.length > 0);

          return (
            <div key={item.name}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    if (!isExpanded) {
                      // If collapsed and clicking a parent, expand first
                      setCollapsed(false);
                      setHoveredOpen(false);
                      setOpenMenu(item.name);
                    } else {
                      setOpenMenu(openMenu === item.name ? "" : item.name);
                    }
                  } else if (item.path) {
                    handleNavigate(item.path);
                  }
                }}
                title={item.name}
                className={`w-full py-2 rounded-xl border-none cursor-pointer text-white text-base font-bold transition-all ${
                  isExpanded ? "px-3" : "px-1"
                } ${
                  isActive ? "bg-[#233e72] shadow-md" : "bg-transparent hover:bg-[#172c54]"
                }`}
              >
                <div
                  className={`flex items-center w-full ${
                    isExpanded ? "justify-between" : "justify-center"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isExpanded ? "text-xl" : "text-lg"}>{item.icon}</span>
                    {isExpanded && <span className="text-sm font-semibold whitespace-nowrap">{item.name}</span>}
                  </div>
                  {isExpanded && hasChildren && (
                    <span className="text-[10px] opacity-60 font-normal mr-2">
                      {openMenu === item.name ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </button>

              {hasChildren && openMenu === item.name && isExpanded && (
                <div className="mr-4 mt-1.5 mb-2 space-y-1">
                  {visibleChildren!.map((child: any) => {
                    const isChildActive = pathname === child.path;
                    return (
                      <button
                        key={child.name}
                        onClick={() => handleNavigate(child.path)}
                        className={`w-full py-1.5 px-3 rounded-lg border-none cursor-pointer text-white text-xs text-right transition-colors ${
                          isChildActive ? "bg-[#233e72] font-bold shadow-inner" : "bg-[#172c54]/40 hover:bg-[#172c54]"
                        }`}
                      >
                        {child.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info */}
      {isExpanded && currentUser && (
        <div className="pt-2 pb-1 border-t border-white/10 mb-1">
          <div className="text-center text-xs text-gray-400 mb-1">{currentUser.name}</div>
        </div>
      )}

      {/* Logout button */}
      <div className="mt-auto pt-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`w-full py-2 rounded-xl border-none cursor-pointer bg-red-600 hover:bg-red-700 text-white text-base font-bold transition-all flex items-center justify-center gap-2 ${
            isExpanded ? "px-3.5 text-sm" : "px-1 text-lg"
          }`}
          title="چوونەدەرەوە"
        >
          <span>🚪</span>
          {isExpanded && <span className="whitespace-nowrap">چوونەدەرەوە</span>}
        </button>
      </div>
    </aside>

    </>
  );
}
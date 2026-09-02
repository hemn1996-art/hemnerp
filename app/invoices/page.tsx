"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore } from "../store/store";
import InvoicePage from "../components/InvoicePage";
import PurchasePage from "../components/PurchasePage";
import MoneyInPage from "../components/MoneyInPage";
import MoneyOutPage from "../components/MoneyOutPage";
import ExpensePage from "../components/ExpensePage";
import QuotationPage from "../components/QuotationPage";
import SalesReturnPage from "../components/SalesReturnPage";
import PurchaseReturnPage from "../components/PurchaseReturnPage";
import MyDebtPage from "../components/MyDebtPage";
import PeopleDebtPage from "../components/PeopleDebtPage";
import DebtDiscountPage from "../components/DebtDiscountPage";
import PeopleDebtDiscountPage from "../components/PeopleDebtDiscountPage";
import CashDepositPage from "../components/CashDepositPage";
import CashWithdrawalPage from "../components/CashWithdrawalPage";
import ProductTransferPage from "../components/ProductTransferPage";
import MaterialIssuePage from "../components/MaterialIssuePage";
import WarehouseDamagePage from "../components/WarehouseDamagePage";
import WarehouseStockPage from "../components/WarehouseStockPage";

const menuItems = [
  { label: "فرۆشتن",               value: "sales" },
  { label: "کڕین",                  value: "purchase" },
  { label: "پارەی ڕۆشتوو",         value: "money_out" },
  { label: "پارەی هاتوو",          value: "money_in" },
  { label: "خەرجی",                value: "expense" },
  { label: "نرخاندن",              value: "quotation" },
  { label: "گەڕانەوەی فرۆشتن",    value: "sales_return" },
  { label: "گەڕانەوەی کڕین",      value: "purchase_return" },
  { label: "من قەرزارم",             value: "my_debt" },
  { label: "قەرزم لای خەڵکە",          value: "people_debt" },
  { label: "داشکاندنم بۆ کراوە",  value: "my_debt_discount" },
  { label: "داشکاندنم کردوە", value: "people_debt_discount" },
  { label: "دانانی پارە",          value: "deposit" },
  { label: "کشانەوەی پارە",        value: "withdrawal" },
  { label: "گواستنەوەی کەرەستە",  value: "product_transfer" },
  { label: "سەرفی مەواد",          value: "material_issue" },
  { label: "زیانی کۆگا",           value: "warehouse_damage" },
  { label: "جەردی کۆگا",           value: "warehouse_stock" },
];

const itemPermMap: Record<string, string> = {
  sales: "vouchers_sales",
  purchase: "vouchers_purchase",
  money_out: "vouchers_money_out",
  money_in: "vouchers_money_in",
  expense: "vouchers_expense",
  quotation: "vouchers_sales",
  sales_return: "vouchers_sales_return",
  purchase_return: "vouchers_purchase_return",
  my_debt: "vouchers_my_debt",
  people_debt: "vouchers_people_debt",
  my_debt_discount: "vouchers_debt_discount_mine",
  people_debt_discount: "vouchers_debt_discount_people",
  deposit: "vouchers_cash_deposit",
  withdrawal: "vouchers_cash_withdrawal",
  product_transfer: "vouchers_product_transfer",
  material_issue: "vouchers_material_issue",
  warehouse_damage: "vouchers_warehouse_damage",
  warehouse_stock: "vouchers_warehouse_stock",
};

function InvoicesRouteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("editId");
  const urlType = searchParams.get("type");

  const currentUser = useStore((s: any) => s.currentUser);
  const hasPermission = useStore((s: any) => s.hasPermission);

  const allowedMenuItems = useMemo(() => {
    const isEdit = Boolean(editId);
    const action = isEdit ? "canUpdate" : "canCreate";

    if (!currentUser || currentUser.role === "admin" || hasPermission("vouchers", action)) {
      return menuItems;
    }
    const filtered = menuItems.filter((item: any) => {
      const permKey = itemPermMap[item.value];
      return permKey ? hasPermission(permKey, action) : false;
    });
    return filtered.length > 0 ? filtered : [];
  }, [currentUser, hasPermission, editId]);

  // Type mapping for DB types to tab values
  const typeMap: Record<string, string> = {
    "sales": "sales",
    "purchase": "purchase",
    "money_out": "money_out",
    "money_in": "money_in",
    "expense": "expense",
    "quotation": "quotation",
    "sales_return": "sales_return",
    "purchase_return": "purchase_return",
    "my_debt": "my_debt",
    "people_debt": "people_debt",
    "my_debt_discount": "my_debt_discount",
    "people_debt_discount": "people_debt_discount",
    "debt_discount": "people_debt_discount",
    "debt discount": "people_debt_discount",
    "shareholder_deposit": "deposit",
    "shareholder_withdrawal": "withdrawal",
    "product_transfer": "product_transfer",
    "material_issue": "material_issue",
    "warehouse_damage": "warehouse_damage",
    "warehouse_stock": "warehouse_stock",
    // Kurdish fallbacks
    "فرۆشتن": "sales",
    "کڕین": "purchase",
    "پارەی ڕۆشتوو": "money_out",
    "پارەی هاتوو": "money_in",
    "خەرجی": "expense",
    "گەڕانەوەی فرۆشتن": "sales_return",
    "گەڕانەوەی کڕین": "purchase_return",
    "نرخاندن": "quotation",
    "من قەرزارم": "my_debt",
    "من قەرزدارم": "my_debt",
    "قەرزم لای خەڵکە": "people_debt",
    "داشکاندنم بۆ کراوە": "my_debt_discount",
    "داشکاندنم کردوە": "people_debt_discount",
    "دانانی پارە": "deposit",
    "کشانەوەی پارە": "withdrawal",
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (urlType && typeMap[urlType]) {
      return typeMap[urlType];
    }
    return allowedMenuItems[0]?.value || "sales";
  });
  const [dbVoucherType, setDbVoucherType] = useState<string | null>(() => {
    if (urlType && typeMap[urlType]) return typeMap[urlType];
    return null;
  });
  const [isOpen, setIsOpen]       = useState(false);
  const [pendingTab, setPendingTab] = useState<{ value: string; isEdit: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to clear editId from URL and navigate clean
  function clearEditId(newType?: string) {
    const tab = newType || activeTab;
    router.push(`/invoices?type=${tab}`);
  }

  // Sync activeTab if urlType changes in URL
  useEffect(() => {
    if (urlType && typeMap[urlType]) {
      setActiveTab(typeMap[urlType]);
    } else if (allowedMenuItems.length > 0 && !allowedMenuItems.some(m => m.value === activeTab)) {
      setActiveTab(allowedMenuItems[0].value);
    }
  }, [urlType, allowedMenuItems]);

  useEffect(() => {
    if (editId) {
      // Fetch voucher from database to know its actual type
      fetch(`/api/vouchers/${editId}`)
        .then((res) => res.json())
        .then((voucher) => {
          if (voucher && voucher.type) {
            const dbType = typeMap[voucher.type] || voucher.type;
            setDbVoucherType(dbType);
            setActiveTab(dbType);
          }
        })
        .catch((err) => console.error("Error fetching edit voucher:", err));
    } else {
      setDbVoucherType(null);
    }
  }, [editId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canPerformActionOnTab = (tab: string, isEdit: boolean): boolean => {
    if (!currentUser || currentUser.role === "admin") return true;
    const action = isEdit ? "canUpdate" : "canCreate";
    if (hasPermission("vouchers", action)) return true;
    const permModule = itemPermMap[tab];
    if (!permModule) return true;
    return hasPermission(permModule, action);
  };

  const activeItem = allowedMenuItems.find((m: any) => m.value === activeTab) ?? allowedMenuItems[0] ?? menuItems[0];

  const renderActiveComponent = () => {
    const editIdProp = editId || undefined;
    switch (activeTab) {
      case "sales":               return <InvoicePage invoiceType="فرۆشتن" editId={editIdProp} />;
      case "purchase":            return <PurchasePage editId={editIdProp} />;
      case "money_in":            return <MoneyInPage editId={editIdProp} />;
      case "money_out":           return <MoneyOutPage editId={editIdProp} />;
      case "expense":             return <ExpensePage editId={editIdProp} />;
      case "quotation":           return <QuotationPage editId={editIdProp} />;
      case "sales_return":        return <SalesReturnPage editId={editIdProp} />;
      case "purchase_return":     return <PurchaseReturnPage editId={editIdProp} />;
      case "my_debt":             return <MyDebtPage editId={editIdProp} />;
      case "people_debt":         return <PeopleDebtPage editId={editIdProp} />;
      case "my_debt_discount":    return <DebtDiscountPage editId={editIdProp} />;
      case "people_debt_discount":return <PeopleDebtDiscountPage editId={editIdProp} />;
      case "deposit":             return <CashDepositPage editId={editIdProp} />;
      case "withdrawal":          return <CashWithdrawalPage editId={editIdProp} />;
      case "product_transfer":    return <ProductTransferPage editId={editIdProp} />;
      case "material_issue":      return <MaterialIssuePage editId={editIdProp} />;
      case "warehouse_damage":    return <WarehouseDamagePage editId={editIdProp} />;
      case "warehouse_stock":     return <WarehouseStockPage editId={editIdProp} />;
      default:                    return <InvoicePage invoiceType="فرۆشتن" editId={editIdProp} />;
    }
  };

  return (
    <div className="flex flex-col h-full rtl">

      {/* ── Top bar — dropdown lives here (outside scrollable area) ── */}
      <div
        ref={dropdownRef}
        className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shadow-sm flex-shrink-0"
        style={{ position: "relative", zIndex: 200, overflow: "visible" }}
      >
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
          className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
          title="گەورەکردنی سایدبار"
        >
          ☰
        </button>
        <h1 className="text-2xl font-black text-gray-900 m-0">پسوڵە</h1>

        {/* Trigger — always clickable, even in edit mode */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="bg-transparent border-none text-gray-900 font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 select-none hover:bg-gray-100 cursor-pointer text-xl"
        >
          <span>
            {activeItem.label}
            {editId && dbVoucherType === activeTab && (
              <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mr-2">
                (دەستکاریکردن)
              </span>
            )}
          </span>
          <span className="text-xs text-gray-400 font-normal">{isOpen ? "▲" : "▼"}</span>
        </button>

        {/* ── Top bar explanation banner for all 4 debt vouchers ── */}
        {activeTab === "people_debt" && (
          <div className="mr-2 bg-sky-50 border border-sky-200 text-sky-800 text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs select-none">
            <span>💡 ئەم باڵانسە کە داغڵ ئەکرێت ئەچێتە سەر باڵانسی هەژمار و ئەو قەرزاری تۆ ئەبێت.</span>
          </div>
        )}
        {activeTab === "my_debt" && (
          <div className="mr-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs select-none">
            <span>💡 ئەم باڵانسە کە داغڵ ئەکرێت ئەچێتە سەر باڵانسی هەژمار و تۆ قەرزاری ئەو دەبیت.</span>
          </div>
        )}
        {activeTab === "people_debt_discount" && (
          <div className="mr-2 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs select-none">
            <span>💡 داشکاندن لە قەرزی کەسێک کە قەرزداری ئێمەیە (زیانی ئێمەیە).</span>
          </div>
        )}
        {activeTab === "my_debt_discount" && (
          <div className="mr-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs select-none">
            <span>💡 داشکاندن لە قەرزی ئێمە کە قەرزداری کەسێکین (قازانجی ئێمەیە).</span>
          </div>
        )}

        {/* Dropdown — tall 2-column grid, no scroll */}
        {isOpen && (
          <div
            style={{
              position:   "absolute",
              top:        "100%",
              right:      0,
              zIndex:     9999,
              marginTop:  6,
              background: "#fff",
              border:     "1px solid #e2e8f0",
              borderRadius: 18,
              boxShadow:  "0 12px 40px rgba(0,0,0,0.14)",
              padding:    12,
              display:              "grid",
              gridTemplateColumns:  allowedMenuItems.length > 1 ? "1fr 1fr" : "1fr",
              gap:                  6,
              width:                allowedMenuItems.length > 1 ? 340 : 200,
            }}
          >
            {allowedMenuItems.map((item: any) => {
              const active = item.value === activeTab;
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    const checkFn = (window as any).hasUnsavedChanges;
                    if (typeof checkFn === "function") {
                      const checkResult = checkFn();
                      if (checkResult.unsaved) {
                        setPendingTab({
                          value: item.value,
                          isEdit: checkResult.isEdit
                        });
                        setIsOpen(false);
                        return;
                      }
                    }

                    setActiveTab(item.value);
                    setIsOpen(false);
                    if (editId && dbVoucherType === item.value) {
                      router.push(`/invoices?editId=${editId}&type=${item.value}`);
                    } else {
                      router.push(`/invoices?type=${item.value}`);
                    }
                  }}
                  style={{
                    display:     "block",
                    width:       "100%",
                    textAlign:   "right",
                    padding:     "9px 14px",
                    borderRadius: 10,
                    border:      "none",
                    background:  active ? "#1e3a8a" : "transparent",
                    color:       active ? "#fff" : "#1e293b",
                    fontWeight:  active ? 900 : 600,
                    fontSize:    13,
                    cursor:      "pointer",
                    transition:  "background .14s",
                    whiteSpace:  "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {!canPerformActionOnTab(activeTab, Boolean(editId)) && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 text-center text-amber-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm select-none">
            <span>🔒</span>
            <span>
              {editId
                ? "ئاگاداری: تۆ دەسەڵاتی نوێکردنەوە/دەستکاریکردنی ئەم پسووڵەیەت نییە، تەنها لە باری بینیندایت (View Only)."
                : "ئاگاداری: تۆ دەسەڵاتی دروستکردنی ئەم پسووڵەیەت نییە، تەنها لە باری بینیندایت (View Only)."}
            </span>
          </div>
        )}
        {!canPerformActionOnTab(activeTab, Boolean(editId)) ? (
          <fieldset disabled style={{ border: "none", padding: 0, margin: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {renderActiveComponent()}
          </fieldset>
        ) : (
          renderActiveComponent()
        )}
      </div>
      {pendingTab && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
        }}>
          <div style={{
            background: "#ffffff",
            padding: 30,
            borderRadius: 20,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            width: "90%",
            maxWidth: 550,
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 16
            }}>
              ⚠️
            </div>

            <h2 style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#1e293b",
              margin: "0 0 12px 0",
              lineHeight: "1.4"
            }}>
              {pendingTab.isEdit 
                ? "تۆ ئەم پسوڵەیەت نوێ نەکردووەتەوە."
                : "تۆ ئەم پسوڵەیەت خەزن نەکردوە."
              }
            </h2>
            <p style={{
              fontSize: 16,
              color: "#64748b",
              margin: "0 0 28px 0",
              fontWeight: 500
            }}>
              دەتەوێت چی بکەیت؟
            </p>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              <button
                onClick={() => {
                  const targetTab = pendingTab.value;
                  setPendingTab(null);
                  setActiveTab(targetTab);
                  if (editId && dbVoucherType === targetTab) {
                    router.push(`/invoices?editId=${editId}&type=${targetTab}`);
                  } else {
                    router.push(`/invoices?type=${targetTab}`);
                  }
                }}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 20px",
                  fontSize: 17,
                  fontWeight: 900,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                بڕۆ بۆ پسووڵەی تر
              </button>
              
              <button
                onClick={() => setPendingTab(null)}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "14px 20px",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                بگەڕێوە سەر پسووڵەکە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400">چاوەڕێ بکە... 🔄</div>}>
      <InvoicesRouteContent />
    </Suspense>
  );
}

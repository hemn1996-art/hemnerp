"use client";

import MultiSelectDropdown from "../../components/MultiSelectDropdown";
import React, { useEffect, useState, useRef } from "react";
import { useStore } from "../../store/store";
import { useRouter } from "next/navigation";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";
import DateInput from "../../components/DateInput";

interface DropdownOption {
  value: string | number;
  label: string;
}



export default function ItemsReportPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportStats, setShowReportStats] = useState(true);

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

  // Voucher Details
  const [filterVoucherTypes, setFilterVoucherTypes] = useState<string[]>([]);
  const [voucherReference, setVoucherReference] = useState("");

  // Item Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProductIds, setFilterProductIds] = useState<number[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  const [itemCode, setItemCode] = useState("");
  const [batchCode, setBatchCode] = useState("");

  // Account Filters
  const [filterAccountIds, setFilterAccountIds] = useState<number[]>([]);
  const [filterAccountTypeIds, setFilterAccountTypeIds] = useState<number[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Secondary Filters
  const [currencyId, setCurrencyId] = useState("all");
  const [filterWarehouseIds, setFilterWarehouseIds] = useState<number[]>([]);
  const [label, setLabel] = useState("all");
  const [filterCreatedBys, setFilterCreatedBys] = useState<string[]>([]);

  // Display Options
  const [profitStatus, setProfitStatus] = useState("all");
  const [isGift, setIsGift] = useState("all");
  const [groupReverse, setGroupReverse] = useState("all");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  const defaultMatCols = {
    voucherReference: true,
    voucherType: true,
    accountName: true,
    productName: true,
    category: true,
    brand: true,
    warehouseName: true,
    cost: true,
    quantity: true,
    price: true,
    offers: false,
    discount: true,
    lineTotal: true,
    profit: false,
    date: true,
  };
  const [visibleColumns, setVisibleColumns] = useState(defaultMatCols);
  const colsLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_mat_movements_cols");
      if (stored) {
        setVisibleColumns(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.error(e);
    }
    colsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!colsLoadedRef.current) return;
    try {
      localStorage.setItem("__erp_mat_movements_cols", JSON.stringify(visibleColumns));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns]);

  const { 
    accounts, fetchAccounts, 
    products, fetchProducts,
    accountTypes, fetchAccountTypes,
    currencies, fetchCurrencies,
    warehouses, fetchWarehouses,
    invoices, fetchInvoices
  } = useStore() as any;

  useEffect(() => {
    fetchAccounts?.();
    fetchProducts?.();
    fetchAccountTypes?.();
    fetchCurrencies?.();
    fetchWarehouses?.();
    fetchInvoices?.();

    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.showReportStats === "boolean") {
          setShowReportStats(parsed.showReportStats);
        }
      } catch (e) {}
    }
  }, [fetchAccounts, fetchProducts, fetchAccountTypes, fetchCurrencies, fetchWarehouses, fetchInvoices]);

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/attributes?type=category")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategoriesList(data);
      })
      .catch((err) => console.error(err));

    fetch("/api/attributes?type=brand")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBrandsList(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const categoryOptions = React.useMemo(() => {
    const list: string[] = [];
    categoriesList.forEach((c: any) => {
      const name = typeof c === "string" ? c : c?.name;
      if (name && !list.includes(name)) list.push(name);
    });
    (products || []).forEach((p: any) => {
      if (p.category && !list.includes(p.category)) list.push(p.category);
    });
    return list;
  }, [categoriesList, products]);

  const brandOptions = React.useMemo(() => {
    const list: string[] = [];
    brandsList.forEach((b: any) => {
      const name = typeof b === "string" ? b : b?.name;
      if (name && !list.includes(name)) list.push(name);
    });
    (products || []).forEach((p: any) => {
      if (p.brand && !list.includes(p.brand)) list.push(p.brand);
    });
    return list;
  }, [brandsList, products]);

  const employeeOptions = React.useMemo(() => {
    if (!invoices) return [];
    const fromVouchers = invoices.map((v: any) => v.employeeName).filter(Boolean) as string[];
    const defaults = ["کۆساری مەلا فەرهاد", "کاک زاھیر ھەڵەبجە", "کۆسار کۆگای دۆستان", "هێمن حەمە فەرهاد"];
    return Array.from(new Set([...defaults, ...fromVouchers]));
  }, [invoices]);

  useEffect(() => {
    fetchItems();
  }, [startDate, endDate]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);
      
      if (voucherReference) query.append("voucherReference", voucherReference);
      
      if (filterProductIds.length > 0) query.append("productId", filterProductIds.join(","));
      if (filterCategories.length > 0) query.append("category", filterCategories.join(","));
      if (filterBrands.length > 0) query.append("brand", filterBrands.join(","));
      if (batchCode) query.append("batchCode", batchCode);

      if (filterAccountIds.length > 0) query.append("accountId", filterAccountIds.join(","));
      if (filterAccountTypeIds.length > 0) query.append("accountTypeId", filterAccountTypeIds.join(","));

      if (currencyId !== "all") query.append("currencyId", currencyId);
      if (filterWarehouseIds.length > 0) query.append("warehouseId", filterWarehouseIds.join(","));
      if (filterCreatedBys.length > 0) query.append("createdBy", filterCreatedBys.join(","));
      
      if (profitStatus !== "all") query.append("profitStatus", profitStatus);
      if (isGift !== "all") query.append("isGift", isGift);

      const res = await fetch(`/api/reports/material-movements?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => {
          const sign = (item.voucherType === "sales_return" || item.voucherType === "purchase_return") ? -1 : 1;
          return {
            ...item,
            quantity: (item.quantity || 0) * sign,
            lineTotal: (item.lineTotal || 0) * sign,
          };
        });
        setItems(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filterVoucherTypes.length > 0) count++;
    if (voucherReference) count++;
    if (filterProductIds.length > 0) count++;
    if (filterCategories.length > 0) count++;
    if (filterBrands.length > 0) count++;
    if (itemCode) count++;
    if (batchCode) count++;
    if (filterAccountIds.length > 0) count++;
    if (filterAccountTypeIds.length > 0) count++;
    if (currencyId !== "all") count++;
    if (filterWarehouseIds.length > 0) count++;
    if (label !== "all" && label !== "") count++;
    if (filterCreatedBys.length > 0) count++;
    if (profitStatus !== "all") count++;
    if (isGift !== "all") count++;
    if (groupReverse !== "all") count++;
    return count;
  }, [
    filterVoucherTypes, voucherReference, filterProductIds, filterCategories, filterBrands, itemCode, batchCode,
    filterAccountIds, filterAccountTypeIds, currencyId, filterWarehouseIds, label, filterCreatedBys,
    profitStatus, isGift, groupReverse
  ]);

  const handleResetFilters = () => {
    setFilterVoucherTypes([]);
    setVoucherReference("");
    setFilterProductIds([]);
    setFilterCategories([]);
    setFilterBrands([]);
    setItemCode("");
    setBatchCode("");
    setFilterAccountIds([]);
    setFilterAccountTypeIds([]);
    setCurrencyId("all");
    setFilterWarehouseIds([]);
    setLabel("all");
    setFilterCreatedBys([]);
    setProfitStatus("all");
    setIsGift("all");
    setGroupReverse("all");
    setTimeout(() => {
      fetchItems();
    }, 0);
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    fetchItems();
  };

  const translateVoucherType = (type: string) => {
    switch (type) {
      case "sales": return "فرۆشتن";
      case "purchase": return "کڕین";
      case "sales_return": return "گەڕانەوەی فرۆشتن";
      case "purchase_return": return "گەڕانەوەی کڕین";
      case "inventory_in": return "هاتنەناوەوە";
      case "inventory_out": return "چوونەدەرەوە";
      case "expense": return "خەرجی";
      case "money_in": return "پارەی هاتوو";
      case "money_out": return "پارەی ڕۆشتوو";
      case "quotation": return "نرخاندن";
      case "cashbox_transfer": return "گواستنەوەی پارە";
      case "cashbox_exchange": return "گۆڕینەوەی پارە";
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

  const showSalesReturnNotice = React.useMemo(() => {
    return filterVoucherTypes.length === 1 && filterVoucherTypes[0] === "sales" && items.some((item: any) => item.voucherType === "sales_return");
  }, [filterVoucherTypes, items]);

  const showPurchaseReturnNotice = React.useMemo(() => {
    return filterVoucherTypes.length === 1 && filterVoucherTypes[0] === "purchase" && items.some((item: any) => item.voucherType === "purchase_return");
  }, [filterVoucherTypes, items]);

  const filteredItems = React.useMemo(() => {
    let result = items;
    if (filterVoucherTypes.length > 0) {
      result = result.filter((item: any) => filterVoucherTypes.includes(item.voucherType));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((item: any) => 
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.productCode && String(item.productCode).toLowerCase().includes(q)) ||
        (item.barcode && String(item.barcode).toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.note && item.note.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filterVoucherTypes, searchTerm]);

  const paginatedItems = React.useMemo(() => {
    if (pageSize >= 100000) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  const getQtyCardLabel = () => {
    const hasSales = filterVoucherTypes.includes("sales") || filterVoucherTypes.includes("sales_return");
    const hasPurchases = filterVoucherTypes.includes("purchase") || filterVoucherTypes.includes("purchase_return");
    const hasOthers = filterVoucherTypes.some(t => t !== "sales" && t !== "sales_return" && t !== "purchase" && t !== "purchase_return");

    if (filterVoucherTypes.length > 0 && hasSales && !hasPurchases && !hasOthers) {
      return "کۆی گشتی دەرچوو لە کۆگا";
    }
    if (filterVoucherTypes.length > 0 && hasPurchases && !hasSales && !hasOthers) {
      return "کۆی گشتی هاتوو بۆ کۆگا";
    }
    return "کۆی گشتی کەرەستە";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatCurrency = (amount: number | string, itemCurId?: number, itemSymbol?: string, itemCode?: string) => {
    const num = Number(amount || 0);
    if (isNaN(num)) return "-";
    const curObj = (currencies || []).find((c: any) => c.id === itemCurId);
    const code = itemCode || curObj?.code;
    const symbol = itemSymbol || curObj?.symbol || curObj?.name || "";

    const isNegative = num < 0;
    const isIQD = code === "IQD" || symbol === "دینار" || symbol === "د.ع";
    if (isIQD) {
      const roundedVal = Math.round(num).toLocaleString("en-US");
      return <span className={isNegative ? "text-rose-600 font-bold" : ""}>{roundedVal} دینار</span>;
    }

    const absNum = Math.abs(num);
    const formattedNumber = absNum.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    const parts = formattedNumber.split(".");
    const whole = parts[0];
    const decimal = parts[1];
    const displaySymbol = symbol || "$";

    return (
      <span className={isNegative ? "text-rose-600 font-bold" : ""} style={{ display: "inline-flex", alignItems: "baseline", gap: "2px" }} dir="ltr">
        {isNegative && <span>-</span>}
        <span style={{ fontSize: "0.85em", opacity: 0.8 }}>{displaySymbol}</span>
        <span>
          <span>{whole}</span>
          {decimal && decimal !== "0" && decimal !== "00" && (
            <span style={{ fontSize: "0.7em", opacity: 0.8 }}>.{decimal}</span>
          )}
        </span>
      </span>
    );
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-ckb text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">ڕاپۆرتی جووڵەی کەرەستە</h1>
            <p className="text-[11px] text-slate-500 font-medium">چاودێری وردی هاتن و دەرچوون و جووڵەی کەرەستەکان</p>
          </div>
        </div>

        {/* Search Bar and Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
          {/* Direct Real-time Material Search Input */}
          <div className="relative min-w-[240px] max-w-[340px] w-full sm:w-auto">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="گەڕان بەدوای ناوی کەرەستە، کۆد، بارکۆد..."
              className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl pr-9 pl-8 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 hover:text-rose-500 transition"
                title="پاککردنەوە"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Dates */}
          <div className="flex items-center gap-2">
            <DateInput value={startDate} onChange={setStartDate} label="لە بەرواری" />
            <DateInput value={endDate} onChange={setEndDate} label="تا بەرواری" />
          </div>

          <button onClick={() => setShowFilterModal(true)} className="flex items-center gap-2 bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition shadow-sm">
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
            <button onClick={handleResetFilters} className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition shadow-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>ڕێکخستنەوە</span>
            </button>
          )}
          
          <button
            onClick={() => setShowColumnsModal(true)}
            className="flex items-center gap-2 text-white font-black px-3.5 py-2 rounded-xl text-xs transition-transform hover:scale-105 cursor-pointer shadow-sm border-none"
            style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#bae6fd" }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
            <span>کۆڵۆمەکان</span>
          </button>
          
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>پرینت</span>
          </button>

          <button onClick={() => exportTableToExcel("material-movements-table", "jwlay_kerestekan.xlsx")}
            className="flex items-center gap-1.5 bg-emerald-600 border border-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer border-none shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>ناردن بۆ ئێکسڵ</span>
          </button>
        </div>
      </div>

      <div id="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی جووڵەی کەرەستە</h2>
        </div>

        {/* Summary Row */}
        {showReportStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 animate-in fade-in duration-200">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-r-4 border-r-blue-500 flex flex-col justify-center items-center">
              <p className="text-2xl font-bold text-slate-800">{filteredItems.reduce((s, i) => s + i.quantity, 0).toLocaleString("en-US")} عدد</p>
              <p className="text-xs text-slate-500 mt-1">{getQtyCardLabel()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-r-4 border-r-indigo-500 flex flex-col justify-center items-center">
              <p className="text-2xl font-bold text-slate-800">{filteredItems.length.toLocaleString("en-US")} جووڵە</p>
              <p className="text-xs text-slate-500 mt-1">کۆی ژمارەی تۆمارکراوەکان</p>
            </div>
          </div>
        )}

      {/* Notice Banners */}
      {showSalesReturnNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm no-print text-right mb-4" dir="rtl">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-black text-sm text-amber-950 m-0">تێبینی: پسووڵەی گەڕانەوەی فرۆشتن هەیە لەم ماوەیەدا بۆ کەرەستەکان</h4>
              <p className="text-xs text-amber-800 m-0 mt-1 font-bold">بۆ پیشاندانی پسووڵەکانی گەڕانەوەی فرۆشتن لەگەڵ فرۆشتنەکان، کلیک لەسەر دوگمەی بەرامبەر بکە.</p>
            </div>
          </div>
          <button
            onClick={() => setFilterVoucherTypes(["sales", "sales_return"])}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer transition-all shadow-sm shrink-0"
          >
            پیشاندانی گەڕانەوەی فرۆشتن 🔄
          </button>
        </div>
      )}

      {showPurchaseReturnNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm no-print text-right mb-4" dir="rtl">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-black text-sm text-amber-950 m-0">تێبینی: پسووڵەی گەڕانەوەی کڕین هەیە لەم ماوەیەدا بۆ کەرەستەکان</h4>
              <p className="text-xs text-amber-800 m-0 mt-1 font-bold">بۆ پیشاندانی پسووڵەکانی گەڕانەوەی کڕین لەگەڵ کڕینەکان، کلیک لەسەر دوگمەی بەرامبەر بکە.</p>
            </div>
          </div>
          <button
            onClick={() => setFilterVoucherTypes(["purchase", "purchase_return"])}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer transition-all shadow-sm shrink-0"
          >
            پیشاندانی گەڕانەوەی کڕین 🔄
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table id="material-movements-table" className="w-full text-[11px] text-right">
            <thead className="bg-[#1e293b] text-white sticky top-0 z-10 border-b-4 border-slate-700">
              <tr>
                {visibleColumns.voucherReference && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center w-20">پسوولە ↑</th>}
                {visibleColumns.voucherType && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">جۆر</th>}
                {visibleColumns.accountName && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">هەژمار</th>}
                {visibleColumns.productName && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center allow-wrap">کەرەستە</th>}
                {visibleColumns.category && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">کاتیگۆری</th>}
                {visibleColumns.brand && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">براند</th>}
                {visibleColumns.warehouseName && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">کۆگا</th>}
                {visibleColumns.cost && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">کۆست</th>}
                {visibleColumns.quantity && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">عدد</th>}
                {visibleColumns.price && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">نرخ</th>}
                {visibleColumns.offers && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">ئۆفەرەکان</th>}
                {visibleColumns.discount && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">داشکاندن</th>}
                {visibleColumns.lineTotal && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center bg-slate-700">گشتی</th>}
                {visibleColumns.profit && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center bg-slate-700 text-green-300">قازانج</th>}
                {visibleColumns.date && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">بەروار</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} className="p-8 text-center text-slate-500 text-sm">خەریکی هێنانی داتاکانە...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={15} className="p-8 text-center text-slate-500 text-sm">هیچ داتایەک نەدۆزرایەوە بەپێی ئەم فلتەرانە.</td></tr>
              ) : (
                paginatedItems.map((item, i) => (
                  <tr key={item.id} className={`border-b border-slate-200 hover:bg-slate-100 transition ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                    {visibleColumns.voucherReference && (
                      <td className="p-2 border-r border-slate-200 text-center">
                        <span 
                          onClick={() => router.push(`/invoices?editId=${item.voucherId}&type=${item.voucherType}`)}
                          className="bg-[#1e40af] text-white px-3 py-1 rounded text-[10px] font-bold cursor-pointer hover:bg-blue-800 transition"
                          title="کردنەوەی پسوولە"
                        >
                          {item.voucherReference}
                        </span>
                      </td>
                    )}
                    {visibleColumns.voucherType && <td className="p-2 border-r border-slate-200 text-center font-medium text-slate-600">{translateVoucherType(item.voucherType)}</td>}
                    {visibleColumns.accountName && (
                      <td className="p-2 border-r border-slate-200 text-center">
                        {item.accountId ? (
                          <span
                            onClick={() => router.push(`/reports/account-statement?accountId=${item.accountId}`)}
                            className="text-blue-700 font-bold hover:underline cursor-pointer transition"
                            title="پیشاندانی ڕاپۆرتی حیساب"
                          >
                            {item.accountName}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">{item.accountName}</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.productName && (
                      <td className="p-2 border-r border-slate-200 text-center allow-wrap">
                        <button
                          onClick={() => router.push(`/materials?edit=${item.productId}`)}
                          className="text-slate-800 font-bold hover:text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer text-center inline-block text-[11px]"
                          title="دەستکاری کردنی کەرەستە"
                        >
                          {item.productName}
                        </button>
                      </td>
                    )}
                    {visibleColumns.category && <td className="p-2 border-r border-slate-200 text-center text-slate-500">{item.category}</td>}
                    {visibleColumns.brand && <td className="p-2 border-r border-slate-200 text-center text-slate-500">{item.brand}</td>}
                    {visibleColumns.warehouseName && <td className="p-2 border-r border-slate-200 text-center text-slate-500">{item.warehouseName}</td>}
                    {visibleColumns.cost && <td className="p-2 border-r border-slate-200 text-center text-slate-600 font-medium">{formatCurrency(item.cost, item.costCurrencyId || item.currencyId, item.costCurrencySymbol, item.costCurrencyCode)}</td>}
                    {visibleColumns.quantity && (
                      <td className={`p-2 border-r border-slate-200 text-center font-bold ${item.quantity < 0 ? "text-rose-600" : "text-slate-700"}`}>
                        {item.quantity.toLocaleString("en-US")} دانە
                      </td>
                    )}
                    {visibleColumns.price && <td className="p-2 border-r border-slate-200 text-center text-slate-600 font-medium">{formatCurrency(item.price, item.priceCurrencyId || item.currencyId, item.priceCurrencySymbol, item.priceCurrencyCode)}</td>}
                    {visibleColumns.offers && <td className="p-2 border-r border-slate-200 text-center text-slate-400">-</td>}
                    {visibleColumns.discount && <td className="p-2 border-r border-slate-200 text-center text-slate-600">{item.discount > 0 ? formatCurrency(item.discount, item.priceCurrencyId || item.currencyId, item.priceCurrencySymbol, item.priceCurrencyCode) : '-'}</td>}
                    {visibleColumns.lineTotal && (
                      <td className={`p-2 border-r border-slate-200 text-center bg-slate-50 font-bold ${item.lineTotal < 0 ? "text-rose-600" : "text-slate-800"}`}>
                        {formatCurrency(item.lineTotal, item.lineTotalCurrencyId || item.priceCurrencyId || item.currencyId, item.lineTotalCurrencySymbol || item.priceCurrencySymbol, item.lineTotalCurrencyCode || item.priceCurrencyCode)}
                      </td>
                    )}
                    {visibleColumns.profit && (
                      <td className={`p-2 border-r border-slate-200 text-center bg-green-50 font-bold ${item.profit < 0 ? "text-rose-600" : "text-green-700"}`}>
                        {formatCurrency(item.profit, item.profitCurrencyId || 1, item.profitCurrencySymbol || "$", item.profitCurrencyCode || "USD")}
                      </td>
                    )}
                    {visibleColumns.date && <td className="p-2 border-r border-slate-200 text-center text-slate-500 text-[10px]">{formatDate(item.date)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredItems.length > 0 && (
          <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white no-print text-xs">
            <div className="text-slate-600 font-bold flex items-center gap-2">
              <span>کۆی گشتی:</span>
              <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded font-black border border-slate-200 text-sm">
                {filteredItems.length.toLocaleString("en-US")}
              </span>
              {pageSize < 100000 && (
                <span className="text-slate-500 font-medium mr-2">
                  (پیشاندانی {Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)} تا {Math.min(filteredItems.length, currentPage * pageSize)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1 || pageSize >= 100000}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center cursor-pointer shadow-sm text-base"
                  title="پێشوو"
                >
                  ‹
                </button>
                <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                  {currentPage} لە {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages || pageSize >= 100000}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center cursor-pointer shadow-sm text-base"
                  title="دواتر"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                <span className="text-slate-600 font-bold">ژمارەی ڕیزەکان:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                >
                  <option value={50}>٥٠ دانە</option>
                  <option value={100}>١٠٠ دانە</option>
                  <option value={1000}>١٠٠٠ دانە</option>
                  <option value={1000000}>هەموو</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      </div>

      {/* Columns Modal */}
      {showColumnsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowColumnsModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0f172a] p-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#38bdf8" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                </svg>
                <h2 className="font-bold text-sm m-0">کۆڵۆمە دیاریکراوەکان</h2>
              </div>
              <button onClick={() => setShowColumnsModal(false)} className="text-slate-400 hover:text-white bg-transparent border-none text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-2 flex flex-col max-h-[60vh] overflow-y-auto">
              {Object.entries({
                voucherReference: "پسوولە",
                voucherType: "جۆر",
                accountName: "هەژمار",
                productName: "کەرەستە",
                category: "کاتیگۆری",
                brand: "براند",
                warehouseName: "کۆگا",
                cost: "کۆست",
                quantity: "عدد",
                price: "نرخ",
                offers: "ئۆفەرەکان",
                discount: "داشکاندن",
                lineTotal: "گشتی",
                profit: "قازانج",
                date: "بەروار",
              }).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-0">
                  <span className="text-[13px] font-medium text-slate-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                    onChange={(e) => setVisibleColumns((prev: any) => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 bg-[#0f172a] text-white py-2 rounded text-xs font-bold hover:bg-slate-800 transition">جێبەجێکردن</button>
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 text-slate-600 py-2 rounded text-xs font-bold hover:bg-slate-200 transition">پاشگەزبوونەوە</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-slate-300">✕</button>
                <h2 className="font-bold text-lg">ئۆپشنەکانی فلتەرکردن</h2>
              </div>
              <button className="text-white hover:text-slate-300 flex items-center gap-2 text-sm">
                <span>لابردنی هەموو</span> 
                <span className="text-lg">FilterX</span>
              </button>
            </div>
            
            <div className="p-6 max-h-[75vh] overflow-y-auto bg-white text-right space-y-8">
              
              {/* Custom CSS for Material Outline inputs */}
              <style dangerouslySetInnerHTML={{__html: `
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 12px; padding: 13px 16px; background: white; transition: border-color 0.2s; }
                .mui-outline:focus-within { border-color: #3b82f6; }
                .mui-outline label { position: absolute; top: -10px; right: 12px; background: white; padding: 0 6px; color: #475569; font-size: 11px; font-weight: bold; }
                .mui-outline input, .mui-outline select { width: 100%; border: none; outline: none; background: transparent; font-size: 14px; color: #1e293b; font-weight: bold; cursor: pointer; }
                .section-title { display: flex; align-items: center; gap: 8px; color: #0f172a; font-weight: 900; font-size: 13px; margin-bottom: 16px; }
                .section-title::before { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
              `}} />

              {/* Section 1: Dates */}
              <div>
                <div className="section-title text-slate-600 flex-row-reverse">مەودای بەروار <span className="text-lg">📅</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DateInput value={startDate} onChange={setStartDate} label="بەرواری دەستپێک" />
                  <DateInput value={endDate} onChange={setEndDate} label="بەرواری کۆتایی" />
                </div>
              </div>

              {/* Section 2: Voucher Details */}
              <div>
                <div className="section-title flex-row-reverse">وردەکاری پسووڵە <span className="text-lg">📄</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <MultiSelectDropdown
                      label="پسووڵە"
                      options={[
                        { value: "sales", label: "فرۆشتن" },
                        { value: "purchase", label: "کڕین" },
                        { value: "sales_return", label: "گەڕانەوەی فرۆشتن" },
                        { value: "purchase_return", label: "گەڕانەوەی کڕین" },
                        { value: "inventory_in", label: "هاتنەناوەوە" },
                        { value: "inventory_out", label: "چوونەدەرەوە" },
                        { value: "material_issue", label: "سەرفی مەواد" },
                        { value: "warehouse_damage", label: "زیانی کۆگا" },
                        { value: "warehouse_stock", label: "جەردی کۆگا" },
                        { value: "product_transfer", label: "گواستنەوەی کەرەستە" }
                      ]}
                      selectedValues={filterVoucherTypes}
                      onChange={setFilterVoucherTypes}
                    />
                  </div>
                  <div className="mui-outline">
                    <label>ژمارەی پسووڵە</label>
                    <input
                      type="text"
                      placeholder="ژمارەی پسووڵە بنووسە..."
                      value={voucherReference}
                      onChange={e => setVoucherReference(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Item Filter */}
              <div>
                <div className="section-title flex-row-reverse">فلتەری کەرەستە <span className="text-lg">📦</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <MultiSelectDropdown
                      label="براند"
                      options={brandOptions.map((bName) => ({ value: bName, label: bName }))}
                      selectedValues={filterBrands}
                      onChange={setFilterBrands}
                      searchable
                    />
                  </div>
                  <div>
                    <MultiSelectDropdown
                      label="کاتیگۆری"
                      options={categoryOptions.map((cName) => ({ value: cName, label: cName }))}
                      selectedValues={filterCategories}
                      onChange={setFilterCategories}
                      searchable
                    />
                  </div>
                  <div className="mui-outline">
                    <label>کۆد</label>
                    <input type="text" value={itemCode} onChange={e => setItemCode(e.target.value)} />
                  </div>
                  <div>
                    <MultiSelectDropdown
                      label="کەرەستە"
                      options={products?.map((p: any) => ({ value: p.id, label: p.name })) || []}
                      selectedValues={filterProductIds}
                      onChange={setFilterProductIds}
                      searchable
                    />
                  </div>
                  <div className="mui-outline md:col-span-2">
                    <label>کۆدی وەجبە</label>
                    <input type="text" value={batchCode} onChange={e => setBatchCode(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Section 4: Account Info */}
              <div>
                <div className="section-title flex-row-reverse">زانیاری هەژمار <span className="text-lg">👤</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <MultiSelectDropdown
                      label="جۆری هەژمار"
                      options={accountTypes?.map((a: any) => ({ value: a.id, label: a.name })) || []}
                      selectedValues={filterAccountTypeIds}
                      onChange={setFilterAccountTypeIds}
                      searchable
                    />
                  </div>
                  <div>
                    <MultiSelectDropdown
                      label="هەژمار"
                      options={accounts?.filter((acc: any) => filterAccountTypeIds.length === 0 || filterAccountTypeIds.includes(acc.accountTypeId)).map((a: any) => ({ value: a.id, label: a.name })) || []}
                      selectedValues={filterAccountIds}
                      onChange={setFilterAccountIds}
                      searchable
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Secondary Filters */}
              <div>
                <div className="section-title flex-row-reverse">فلتەرە لاوەکییەکان <span className="text-lg">⚙</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>لەبێڵ</label>
                    <select value={label} onChange={e => setLabel(e.target.value)}>
                      <option value="all"></option>
                    </select>
                  </div>
                  <div>
                    <MultiSelectDropdown
                      label="کۆگا" pluralLabel="کۆگا"
                      options={warehouses?.map((w: any) => ({ value: w.id, label: w.name })) || []}
                      selectedValues={filterWarehouseIds}
                      onChange={setFilterWarehouseIds}
                      searchable
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MultiSelectDropdown
                      label="لە لایەن"
                      options={employeeOptions.map(emp => ({ value: emp, label: emp }))}
                      selectedValues={filterCreatedBys}
                      onChange={setFilterCreatedBys}
                      searchable
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Display Options */}
              <div>
                <div className="section-title flex-row-reverse">ئۆپشنەکانی پیشاندان <span className="text-lg">👁</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>دۆخی قازانج</label>
                    <select value={profitStatus} onChange={e => setProfitStatus(e.target.value)}>
                      <option value="all">١. هەمووی</option>
                      <option value="profitable">٢. قازانجی کردوە</option>
                      <option value="zero">٣. قازانج سفر</option>
                      <option value="loss">٤. زەرەری کردوە</option>
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>دیاری</label>
                    <select value={isGift} onChange={e => setIsGift(e.target.value)}>
                      <option value="all">هەمووی</option>
                      <option value="yes">بەڵێ</option>
                      <option value="no">نەخێر</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-start gap-4">
              <button onClick={applyFilters} className="px-6 py-2 bg-[#0b1f50] text-white rounded text-sm font-bold hover:bg-slate-800 transition flex items-center gap-2">
                جێبەجێکردنی فلتەرەکان <span>✔</span>
              </button>
              <button onClick={() => setShowFilterModal(false)} className="text-slate-600 hover:text-slate-900 text-sm font-medium">پاشگەزبوونەوە</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

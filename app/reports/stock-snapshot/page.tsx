"use client";

import FormattedNumber from "../../components/FormattedNumber";
import MultiSelectDropdown from "../../components/MultiSelectDropdown";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/store";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";
import DateInput from "../../components/DateInput";

interface StockItem {
  productId: number;
  productName: string;
  productCode: string;
  category: string;
  brand: string;
  sellPrice: number;
  warehouseId: number;
  warehouseName: string;
  quantity: number;
  purchasePrice: number;
  expense: number;
  cost: number;
  sellerName: string;
  sellerId: number | null;
  purchaseDate: string;
}

export default function StockSnapshotReportPage() {
  const router = useRouter();
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportStats, setShowReportStats] = useState(true);

  const {
    warehouses, fetchWarehouses,
    products, fetchProducts,
    accounts, fetchAccounts,
  } = useStore() as any;

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
    fetchAccounts();
    fetch("/api/attributes?type=category").then(res => res.json()).then(data => Array.isArray(data) && setCategories(data)).catch(() => {});
    fetch("/api/attributes?type=brand").then(res => res.json()).then(data => Array.isArray(data) && setBrands(data)).catch(() => {});
  }, [fetchWarehouses, fetchProducts, fetchAccounts]);

  // Default to today
  const [asOfDate, setAsOfDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Modals state
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    warehouseIds: [] as (number | string)[],
    sellerNames: [] as string[],
    categories: [] as string[],
    brands: [] as string[],
    productIds: [] as (number | string)[],
    code: "",
  });

  // Columns visibility state
  const defaultSnapshotCols = {
    id: true,
    productName: true,
    category: true,
    brand: true,
    warehouseName: true,
    quantity: true,
    cost: true,
    warehouseValue: true,
    sellerName: true,
    purchaseDate: true,
  };
  const [visibleColumns, setVisibleColumns] = useState(defaultSnapshotCols);
  const colsLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_stock_snapshot_report_cols_v2");
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
      localStorage.setItem("__erp_stock_snapshot_report_cols_v2", JSON.stringify(visibleColumns));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns]);

  useEffect(() => {
    loadStockData();

    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.showReportStats === "boolean") {
          setShowReportStats(parsed.showReportStats);
        }
      } catch (e) {}
    }
  }, [asOfDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.warehouseIds.length > 0) count++;
    if (filters.sellerNames.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.brands.length > 0) count++;
    if (filters.productIds.length > 0) count++;
    if (filters.code) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      warehouseIds: [],
      sellerNames: [],
      categories: [],
      brands: [],
      productIds: [],
      code: "",
    });
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/stock-snapshot?asOfDate=${asOfDate}`);
      if (res.ok) {
        setStockData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortColumn(colKey);
      setSortDirection("desc");
    }
  };

  const filteredStockData = useMemo(() => {
    return stockData.filter((item: any) => {
      if (filters.sellerNames.length > 0 && !filters.sellerNames.includes(item.sellerName)) return false;
      if (filters.warehouseIds.length > 0 && !filters.warehouseIds.includes(item.warehouseId)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
      if (filters.brands.length > 0 && !filters.brands.includes(item.brand)) return false;
      if (filters.productIds.length > 0 && !filters.productIds.includes(item.productId)) return false;
      if (filters.code && !item.productCode?.toLowerCase().includes(filters.code.toLowerCase())) return false;
      return true;
    });
  }, [stockData, filters]);

  const sortedStockData = useMemo(() => {
    if (!sortColumn) return filteredStockData;
    return [...filteredStockData].sort((a: any, b: any) => {
      let valA: any = "";
      let valB: any = "";

      if (sortColumn === "productName") {
        valA = a.productName || "";
        valB = b.productName || "";
        return sortDirection === "desc" 
          ? valB.localeCompare(valA, "ckb") 
          : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "category") {
        valA = a.category || "";
        valB = b.category || "";
        return sortDirection === "desc" 
          ? valB.localeCompare(valA, "ckb") 
          : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "brand") {
        valA = a.brand || "";
        valB = b.brand || "";
        return sortDirection === "desc" 
          ? valB.localeCompare(valA, "ckb") 
          : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "warehouseName") {
        valA = a.warehouseName || "";
        valB = b.warehouseName || "";
        return sortDirection === "desc" 
          ? valB.localeCompare(valA, "ckb") 
          : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "sellerName") {
        valA = a.sellerName || "";
        valB = b.sellerName || "";
        return sortDirection === "desc" 
          ? valB.localeCompare(valA, "ckb") 
          : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "purchaseDate") {
        const dateA = a.purchaseDate && a.purchaseDate !== "-" ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate && b.purchaseDate !== "-" ? new Date(b.purchaseDate).getTime() : 0;
        return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
      } else if (sortColumn === "quantity") {
        valA = a.quantity || 0;
        valB = b.quantity || 0;
      } else if (sortColumn === "warehouseValue") {
        valA = (a.purchasePrice || a.cost || 0) * (a.quantity || 0);
        valB = (b.purchasePrice || b.cost || 0) * (b.quantity || 0);
      } else if (sortColumn === "cost") {
        valA = a.cost || 0;
        valB = b.cost || 0;
      }
      return sortDirection === "desc" ? valB - valA : valA - valB;
    });
  }, [filteredStockData, sortColumn, sortDirection]);

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (amount: number, symbol: string = "$") => {
    const isIQD = symbol === "دینار" || symbol.includes("دینار") || symbol.includes("IQD") || symbol.includes("د.ع");
    return <FormattedNumber value={amount} currencySymbol={symbol} decimals={isIQD ? 0 : 2} />;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Calculate totals
  const totalItems = filteredStockData.length;
  const totalQuantity = filteredStockData.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = filteredStockData.reduce((sum, item) => {
    // Use costUsd from server if available, otherwise fall back (IQD items have costUsd pre-converted)
    const costUsd = (item as any).costUsd || item.cost;
    return sum + (costUsd * item.quantity);
  }, 0);

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-800 rtl font-sans">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 0; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top navbar */}
      <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))} className="text-gray-800 text-2xl font-bold cursor-pointer hover:bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center transition-colors">
            ☰
          </button>
          <span className="font-bold text-gray-800 text-lg">ڕاپۆرتی ئاستی کۆگا</span>
        </div>
      </div>

      <div id="print-area" className="p-4 md:p-6 mx-auto bg-transparent min-h-screen">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی ئاستی کۆگا</h2>
        </div>
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-end items-center gap-2 mb-6 no-print">
          
          {/* As Of Date Picker */}
          <DateInput value={asOfDate} onChange={setAsOfDate} label="بەروار" className="mr-auto" />

          <button onClick={() => setShowFilterModal(true)} className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-4 py-2.5 rounded-md hover:bg-[#061f5f] transition-colors cursor-pointer text-sm shadow-sm">
            <span>فلتەرەکان ☰</span>
            {activeFiltersCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          {activeFiltersCount > 0 && (
            <button onClick={handleResetFilters} className="flex items-center justify-center gap-2 bg-rose-100 border border-rose-300 text-rose-700 font-bold px-4 py-2.5 rounded-md hover:bg-rose-200 transition-colors cursor-pointer text-sm shadow-sm">
              🔄 ڕێکخستنەوە
            </button>
          )}
          <button onClick={loadStockData} className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-4 py-2.5 rounded-md hover:bg-[#061f5f] transition-colors cursor-pointer text-sm shadow-sm">
            گەڕان 🔍
          </button>
          <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
            پرینت 🖨️
          </button>
          <button onClick={() => exportTableToExcel("stock-snapshot-table", "raporti_ast_koga.xlsx")}
            className="flex items-center justify-center gap-2 bg-emerald-600 border border-emerald-700 text-white font-bold px-4 py-2.5 rounded-md hover:bg-emerald-700 transition-colors cursor-pointer text-sm shadow-sm border-none">
            ناردن بۆ ئێکسڵ 📊
          </button>
          <button
            onClick={() => setShowColumnModal(true)}
            className="flex items-center justify-center gap-2 text-white font-black px-4 py-2.5 rounded-lg transition-transform hover:scale-105 cursor-pointer text-sm shadow-md border-none"
            style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#bae6fd" }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
            <span>کۆڵۆمەکان</span>
          </button>
        </div>

        {/* Totals Cards */}
        {showReportStats && (
          <div className={`grid grid-cols-1 ${visibleColumns.warehouseValue ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6 animate-in fade-in duration-200`}>
            {visibleColumns.warehouseValue && (
              <div className="bg-white rounded-md p-5 border-r-4 border-blue-500 shadow-sm flex flex-col items-center justify-center">
                <span className="text-blue-900 font-medium text-sm mb-2">بەهای کۆگا بە دۆلاری ڕۆژ</span>
                <span className="text-2xl font-medium text-gray-800" dir="ltr">{formatMoney(totalValue)}</span>
              </div>
            )}
            <div className="bg-white rounded-md p-5 border-r-4 border-gray-300 shadow-sm flex flex-col items-center justify-center">
              <span className="text-gray-500 font-normal text-sm mb-2">گشتی عدد</span>
              <div className="text-2xl font-normal text-gray-800" dir="ltr">
                <span className="text-sm font-normal text-gray-400 ml-1">دانە</span>
                {totalQuantity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white rounded-md p-5 border-r-4 border-gray-300 shadow-sm flex flex-col items-center justify-center">
              <span className="text-gray-500 font-normal text-sm mb-2">گشتی کەرەستە</span>
              <span className="text-2xl font-normal text-gray-800">{totalItems}</span>
            </div>
          </div>
        )}

        {/* Main Table */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table id="stock-snapshot-table" className="w-full text-xs text-right whitespace-nowrap">
              <thead className="bg-[#0b1f50] text-white">
                <tr>
                  {visibleColumns.id && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center w-10">#</th>}
                  {visibleColumns.productName && (
                    <th onClick={() => handleSort("productName")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                      کەرەستە {sortColumn === "productName" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.category && (
                    <th onClick={() => handleSort("category")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                      کاتیگۆری {sortColumn === "category" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.brand && (
                    <th onClick={() => handleSort("brand")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                      براند {sortColumn === "brand" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.warehouseName && (
                    <th onClick={() => handleSort("warehouseName")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                      کۆگا {sortColumn === "warehouseName" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.quantity && (
                    <th onClick={() => handleSort("quantity")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی زۆر/کەم">
                      عدد {sortColumn === "quantity" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.cost && (
                    <th onClick={() => handleSort("cost")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی زۆر/کەم">
                      کۆست {sortColumn === "cost" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.warehouseValue && (
                    <th onClick={() => handleSort("warehouseValue")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی زۆر/کەم">
                      بەهای کۆگا {sortColumn === "warehouseValue" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.sellerName && (
                    <th onClick={() => handleSort("sellerName")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                      فرۆشیار {sortColumn === "sellerName" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.purchaseDate && (
                    <th onClick={() => handleSort("purchaseDate")} className="px-2 py-2.5 font-bold text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی بەپێی بەروار">
                      بەرواری کۆتا کڕین {sortColumn === "purchaseDate" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-gray-500 font-bold">باردەکرێت...</td>
                  </tr>
                ) : sortedStockData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-gray-500 font-bold">هیچ داتایەک نەدۆزرایەوە لەم بەروارەدا</td>
                  </tr>
                ) : (
                  sortedStockData.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {visibleColumns.id && <td className="px-2 py-2 text-center text-gray-500 font-bold">{idx + 1}</td>}
                      {visibleColumns.productName && (
                        <td 
                          className="px-2 py-2 text-center text-[#4f46e5] font-bold cursor-pointer hover:underline"
                          onClick={() => router.push(`/materials?search=${encodeURIComponent(item.productName)}`)}
                        >
                          {item.productName}
                        </td>
                      )}
                      {visibleColumns.category && <td className="px-2 py-2 text-center text-gray-600">{item.category}</td>}
                      {visibleColumns.brand && <td className="px-2 py-2 text-center text-gray-600">{item.brand}</td>}
                      {visibleColumns.warehouseName && <td className="px-2 py-2 text-center text-gray-600">{item.warehouseName}</td>}
                      {visibleColumns.quantity && (
                        <td className="px-2 py-2 text-center text-gray-800 font-bold">
                          {item.quantity} <span className="text-gray-400 font-normal text-[10px]">دانە</span>
                        </td>
                      )}
                      {visibleColumns.cost && (
                        <td className="px-2 py-2 text-center font-bold" dir="ltr">
                          {(() => {
                            // Currency detection: rely on server flags ONLY. Never guess from price magnitude.
                            const isIQDItem = (item as any).isIQD === true || (item as any).currencyCode === "IQD";
                            const itemSymbol = isIQDItem ? "دینار" : "$";
                            const itemCost = isIQDItem ? ((item as any).rawCost || item.cost) : item.cost;
                            const itemPurchasePrice = isIQDItem ? ((item as any).rawPurchasePrice || item.purchasePrice) : item.purchasePrice;

                            if (isIQDItem) {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-black border border-amber-300 bg-amber-100/90 text-amber-900 shadow-xs">
                                  <FormattedNumber value={itemCost} currencySymbol={itemSymbol} decimals={0} />
                                </span>
                              );
                            }
                            return (item as any).exchangeRateType === "FIXED" ? (
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-lg border text-sm cursor-help font-black shadow-sm"
                                style={{ backgroundColor: "#f3e8ff", borderColor: "#c084fc", color: "#6b21a8" }}
                                title={`نرخی جێگیری 100$: ${((item as any).customExchangeRate || 135000).toLocaleString("en-US")} دینار`}
                              >
                                <FormattedNumber value={itemPurchasePrice} currencySymbol={itemSymbol} decimals={2} />
                              </span>
                            ) : (
                              <FormattedNumber value={itemCost} currencySymbol={itemSymbol} decimals={2} />
                            );
                          })()}
                        </td>
                      )}
                      {visibleColumns.warehouseValue && (
                        <td className="px-2 py-2 text-center font-bold" dir="ltr">
                          {(() => {
                            // Currency detection: rely on server flags ONLY. Never guess from price magnitude.
                            const isIQDItem = (item as any).isIQD === true || (item as any).currencyCode === "IQD";
                            const itemSymbol = isIQDItem ? "دینار" : "$";
                            const itemCost = isIQDItem ? ((item as any).rawCost || item.cost) : item.cost;
                            const itemPurchasePrice = isIQDItem ? ((item as any).rawPurchasePrice || item.purchasePrice) : item.purchasePrice;

                            if (isIQDItem) {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-black border border-amber-300 bg-amber-100/90 text-amber-900 shadow-xs">
                                  <FormattedNumber value={itemCost * item.quantity} currencySymbol={itemSymbol} decimals={0} />
                                </span>
                              );
                            }
                            return (item as any).exchangeRateType === "FIXED" ? (
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-lg border text-sm cursor-help font-black shadow-sm"
                                style={{ backgroundColor: "#f3e8ff", borderColor: "#c084fc", color: "#6b21a8" }}
                                title={`نرخی جێگیری 100$: ${((item as any).customExchangeRate || 135000).toLocaleString("en-US")} دینار`}
                              >
                                <FormattedNumber value={itemPurchasePrice * item.quantity} currencySymbol={itemSymbol} decimals={2} />
                              </span>
                            ) : (
                              <FormattedNumber value={itemCost * item.quantity} currencySymbol={itemSymbol} decimals={2} />
                            );
                          })()}
                        </td>
                      )}
                      {visibleColumns.sellerName && (
                        <td className="px-2 py-2 text-center font-bold">
                          {(item as any).exchangeRateType === "FIXED" ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-lg border text-sm cursor-help font-black shadow-sm"
                              style={{ backgroundColor: "#f3e8ff", borderColor: "#c084fc", color: "#6b21a8" }}
                              title={`نرخی جێگیری 100$: ${((item as any).customExchangeRate || 132000).toLocaleString("en-US")} دینار`}
                              onClick={() => {
                                if (item.sellerId) {
                                  router.push(`/reports/account-statement?accountId=${item.sellerId}`);
                                }
                              }}
                            >
                              {item.sellerName}
                            </span>
                          ) : (
                            <span
                              className="text-[#4f46e5] cursor-pointer hover:underline"
                              onClick={() => {
                                if (item.sellerId) {
                                  router.push(`/reports/account-statement?accountId=${item.sellerId}`);
                                }
                              }}
                            >
                              {item.sellerName}
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.purchaseDate && <td className="px-2 py-2 text-center text-gray-500 font-medium" dir="ltr">{formatDate(item.purchaseDate)}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-700">
            <div>
              کۆی گشتی: {totalItems}
            </div>
            <div className="flex gap-2 items-center">
              <select className="border border-gray-300 rounded px-2 py-1 outline-none">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <div className="flex gap-1">
                <button className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100">&lt;</button>
                <button className="w-8 h-8 flex items-center justify-center bg-[#0b1f50] text-white border border-[#0b1f50] rounded">1</button>
                <button className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100">&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Columns Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setShowColumnModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#38bdf8" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                </svg>
                <h3 className="font-bold text-lg m-0">کۆڵۆمە دیاریکراوەکان</h3>
              </div>
              <button onClick={() => setShowColumnModal(false)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer border-none bg-transparent">×</button>
            </div>
            <div className="p-4">
              <div className="flex flex-col gap-1.5 max-h-[80vh] overflow-y-auto">
                {[
                  { key: 'id', label: '#' },
                  { key: 'productName', label: 'کەرەستە' },
                  { key: 'category', label: 'کاتیگۆری' },
                  { key: 'brand', label: 'براند' },
                  { key: 'warehouseName', label: 'کۆگا' },
                  { key: 'quantity', label: 'عدد' },
                  { key: 'cost', label: 'کۆست' },
                  { key: 'warehouseValue', label: 'بەهای کۆگا' },
                  { key: 'sellerName', label: 'فرۆشیار' },
                  { key: 'purchaseDate', label: 'بەرواری کۆتا کڕین' },
                ].map(col => (
                  <label key={col.key} className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-1.5">
                    <span className="text-gray-700 font-bold text-[11px]">{col.label}</span>
                    <input 
                      type="checkbox" 
                      checked={visibleColumns[col.key as keyof typeof visibleColumns]} 
                      onChange={() => toggleColumn(col.key as keyof typeof visibleColumns)}
                      className="w-4 h-4 rounded text-[#0b1f50] focus:ring-[#0b1f50]"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <button onClick={() => setShowColumnModal(false)} className="bg-[#0b1f50] text-white px-5 py-1.5 rounded shadow-md text-xs font-bold hover:bg-[#061f5f] transition-colors">
                  جێبەجێکردن ✔️
                </button>
                <button onClick={() => setShowColumnModal(false)} className="text-gray-500 hover:text-gray-700 font-bold text-sm px-4 py-2">
                  پاشگەزبوونەوە
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg m-0">ئۆپشنەکانی فلتەرکردن</h3>
              <div className="flex gap-4 items-center">
                <button onClick={handleResetFilters} className="text-white hover:text-gray-300 text-sm font-bold flex items-center gap-1 bg-transparent border-none cursor-pointer">
                  لابردنی هەموو ⌫
                </button>
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer bg-transparent border-none">×</button>
              </div>
            </div>
            <div className="p-6 max-h-[85vh] overflow-y-auto text-right" style={{ direction: 'rtl' }}>
              
              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2 justify-end">
                  <span>📅</span> بەروار
                </h4>
                <DateInput value={asOfDate} onChange={setAsOfDate} label="بەروار" className="w-full md:w-1/2 min-h-[46px]" />
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2 justify-end">
                  <span>📍</span> شوێن و سەرچاوە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <MultiSelectDropdown
                      label="فرۆشیار"
                      options={accounts?.map((acc: any) => ({ value: acc.name, label: acc.name })) || []}
                      selectedValues={filters.sellerNames}
                      onChange={vals => setFilters(prev => ({ ...prev, sellerNames: vals }))}
                      searchable
                    />
                  </div>
                  <div>
                    <MultiSelectDropdown
                      label="کۆگا"
                      options={warehouses?.map((w: any) => ({ value: w.id, label: w.name })) || []}
                      selectedValues={filters.warehouseIds}
                      onChange={vals => setFilters(prev => ({ ...prev, warehouseIds: vals }))}
                      searchable
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2 justify-end">
                  <span>📦</span> فلتەری کەرەستە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <MultiSelectDropdown
                      label="براند"
                      options={brands.map((b: any) => ({ value: b.name, label: b.name }))}
                      selectedValues={filters.brands}
                      onChange={vals => setFilters(prev => ({ ...prev, brands: vals }))}
                      searchable
                    />
                  </div>
                  <div>
                    <MultiSelectDropdown
                      label="کاتیگۆری"
                      options={categories.map((c: any) => ({ value: c.name, label: c.name }))}
                      selectedValues={filters.categories}
                      onChange={vals => setFilters(prev => ({ ...prev, categories: vals }))}
                      searchable
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <MultiSelectDropdown
                      label="کەرەستە"
                      options={products?.map((p: any) => ({ value: p.id, label: p.name })) || []}
                      selectedValues={filters.productIds}
                      onChange={vals => setFilters(prev => ({ ...prev, productIds: vals }))}
                      searchable
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="کۆد" 
                      value={filters.code}
                      onChange={e => setFilters(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none text-right min-h-[46px]" 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <button onClick={() => { setShowFilterModal(false); loadStockData(); }} className="bg-[#0b1f50] text-white px-6 py-2.5 rounded-xl shadow-md text-sm font-bold hover:bg-[#061f5f] transition-colors flex items-center gap-2 border-none cursor-pointer">
                  جێبەجێکردنی فلتەرەکان ✔️
                </button>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-500 hover:text-gray-700 font-bold text-sm px-4 py-2 bg-transparent border-none cursor-pointer">
                  پاشگەزبوونەوە
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

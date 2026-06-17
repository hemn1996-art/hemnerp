"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/store";

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

export default function StockReportPage() {
  const router = useRouter();
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    warehouses, fetchWarehouses,
    products, fetchProducts,
    accounts, fetchAccounts
  } = useStore() as any;

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  // Modals state
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    warehouseId: "",
    sellerName: "",
    category: "",
    brand: "",
    code: "",
    productName: "",
    batchCode: "",
    warehouseStatus: "",
    grouped: "نەخێر",
    fromDate: "",
    toDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
  });

  // Columns visibility state
  const defaultStockCols = {
    id: true,
    productName: true,
    category: true,
    brand: true,
    sellPrice: true,
    warehouseName: true,
    quantity: true,
    purchasePrice: true,
    expense: true,
    cost: false,
    warehouseValue: false,
    sellerName: true,
    purchaseDate: true,
  };
  const [visibleColumns, setVisibleColumns] = useState(defaultStockCols);
  const colsLoadedRef = useRef(false);

  // Load saved columns from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_stock_report_cols");
      if (stored) {
        setVisibleColumns(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.error(e);
    }
    colsLoadedRef.current = true;
  }, []);

  // Save columns to localStorage only after initial load
  useEffect(() => {
    if (!colsLoadedRef.current) return;
    try {
      localStorage.setItem("__erp_stock_report_cols", JSON.stringify(visibleColumns));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns]);

  useEffect(() => {
    fetchWarehouses?.();
    fetchProducts?.();
    fetchAccounts?.();

    if (typeof window !== "undefined") {
      const rawCat = localStorage.getItem("__erp_categories");
      const rawBrand = localStorage.getItem("__erp_brands");
      if (rawCat) setCategories(JSON.parse(rawCat));
      if (rawBrand) setBrands(JSON.parse(rawBrand));
    }
  }, [fetchWarehouses, fetchProducts, fetchAccounts]);

  useEffect(() => {
    loadStockData();
  }, [filters.toDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.warehouseId) count++;
    if (filters.sellerName) count++;
    if (filters.category) count++;
    if (filters.brand) count++;
    if (filters.code) count++;
    if (filters.productName) count++;
    if (filters.batchCode) count++;
    if (filters.fromDate) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    const defaultToDate = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    setFilters({
      warehouseId: "",
      sellerName: "",
      category: "",
      brand: "",
      code: "",
      productName: "",
      batchCode: "",
      warehouseStatus: "",
      grouped: "نەخێر",
      fromDate: "",
      toDate: defaultToDate,
    });
    setTimeout(() => {
      loadStockData();
    }, 0);
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const query = new URLSearchParams();
      if (filters.fromDate) query.append("fromDate", filters.fromDate);
      if (filters.toDate) query.append("toDate", filters.toDate);
      if (filters.warehouseId) query.append("warehouseId", filters.warehouseId);
      if (filters.productName) query.append("productId", filters.productName);
      if (filters.sellerName) query.append("sellerName", filters.sellerName);

      const res = await fetch(`/api/reports/stock?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStockData(data);
        } else {
          setStockData([]);
          setErrorMsg(data?.error || "کێشەیەک ڕوویدا لە هێنانی داتا");
        }
      } else {
        try {
          const errData = await res.json();
          setErrorMsg(errData?.error || "کێشەیەک ڕوویدا لە سێرڤەر");
        } catch {
          setErrorMsg("کێشەیەک ڕوویدا لە سێرڤەر");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("کێشەیەک ڕوویدا لە پەیوەندی کردن بە سێرڤەرەوە");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (amount: number) => {
    return `$ ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Client-side filtering logic fallback for local storage attributes
  const filteredStockData = useMemo(() => {
    return stockData
      .map((item: any) => {
        const prod = products?.find((p: any) => p.id === item.productId || p.name === item.productName);
        return {
          ...item,
          category: prod?.category || "-",
          brand: prod?.brand || "-",
        };
      })
      .filter((item: any) => {
        // Category filter
        if (filters.category && filters.category !== "all" && filters.category !== "") {
          if (item.category !== filters.category) return false;
        }
        // Brand filter
        if (filters.brand && filters.brand !== "all" && filters.brand !== "") {
          if (item.brand !== filters.brand) return false;
        }
        // Code filter
        if (filters.code && filters.code.trim() !== "") {
          if (!item.productCode.toLowerCase().includes(filters.code.toLowerCase())) return false;
        }
        return true;
      });
  }, [stockData, filters, products]);

  // Calculate totals
  const totalItems = filteredStockData.length;
  const totalQuantity = filteredStockData.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = filteredStockData.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

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
          <span className="font-bold text-gray-800 text-lg">ڕاپۆرتی کۆگا</span>
        </div>
      </div>

      <div id="print-area" className="p-4 md:p-6 mx-auto bg-transparent min-h-screen">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 no-print">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-md shadow-sm">
            <span className="text-xs font-bold text-gray-500">بەروار:</span>
            <input 
              type="date" 
              value={filters.toDate}
              onChange={e => {
                const newDate = e.target.value;
                setFilters(prev => ({ ...prev, toDate: newDate }));
              }}
              className="text-xs text-gray-700 outline-none cursor-pointer font-bold" 
            />
          </div>

          <div className="flex flex-wrap justify-end items-center gap-2">
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
            <button className="flex items-center justify-center gap-2 bg-[#0b1f50] text-white font-bold px-4 py-2.5 rounded-md hover:bg-[#061f5f] transition-colors cursor-pointer text-sm shadow-sm">
              گەڕان 🔍
            </button>
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
              پرینت 🖨️
            </button>
            <button className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
              ئێکسڵ 📊
            </button>
            <button onClick={() => setShowColumnModal(true)} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-[#4f46e5] font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
              کۆڵۆمەکان ◫
            </button>
          </div>
        </div>

        {/* Totals Cards */}
        <div className={`grid grid-cols-1 ${visibleColumns.warehouseValue ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}>
          {visibleColumns.warehouseValue && (
            <div className="bg-white rounded-md p-5 border-r-4 border-blue-500 shadow-sm flex flex-col items-center justify-center">
              <span className="text-gray-500 font-bold text-sm mb-2">بەهای کۆگا</span>
              <span className="text-2xl font-black text-gray-800" dir="ltr">{formatMoney(totalValue)}</span>
            </div>
          )}
          <div className="bg-white rounded-md p-5 border-r-4 border-green-500 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 font-bold text-sm mb-2">گشتی عدد</span>
            <div className="text-2xl font-black text-gray-800" dir="ltr">
              <span className="text-sm font-bold text-gray-400 ml-1">دانە</span>
              {totalQuantity.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-md p-5 border-r-4 border-gray-300 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 font-bold text-sm mb-2">گشتی کەرەستە</span>
            <span className="text-2xl font-black text-gray-800">{totalItems}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right whitespace-nowrap">
              <thead className="bg-[#0b1f50] text-white">
                <tr>
                  {visibleColumns.id && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center w-10">#</th>}
                  {visibleColumns.productName && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">کەرەستە</th>}
                  {visibleColumns.category && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">کاتیگۆری</th>}
                  {visibleColumns.brand && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">براند</th>}
                  {visibleColumns.sellPrice && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">نرخی فرۆشتن</th>}
                  {visibleColumns.warehouseName && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">کۆگا</th>}
                  {visibleColumns.quantity && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">عدد</th>}
                  {visibleColumns.purchasePrice && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">نرخی کڕین</th>}
                  {visibleColumns.expense && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">خەرجی</th>}
                  {visibleColumns.cost && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">کۆست</th>}
                  {visibleColumns.warehouseValue && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">بەهای کۆگا</th>}
                  {visibleColumns.sellerName && <th className="px-2 py-2.5 font-bold border-l border-white/10 text-center">فرۆشیار</th>}
                  {visibleColumns.purchaseDate && <th className="px-2 py-2.5 font-bold text-center">بەرواری کڕین</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-gray-500 font-bold">باردەکرێت...</td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-red-500 text-3xl">⚠️</span>
                        <span className="text-red-600 font-bold text-sm">{errorMsg}</span>
                        <button 
                          onClick={loadStockData} 
                          className="bg-[#0b1f50] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#061f5f] transition-colors"
                        >
                          هەوڵی دووبارە بدەرەوە 🔄
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredStockData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-gray-500 font-bold">هیچ داتایەک نەدۆزرایەوە</td>
                  </tr>
                ) : (
                  filteredStockData.map((item, idx) => (
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
                      {visibleColumns.sellPrice && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{item.sellPrice === 0 ? "0" : formatMoney(item.sellPrice)}</td>}
                      {visibleColumns.warehouseName && <td className="px-2 py-2 text-center text-gray-600">{item.warehouseName}</td>}
                      {visibleColumns.quantity && (
                        <td className="px-2 py-2 text-center text-gray-800 font-bold">
                          {item.quantity} <span className="text-gray-400 font-normal text-[10px]">دانە</span>
                        </td>
                      )}
                      {visibleColumns.purchasePrice && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{formatMoney(item.purchasePrice)}</td>}
                      {visibleColumns.expense && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{formatMoney(item.expense)}</td>}
                      {visibleColumns.cost && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{formatMoney(item.cost)}</td>}
                      {visibleColumns.warehouseValue && <td className="px-2 py-2 text-center text-gray-800 font-bold" dir="ltr">{formatMoney(item.cost * item.quantity)}</td>}
                      {visibleColumns.sellerName && (
                        <td 
                          className="px-2 py-2 text-center text-[#4f46e5] font-bold cursor-pointer hover:underline"
                          onClick={() => {
                            if (item.sellerId) {
                              router.push(`/reports/account-statement?accountId=${item.sellerId}`);
                            }
                          }}
                        >
                          {item.sellerName}
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg m-0">کۆڵۆمە دیاریکراوەکان</h3>
              <button onClick={() => setShowColumnModal(false)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer">×</button>
            </div>
            <div className="p-4">
              <div className="flex flex-col gap-1.5 max-h-[80vh] overflow-y-auto">
                {[
                  { key: 'id', label: '#' },
                  { key: 'productName', label: 'کەرەستە' },
                  { key: 'category', label: 'کاتیگۆری' },
                  { key: 'brand', label: 'براند' },
                  { key: 'sellPrice', label: 'نرخی فرۆشتن' },
                  { key: 'warehouseName', label: 'کۆگا' },
                  { key: 'quantity', label: 'عدد' },
                  { key: 'purchasePrice', label: 'نرخی کڕین' },
                  { key: 'expense', label: 'خەرجی' },
                  { key: 'cost', label: 'کۆست' },
                  { key: 'warehouseValue', label: 'بەهای کۆگا' },
                  { key: 'sellerName', label: 'فرۆشیار' },
                  { key: 'purchaseDate', label: 'بەرواری کڕین' },
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg m-0">ئۆپشنەکانی فلتەرکردن</h3>
              <div className="flex gap-4 items-center">
                <button 
                  onClick={handleResetFilters}
                  className="text-white hover:text-gray-300 text-sm font-bold flex items-center gap-1"
                >
                  لابردنی هەموو ⌫
                </button>
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer">×</button>
              </div>
            </div>
            <div className="p-5 max-h-[85vh] overflow-y-auto text-right" style={{ direction: 'rtl' }}>
              
              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-[14px] mb-3 flex items-center gap-2 justify-end">
                  <span>📍</span> شوێن و سەرچاوە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <select 
                      value={filters.sellerName}
                      onChange={e => setFilters(prev => ({ ...prev, sellerName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                    >
                      <option value="">فرۆشیار (هەموو)</option>
                      {accounts?.map((acc: any) => (
                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select 
                      value={filters.warehouseId}
                      onChange={e => setFilters(prev => ({ ...prev, warehouseId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                    >
                      <option value="">کۆگا (هەموو)</option>
                      {warehouses?.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-[14px] mb-3 flex items-center gap-2 justify-end">
                  <span>📦</span> فلتەری کەرەستە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                  <div>
                    <select 
                      value={filters.brand}
                      onChange={e => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                    >
                      <option value="">براند (هەموو)</option>
                      {brands.map((b: any) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select 
                      value={filters.category}
                      onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                    >
                      <option value="">کاتیگۆری (هەموو)</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <select 
                      value={filters.productName}
                      onChange={e => setFilters(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                    >
                      <option value="">کەرەستە (هەموو)</option>
                      {products?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="کۆد" 
                      value={filters.code}
                      onChange={e => setFilters(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]" 
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <h4 className="font-bold text-gray-800 text-[14px] mb-2">دۆخی کۆگا 📉</h4>
                  <input 
                    type="text" 
                    placeholder="کۆدی وەجبە" 
                    value={filters.batchCode}
                    onChange={e => setFilters(prev => ({ ...prev, batchCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]" 
                  />
                </div>
                <div>
                  {/* Empty space for alignment */}
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <h4 className="font-bold text-gray-500 text-[12px] mb-1.5">بەردەستبوونی کەرەستە</h4>
                  <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]">
                    <option>کەرەستە بەردەستەکان</option>
                    <option>هەموو کەرەستەکان</option>
                  </select>
                </div>
                <div>
                  <h4 className="font-bold text-gray-500 text-[12px] mb-1.5 text-transparent select-none">.</h4>
                  <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]">
                    <option>نەخێر</option>
                    <option>بەڵێ</option>
                  </select>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div 
                  className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm hover:border-[#0b1f50] transition-colors min-h-[48px]"
                >
                  <span className="bg-gray-50 px-3.5 py-3 text-sm font-bold text-gray-500 border-l border-gray-300 h-full flex items-center">لە بەرواری کڕین</span>
                  <input 
                    type="date" 
                    value={filters.fromDate}
                    onChange={e => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                    className="w-full px-3.5 py-3 text-sm text-gray-700 outline-none cursor-pointer font-bold h-full" 
                  />
                </div>
                <div 
                  className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm hover:border-[#0b1f50] transition-colors min-h-[48px]"
                >
                  <span className="bg-gray-50 px-3.5 py-3 text-sm font-bold text-gray-500 border-l border-gray-300 h-full flex items-center">بۆ بەرواری کڕین</span>
                  <input 
                    type="date" 
                    value={filters.toDate}
                    onChange={e => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                    className="w-full px-3.5 py-3 text-sm text-gray-700 outline-none cursor-pointer font-bold h-full" 
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 flex justify-between items-center">
                <button 
                  onClick={() => {
                    setShowFilterModal(false);
                    loadStockData();
                  }} 
                  className="bg-[#0b1f50] text-white px-6 py-2.5 rounded-lg shadow-md text-sm font-bold hover:bg-[#061f5f] transition-colors flex items-center gap-2"
                >
                  جێبەجێکردنی فلتەرەکان ✔️
                </button>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-500 hover:text-gray-700 font-bold text-sm px-4 py-2">
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

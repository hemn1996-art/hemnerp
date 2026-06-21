"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import PrintHeader from "../../components/PrintHeader";

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
    toDate: "",
  });

  // Columns visibility state
  const defaultSnapshotCols = {
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
  const [visibleColumns, setVisibleColumns] = useState(defaultSnapshotCols);
  const colsLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_stock_snapshot_report_cols");
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
      localStorage.setItem("__erp_stock_snapshot_report_cols", JSON.stringify(visibleColumns));
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
    if (filters.warehouseId) count++;
    if (filters.sellerName) count++;
    if (filters.category) count++;
    if (filters.brand) count++;
    if (filters.code) count++;
    if (filters.productName) count++;
    if (filters.batchCode) count++;
    if (filters.warehouseStatus) count++;
    if (filters.grouped !== "نەخێر") count++;
    if (filters.fromDate) count++;
    if (filters.toDate) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
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
      toDate: "",
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

  // Calculate totals
  const totalItems = stockData.length;
  const totalQuantity = stockData.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = stockData.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

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
          <div 
            className="flex items-center border border-gray-300 rounded overflow-hidden shadow-sm cursor-pointer hover:border-[#0b1f50] transition-colors bg-white mr-auto"
            onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement)?.showPicker()}
          >
            <span className="bg-gray-50 px-3 py-2 text-sm font-bold text-gray-500 border-l border-gray-300">بەروار</span>
            <input 
              type="date" 
              className="px-3 py-2 text-sm text-gray-700 outline-none cursor-pointer w-40" 
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>

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
          <button className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
            ئێکسڵ 📊
          </button>
          <button onClick={() => setShowColumnModal(true)} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-[#4f46e5] font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
            کۆڵۆمەکان ◫
          </button>
        </div>

        {/* Totals Cards */}
        {showReportStats && (
          <div className={`grid grid-cols-1 ${visibleColumns.warehouseValue ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6 animate-in fade-in duration-200`}>
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
        )}

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
                ) : stockData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-gray-500 font-bold">هیچ داتایەک نەدۆزرایەوە لەم بەروارەدا</td>
                  </tr>
                ) : (
                  stockData.map((item, idx) => (
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
                <div 
                  className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:border-[#0b1f50] transition-colors bg-white w-full md:w-1/2 min-h-[46px]"
                  onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement)?.showPicker()}
                >
                  <span className="bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-500 border-l border-gray-300 w-24">بەروار</span>
                  <input 
                    type="date" 
                    className="flex-1 px-3 py-2.5 text-sm text-gray-700 outline-none cursor-pointer font-bold" 
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2 justify-end">
                  <span>📍</span> شوێن و سەرچاوە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none cursor-pointer min-h-[46px]">
                      <option>فرۆشیار</option>
                    </select>
                  </div>
                  <div>
                    <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none cursor-pointer min-h-[46px]">
                      <option>کۆگا</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2 justify-end">
                  <span>📦</span> فلتەری کەرەستە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none cursor-pointer min-h-[46px]">
                      <option>براند</option>
                    </select>
                  </div>
                  <div>
                    <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none cursor-pointer min-h-[46px]">
                      <option>کاتیگۆری</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <select className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none cursor-pointer min-h-[46px]">
                      <option>کەرەستە</option>
                    </select>
                  </div>
                  <div>
                    <input type="text" placeholder="کۆد" className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 font-bold bg-white outline-none text-right min-h-[46px]" />
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

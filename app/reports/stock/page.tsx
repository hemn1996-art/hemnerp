"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/store";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";
import FormattedNumber from "../../components/FormattedNumber";
import { currencies as mockCurrencies } from "../../data/mockData";

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
  const [showReportStats, setShowReportStats] = useState(true);
  const [editingCost, setEditingCost] = useState<Record<string, string>>({});

  const {
    warehouses, fetchWarehouses,
    products, fetchProducts,
    accounts, fetchAccounts,
  } = useStore() as any;
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;

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
    cost: true,
    warehouseValue: true,
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
    fetchCurrencies?.();

    if (typeof window !== "undefined") {
      const rawCat = localStorage.getItem("__erp_categories");
      const rawBrand = localStorage.getItem("__erp_brands");
      if (rawCat) setCategories(JSON.parse(rawCat));
      if (rawBrand) setBrands(JSON.parse(rawBrand));

      const saved = localStorage.getItem("general_settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.showReportStats === "boolean") {
            setShowReportStats(parsed.showReportStats);
          }
        } catch (e) {}
      }
    }
  }, [fetchWarehouses, fetchProducts, fetchAccounts]);

  useEffect(() => {
    loadStockData();
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.warehouseId) count++;
    if (filters.sellerName) count++;
    if (filters.category) count++;
    if (filters.brand) count++;
    if (filters.code) count++;
    if (filters.productName) count++;
    if (filters.batchCode) count++;
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

  const handleSaveCost = async (productId: number, warehouseId: number, newCostStr: string) => {
    const key = `${productId}-${warehouseId}`;
    const newCost = parseFloat(newCostStr);
    if (isNaN(newCost) || newCost < 0) {
      alert("تکایە نرخێکی دروست بنووسە");
      return;
    }

    const currentItem = stockData.find(item => item.productId === productId && item.warehouseId === warehouseId);
    if (currentItem && Math.abs(currentItem.cost - newCost) < 0.001) {
      setEditingCost((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    try {
      const res = await fetch("/api/reports/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          warehouseId,
          cost: newCost,
        }),
      });

      if (res.ok) {
        setEditingCost((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await loadStockData();
      } else {
        try {
          const data = await res.json();
          alert(data.error || "کێشەیەک لە پاشەکەوتکردنی کۆست ڕوویدا");
        } catch {
          alert("کێشەیەک لە پاشەکەوتکردنی کۆست ڕوویدا");
        }
      }
    } catch (err) {
      console.error(err);
      alert("کێشەی پەیوەندی کردن بە سێرڤەرەوە ڕوویدا");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (amount: number) => {
    return <FormattedNumber value={amount} currencySymbol="$" decimals={2} />;
  };

  const getCurrencySymbol = (currencyId: number | string) => {
    const active = currencies?.find((c: any) => String(c.id) === String(currencyId) || c.code === currencyId);
    return active ? active.symbol : "$";
  };

  const formatSalePrices = (item: StockItem | any) => {
    if (!item.salePrices || item.salePrices.length === 0) {
      return <span className="text-gray-400 font-normal">دیاری نەکراوە (کلیک بکە)</span>;
    }

    return (
      <div className="flex flex-col gap-0.5 items-center">
        {item.salePrices.map((sp: any, i: number) => {
          const symbol = getCurrencySymbol(sp.currencyId);
          return (
            <div key={i} className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              <FormattedNumber value={sp.amount} currencySymbol={symbol} decimals={2} />
              <span className="text-[10px] text-gray-400 font-normal">({sp.priceType})</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Selling Prices Modal State
  const [editingPriceItem, setEditingPriceItem] = useState<any | null>(null);
  const [editingPrices, setEditingPrices] = useState<any[]>([]);
  const [priceTypes, setPriceTypes] = useState<any[]>([]);
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  useEffect(() => {
    async function loadPriceTypes() {
      try {
        const res = await fetch("/api/attributes?type=priceType");
        if (res.ok) {
          const listPriceTypes = await res.json();
          setPriceTypes(listPriceTypes.filter((x: any) => x.isActive !== false));
        }
      } catch (err) {
        console.error("Error loading price types", err);
      }
    }
    loadPriceTypes();
  }, []);

  const handleOpenPricesModal = (item: StockItem | any) => {
    const product = products.find((p: any) => p.id === item.productId);
    setEditingPriceItem(item);
    
    const prices = product?.salePrices || item.salePrices || [];
    setEditingPrices(
      prices.length > 0
        ? prices.map((p: any) => ({
            currencyId: String(p.currencyId),
            priceType: p.priceType,
            amount: String(p.amount),
          }))
        : [
            {
              currencyId: "1",
              priceType: "جوملە",
              amount: "",
            },
          ]
    );
  };

  const handleSavePrices = async () => {
    if (!editingPriceItem) return;
    setIsSavingPrices(true);
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPriceItem.productId,
          salePrices: editingPrices.map((sp) => ({
            currencyId: Number(sp.currencyId),
            priceType: sp.priceType,
            amount: Number(sp.amount) || 0,
          })),
        }),
      });

      if (res.ok) {
        await fetchProducts?.();
        await loadStockData();
        setEditingPriceItem(null);
      } else {
        alert("کێشەیەک لە پاشەکەوتکردنی نرخەکاندا ڕوویدا");
      }
    } catch (err) {
      console.error(err);
      alert("کێشەی پەیوەندی کردن بە سێرڤەرەوە ڕوویدا");
    } finally {
      setIsSavingPrices(false);
    }
  };

  const updateSalePrice = (index: number, field: string, value: string) => {
    setEditingPrices((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const addSalePriceRow = () => {
    setEditingPrices((prev) => [
      ...prev,
      {
        currencyId: "1",
        priceType: priceTypes[0]?.name || "جوملە",
        amount: "",
      },
    ]);
  };

  const removeSalePriceRow = (index: number) => {
    setEditingPrices((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
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
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی کۆگا</h2>
        </div>
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-6 no-print">
          <div className="flex flex-wrap justify-end items-center gap-2 w-full">
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
            <button onClick={() => exportTableToExcel("stock-report-table", "raporti_koga.xlsx")}
              className="flex items-center justify-center gap-2 bg-emerald-600 border border-emerald-700 text-white font-bold px-4 py-2.5 rounded-md hover:bg-emerald-700 transition-colors cursor-pointer text-sm shadow-sm border-none">
              ناردن بۆ ئێکسڵ 📊
            </button>
            <button onClick={() => setShowColumnModal(true)} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-[#4f46e5] font-bold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm shadow-sm">
              کۆڵۆمەکان ◫
            </button>
          </div>
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
            <table id="stock-report-table" className="w-full text-xs text-right whitespace-nowrap">
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
                      {visibleColumns.sellPrice && (
                        <td 
                          className="px-2 py-2 text-center text-blue-600 font-bold hover:underline cursor-pointer transition-colors hover:text-blue-800" 
                          dir="ltr"
                          onClick={() => handleOpenPricesModal(item)}
                        >
                          {formatSalePrices(item)}
                        </td>
                      )}
                      {visibleColumns.warehouseName && <td className="px-2 py-2 text-center text-gray-600">{item.warehouseName}</td>}
                      {visibleColumns.quantity && (
                        <td className="px-2 py-2 text-center text-gray-800 font-bold">
                          {item.quantity} <span className="text-gray-400 font-normal text-[10px]">دانە</span>
                        </td>
                      )}
                      {visibleColumns.purchasePrice && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{formatMoney(item.purchasePrice)}</td>}
                      {visibleColumns.expense && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{formatMoney(item.expense)}</td>}
                      {visibleColumns.cost && (
                        <td className="px-2 py-1 text-center text-gray-800" dir="ltr">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-500 font-bold">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-20 px-1.5 py-0.5 text-center border border-gray-300 rounded focus:outline-none focus:border-[#0b1f50] font-bold bg-white text-gray-800 shadow-sm"
                              value={
                                editingCost[`${item.productId}-${item.warehouseId}`] !== undefined
                                  ? editingCost[`${item.productId}-${item.warehouseId}`]
                                  : item.cost.toFixed(2)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow numbers and one decimal point
                                if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                  setEditingCost((prev) => ({
                                    ...prev,
                                    [`${item.productId}-${item.warehouseId}`]: val,
                                  }));
                                }
                              }}
                              onBlur={() => {
                                const val = editingCost[`${item.productId}-${item.warehouseId}`];
                                if (val !== undefined) {
                                  handleSaveCost(item.productId, item.warehouseId, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = editingCost[`${item.productId}-${item.warehouseId}`];
                                  if (val !== undefined) {
                                    handleSaveCost(item.productId, item.warehouseId, val);
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }
                              }}
                            />
                          </div>
                        </td>
                      )}
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

      {/* Edit Prices Modal */}
      {editingPriceItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#0b1f50] text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg m-0">دەستکاریکردنی نرخەکانی فرۆشتن</h3>
                <span className="text-xs text-blue-200 mt-1">{editingPriceItem.productName}</span>
              </div>
              <button onClick={() => setEditingPriceItem(null)} className="text-white hover:text-gray-300 text-2xl font-bold cursor-pointer">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-right" dir="rtl">
              <div className="space-y-4">
                {editingPrices.map((row, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex flex-col">
                      <label className="text-[11px] font-bold text-gray-500 mb-1 text-right">دراو</label>
                      <select
                        value={row.currencyId}
                        onChange={(e) => updateSalePrice(index, "currencyId", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-xs font-bold bg-white"
                      >
                        <option value="">دراو...</option>
                        {currencies
                          .filter((x: any) => x.isActive !== false)
                          .map((currency: any) => (
                            <option key={currency.id} value={currency.id}>
                              {currency.name} - {currency.symbol}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[11px] font-bold text-gray-500 mb-1 text-right">جۆری نرخ</label>
                      <select
                        value={row.priceType}
                        onChange={(e) => updateSalePrice(index, "priceType", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-xs font-bold bg-white"
                      >
                        {priceTypes.map((pt) => (
                          <option key={pt.id} value={pt.name}>
                            {pt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[11px] font-bold text-gray-500 mb-1 text-right">نرخ</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        lang="en"
                        dir="ltr"
                        value={row.amount}
                        onChange={(e) => updateSalePrice(index, "amount", e.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full p-2 border border-gray-300 rounded text-xs font-bold text-left bg-white"
                        placeholder="0.00"
                      />
                    </div>

                    <button
                      onClick={() => removeSalePriceRow(index)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-2 text-xs font-bold transition-colors cursor-pointer"
                      disabled={editingPrices.length === 1}
                    >
                      لابردن
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addSalePriceRow}
                className="mt-4 w-full border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 rounded py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                + زیادکردنی نرخی تر
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 shrink-0" dir="rtl">
              <button
                onClick={handleSavePrices}
                disabled={isSavingPrices}
                className="bg-[#0b1f50] hover:bg-[#061f5f] text-white px-5 py-2 rounded text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-55"
              >
                {isSavingPrices ? "پاشەکەوت دەکرێت..." : "پاشەکەوتکردن ✔️"}
              </button>
              <button
                onClick={() => setEditingPriceItem(null)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xs px-4 py-2 cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
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

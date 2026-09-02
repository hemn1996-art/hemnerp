"use client";

import MultiSelectDropdown from "../../components/MultiSelectDropdown";
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
  exchangeRateType?: string;
  customExchangeRate?: number;
}

export default function StockReportPage() {
  const router = useRouter();
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showReportStats, setShowReportStats] = useState(true);
  const [editingCost, setEditingCost] = useState<Record<string, string>>({});
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(25);

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
    warehouseIds: [] as (number | string)[],
    sellerNames: [] as string[],
    categories: [] as string[],
    brands: [] as string[],
    productIds: [] as (number | string)[],
    code: "",
    batchCode: "",
    warehouseStatus: "available",
    rateType: "all",
    currency: "all",
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

    const fetchAttributes = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/attributes?type=category"),
          fetch("/api/attributes?type=brand"),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (brandRes.ok) setBrands(await brandRes.json());
      } catch (e) {
        console.error("Failed to load attributes", e);
      }
    };
    fetchAttributes();

    if (typeof window !== "undefined") {
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
    if (filters.warehouseIds.length > 0) count++;
    if (filters.sellerNames.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.brands.length > 0) count++;
    if (filters.productIds.length > 0) count++;
    if (filters.code) count++;
    if (filters.batchCode) count++;
    if (filters.rateType && filters.rateType !== "all") count++;
    if (filters.currency && filters.currency !== "all") count++;
    if (filters.warehouseStatus && filters.warehouseStatus !== "available") count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setQuickSearch("");
    const cleanFilters = {
      warehouseIds: [] as (number | string)[],
      sellerNames: [] as string[],
      categories: [] as string[],
      brands: [] as string[],
      productIds: [] as (number | string)[],
      code: "",
      batchCode: "",
      warehouseStatus: "available",
      rateType: "all",
      currency: "all",
    };
    setFilters(cleanFilters);
    loadStockData(cleanFilters);
  };

  const loadStockData = async (overrideFilters?: any) => {
    const activeFilters = overrideFilters || filters;
    try {
      setLoading(true);
      setErrorMsg(null);
      const query = new URLSearchParams();
      if (activeFilters.warehouseIds.length > 0) query.append("warehouseId", activeFilters.warehouseIds.join(","));
      if (activeFilters.productIds.length > 0) query.append("productId", activeFilters.productIds.join(","));
      if (activeFilters.sellerNames.length > 0) query.append("sellerName", activeFilters.sellerNames.join(","));
      if (activeFilters.categories.length > 0) query.append("category", activeFilters.categories.join(","));
      if (activeFilters.brands.length > 0) query.append("brand", activeFilters.brands.join(","));
      if (activeFilters.code) query.append("code", activeFilters.code);
      if (activeFilters.rateType && activeFilters.rateType !== "all") query.append("rateType", activeFilters.rateType);
      if (activeFilters.currency && activeFilters.currency !== "all") query.append("currency", activeFilters.currency);
      if (activeFilters.warehouseStatus) query.append("status", activeFilters.warehouseStatus);

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
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
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

  const formatMoney = (amount: number, symbol: string = "$") => {
    const isIQD = symbol === "دینار" || symbol.includes("دینار") || symbol.includes("IQD") || symbol.includes("د.ع");
    return <FormattedNumber value={amount} currencySymbol={symbol} decimals={isIQD ? 0 : 2} />;
  };

  const getCurrencySymbol = (currencyId: number | string) => {
    const active = currencies?.find((c: any) => String(c.id) === String(currencyId) || c.code === currencyId);
    return active ? active.symbol : "$";
  };

  const formatSalePrices = (item: StockItem | any) => {
    const prices = item.salePrices && item.salePrices.length > 0
      ? item.salePrices
      : (item.sellPrice || item.price)
        ? [{ currencyId: 1, priceType: priceTypes[0]?.name || "نرخی تاک", amount: item.sellPrice || item.price }]
        : [];

    if (prices.length === 0) {
      return <span className="text-gray-400 font-normal">دیاری نەکراوە</span>;
    }

    const hasMultiplePriceTypes = priceTypes.length > 1;

    return (
      <div className="flex flex-col gap-0.5 items-center">
        {prices.map((sp: any, i: number) => {
          const symbol = getCurrencySymbol(sp.currencyId);
          const typeName = sp.priceType === "جوملە" && priceTypes[0]?.name ? priceTypes[0].name : sp.priceType;
          return (
            <div key={i} className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              <FormattedNumber value={sp.amount} currencySymbol={symbol} decimals={2} />
              {hasMultiplePriceTypes && typeName && (
                <span className="text-[10px] text-gray-400 font-normal">({typeName})</span>
              )}
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
            priceType: p.priceType === "جوملە" && priceTypes[0]?.name ? priceTypes[0].name : p.priceType,
            amount: String(p.amount),
          }))
        : [
            {
              currencyId: "1",
              priceType: priceTypes[0]?.name || "نرخی تاک",
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
        priceType: priceTypes[0]?.name || "نرخی تاک",
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

  const [quickSearch, setQuickSearch] = useState("");

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
        // Quick search filter (product name, code, brand, category)
        if (quickSearch && quickSearch.trim() !== "") {
          const q = quickSearch.toLowerCase().trim();
          const matchName = item.productName?.toLowerCase().includes(q);
          const matchCode = item.productCode?.toLowerCase().includes(q);
          const matchBrand = item.brand?.toLowerCase().includes(q);
          const matchCategory = item.category?.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchBrand && !matchCategory) return false;
        }

        // Category filter
        if (filters.categories.length > 0) {
          if (!filters.categories.includes(item.category)) return false;
        }
        // Brand filter
        if (filters.brands.length > 0) {
          if (!filters.brands.includes(item.brand)) return false;
        }
        // Currency filter
        if (filters.currency === "iqd") {
          if (!item.isIQD && item.currencyCode !== "IQD") return false;
        } else if (filters.currency === "usd") {
          if (item.isIQD || item.currencyCode === "IQD") return false;
        }
        return true;
      });
  }, [stockData, filters, products, quickSearch]);

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
      } else if (sortColumn === "purchasePrice") {
        valA = a.purchasePrice || 0;
        valB = b.purchasePrice || 0;
      } else if (sortColumn === "cost") {
        valA = a.cost || 0;
        valB = b.cost || 0;
      } else if (sortColumn === "expense") {
        valA = a.expense || 0;
        valB = b.expense || 0;
      } else if (sortColumn === "sellPrice") {
        valA = a.sellPrice || 0;
        valB = b.sellPrice || 0;
      }
      return sortDirection === "desc" ? valB - valA : valA - valB;
    });
  }, [filteredStockData, sortColumn, sortDirection]);

  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.ceil(sortedStockData.length / pageSize) || 1;
  }, [sortedStockData.length, pageSize]);

  const paginatedStockData = useMemo(() => {
    if (pageSize === "all") return sortedStockData;
    const start = (currentPage - 1) * pageSize;
    return sortedStockData.slice(start, start + pageSize);
  }, [sortedStockData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize, sortColumn, sortDirection]);

  // Calculate totals
  const totalItems = filteredStockData.length;
  const totalQuantity = filteredStockData.reduce((sum, item) => sum + item.quantity, 0);

  const totalValueUsd = filteredStockData.reduce((sum, item: any) => {
    const costInUsd = item.costUsd || item.purchasePriceUsd || (item.isIQD ? (item.cost / 1520) : item.cost);
    return sum + (costInUsd * item.quantity);
  }, 0);

  const totalValueIqd = filteredStockData.reduce((sum, item: any) => {
    if (item.isIQD || item.currencyCode === "IQD") {
      const costInIqd = item.rawCost || item.cost;
      return sum + (costInIqd * item.quantity);
    }
    return sum;
  }, 0);

  const hasIqdItems = filteredStockData.some((item: any) => item.isIQD || item.currencyCode === "IQD");

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
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی کۆگا</h2>
        </div>
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-6 no-print">
          {/* Quick Search for Product Name */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="گەڕانی خێرا بەپێی ناوی کەرەستە... 🔍"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2 text-xs rounded-lg border border-gray-300 bg-white font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b1f50] focus:border-[#0b1f50] shadow-sm transition-all"
            />
            {quickSearch && (
              <button
                onClick={() => setQuickSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold text-xs bg-gray-100 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                title="سڕینەوەی گەڕان"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-end items-center gap-2 w-full md:w-auto">
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
        </div>

        {/* Totals Cards */}
        {showReportStats && (
          <div className={`grid grid-cols-1 ${visibleColumns.warehouseValue ? (filters.currency === 'iqd' ? 'md:grid-cols-4' : 'md:grid-cols-3') : 'md:grid-cols-2'} gap-4 mb-6 animate-in fade-in duration-200`}>
            {visibleColumns.warehouseValue && (
              <div className="bg-white rounded-md p-5 border-r-4 border-blue-500 shadow-sm flex flex-col items-center justify-center">
                <span className="text-blue-900 font-medium text-sm mb-2">بەهای کۆگا بە دۆلاری ڕۆژ 🟢</span>
                <span className="text-2xl font-medium text-gray-800" dir="ltr">{formatMoney(totalValueUsd, "$")}</span>
              </div>
            )}
            
            {filters.currency === 'iqd' && (
              <div className="bg-amber-50/90 rounded-md p-5 border-r-4 border-amber-500 shadow-sm flex flex-col items-center justify-center border border-amber-200">
                <span className="text-amber-900 font-medium text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                  کۆی بەهای کۆگا بە دینار 🟠
                </span>
                <span className="text-2xl font-medium text-amber-950" dir="ltr">
                  {Math.round(totalValueIqd).toLocaleString("en-US")} <span className="text-base font-medium text-amber-700">دینار</span>
                </span>
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
            <table id="stock-report-table" className="w-full text-xs text-right whitespace-nowrap">
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
                  {visibleColumns.sellPrice && (
                    <th onClick={() => handleSort("sellPrice")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی زۆر/کەم">
                      نرخی فرۆشتن {sortColumn === "sellPrice" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
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
                  {visibleColumns.purchasePrice && (
                    <th onClick={() => handleSort("purchasePrice")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی زۆر/کەم">
                      نرخی کڕین {sortColumn === "purchasePrice" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                    </th>
                  )}
                  {visibleColumns.expense && (
                    <th onClick={() => handleSort("expense")} className="px-2 py-2.5 font-bold border-l border-white/10 text-center cursor-pointer hover:bg-white/10 select-none" title="کلیک بکە بۆ ڕێکخستنی زۆر/کەم">
                      خەرجی {sortColumn === "expense" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
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
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-red-500 text-3xl">⚠️</span>
                        <span className="text-red-600 font-bold text-sm">{errorMsg}</span>
                        <button 
                          onClick={() => loadStockData()} 
                          className="bg-[#0b1f50] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#061f5f] transition-colors"
                        >
                          هەوڵی دووبارە بدەرەوە 🔄
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : paginatedStockData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-gray-500 font-bold">هیچ داتایەک نەدۆزرایەوە</td>
                  </tr>
                ) : (
                  paginatedStockData.map((item: any, itemIdx) => {
                    // Currency detection: rely on server flags ONLY. Never guess from price magnitude.
                    const isIQDItem = item.isIQD === true || item.currencyCode === "IQD";
                    const itemSymbol = isIQDItem ? "دینار" : "$";
                    const itemPurchasePrice = isIQDItem ? (item.rawPurchasePrice || item.purchasePrice) : item.purchasePrice;
                    const itemCost = isIQDItem ? (item.rawCost || item.cost) : item.cost;
                    const itemDecimals = isIQDItem ? 0 : 2;
                    const rowNumber = pageSize === "all" ? (itemIdx + 1) : ((currentPage - 1) * (pageSize as number) + itemIdx + 1);

                    return (
                    <tr 
                      key={itemIdx} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {visibleColumns.id && <td className="px-2 py-2 text-center text-gray-500 font-bold">{rowNumber}</td>}
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
                      {visibleColumns.purchasePrice && (
                        <td className="px-2 py-2 text-center text-gray-800 font-bold" dir="ltr">
                          {isIQDItem ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-black border border-amber-300 bg-amber-100/90 text-amber-900 shadow-xs">
                              {formatMoney(itemPurchasePrice, itemSymbol)}
                            </span>
                          ) : item.exchangeRateType === "FIXED" ? (
                            <span 
                              title={item.customExchangeRate ? `نرخی جێگیری 100$: ${Number(item.customExchangeRate).toLocaleString("en-US")} دینار` : "دۆلاری جێگیر"}
                              className="inline-block px-2.5 py-1 rounded-lg text-sm font-black border cursor-pointer shadow-sm"
                              style={{ color: "#6b21a8", backgroundColor: "#f3e8ff", borderColor: "#c084fc" }}
                            >
                              {formatMoney(itemPurchasePrice, itemSymbol)}
                            </span>
                          ) : (
                            formatMoney(itemPurchasePrice, itemSymbol)
                          )}
                        </td>
                      )}
                      {visibleColumns.expense && <td className="px-2 py-2 text-center text-gray-800" dir="ltr">{formatMoney(item.expense, itemSymbol)}</td>}
                      {visibleColumns.cost && (
                        (() => {
                          const key = `${item.productId}-${item.warehouseId}`;
                          const isEditing = editingCellKey === key;
                          return (
                            <td className="px-2 py-1 text-center text-gray-800 font-bold" dir="ltr">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-gray-500 font-bold">{itemSymbol}</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    className="w-24 px-1.5 py-0.5 text-center border border-gray-300 rounded focus:outline-none focus:border-[#0b1f50] font-bold bg-white text-gray-800 shadow-sm"
                                    value={
                                      editingCost[key] !== undefined
                                        ? editingCost[key]
                                        : itemCost.toFixed(itemDecimals)
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                        setEditingCost((prev) => ({
                                          ...prev,
                                          [key]: val,
                                        }));
                                      }
                                    }}
                                    onBlur={() => {
                                      const val = editingCost[key];
                                      if (val !== undefined) {
                                        handleSaveCost(item.productId, item.warehouseId, val);
                                      }
                                      setEditingCellKey(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const val = editingCost[key];
                                        if (val !== undefined) {
                                          handleSaveCost(item.productId, item.warehouseId, val);
                                        }
                                        setEditingCellKey(null);
                                      } else if (e.key === "Escape") {
                                        setEditingCellKey(null);
                                      }
                                    }}
                                  />
                                </div>
                              ) : isIQDItem ? (
                                <span
                                  className="inline-block px-2.5 py-1 rounded-lg text-sm font-black border border-amber-300 bg-amber-100/90 text-amber-900 shadow-xs cursor-pointer"
                                  onClick={() => {
                                    setEditingCellKey(key);
                                    setEditingCost((prev) => ({ ...prev, [key]: itemCost.toFixed(itemDecimals) }));
                                  }}
                                  title="کلیک بکە بۆ دەستکاریکردن"
                                >
                                  <FormattedNumber value={itemCost} currencySymbol={itemSymbol} decimals={itemDecimals} />
                                </span>
                              ) : (item as any).exchangeRateType === "FIXED" ? (
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg border text-sm cursor-help font-black shadow-sm"
                                  style={{ backgroundColor: "#f3e8ff", borderColor: "#c084fc", color: "#6b21a8" }}
                                  title={`نرخی جێگیری 100$: ${((item as any).customExchangeRate || 135000).toLocaleString("en-US")} دینار`}
                                  onClick={() => {
                                    setEditingCellKey(key);
                                    setEditingCost((prev) => ({ ...prev, [key]: itemCost.toFixed(itemDecimals) }));
                                  }}
                                >
                                  <FormattedNumber value={itemPurchasePrice} currencySymbol={itemSymbol} decimals={itemDecimals} />
                                </span>
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCellKey(key);
                                    setEditingCost((prev) => ({ ...prev, [key]: itemCost.toFixed(itemDecimals) }));
                                  }}
                                  className="cursor-pointer hover:bg-gray-100 rounded px-2 py-0.5 inline-block font-bold"
                                  title="کلیک بکە بۆ دەستکاریکردن"
                                >
                                  <FormattedNumber value={itemCost} currencySymbol={itemSymbol} decimals={itemDecimals} />
                                </div>
                              )}
                            </td>
                          );
                        })()
                      )}
                      {visibleColumns.warehouseValue && (
                        <td className="px-2 py-2 text-center font-bold" dir="ltr">
                          {isIQDItem ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-black border border-amber-300 bg-amber-100/90 text-amber-900 shadow-xs">
                              {formatMoney(itemCost * item.quantity, itemSymbol)}
                            </span>
                          ) : (
                            formatMoney(itemCost * item.quantity, itemSymbol)
                          )}
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
                  );
                })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-sm font-bold text-gray-700 gap-3">
            <div>
              کۆی گشتی: {totalItems} کەرەستە {pageSize !== "all" && `(پەڕەی ${currentPage} لە ${totalPages})`}
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-gray-500">پیشاندان:</span>
                <select 
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPageSize(val === "all" ? "all" : Number(val));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none bg-white shadow-xs focus:border-[#0b1f50] cursor-pointer"
                >
                  <option value={10}>10 دانە</option>
                  <option value={25}>25 دانە</option>
                  <option value={50}>50 دانە</option>
                  <option value={100}>100 دانە</option>
                  <option value={1000}>1000 دانە</option>
                  <option value="all">هەمووی ♾️</option>
                </select>
              </div>

              {pageSize !== "all" && totalPages > 1 && (
                <div className="flex gap-1 items-center" dir="ltr">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-xs shadow-xs"
                  >
                    &lt;
                  </button>
                  <span className="px-3 py-1 bg-[#0b1f50] text-white rounded-lg font-bold text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-xs shadow-xs"
                  >
                    &gt;
                  </button>
                </div>
              )}
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
                  { key: 'sellPrice', label: 'نرخی فرۆشتن' },
                  { key: 'warehouseName', label: 'کۆگا' },
                  { key: 'quantity', label: 'عدد' },
                  { key: 'purchasePrice', label: 'نرخی کڕین' },
                  { key: 'expense', label: 'خەرجی' },
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

      {/* Edit Prices Modal */}
      {editingPriceItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setEditingPriceItem(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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
                        onChange={(e) => {
                          let clean = e.target.value.replace(/[^0-9.]/g, "");
                          clean = clean.replace(/^0+(?=\d)/, "");
                          updateSalePrice(index, "amount", clean);
                        }}
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
                <h4 className="font-bold text-gray-800 text-[14px] mb-3 flex items-center gap-2 justify-end">
                  <span>📦</span> فلتەری کەرەستە
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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

              <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <h4 className="font-bold text-amber-900 text-[13px] mb-1.5 flex items-center gap-1 justify-end">
                    <span>🟠</span> دراوی کڕین
                  </h4>
                  <select 
                    value={filters.currency}
                    onChange={e => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full border border-amber-300 rounded-xl p-3 text-sm text-amber-950 bg-amber-50/50 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">هەموو دراوەکان (دۆلار + دینار)</option>
                    <option value="iqd">تەنها کڕین بە دینار 🟠</option>
                    <option value="usd">تەنها کڕین بە دۆلار 🟢</option>
                  </select>
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-[13px] mb-1.5">بەردەستبوونی کەرەستە</h4>
                  <select 
                    value={filters.warehouseStatus}
                    onChange={e => setFilters(prev => ({ ...prev, warehouseStatus: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                  >
                    <option value="available">کەرەستە بەردەستەکان</option>
                    <option value="out_of_stock">کەرەستە تەواوبووەکان</option>
                    <option value="all">هەموو کەرەستەکان</option>
                  </select>
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-[13px] mb-1.5">جۆری دۆلار</h4>
                  <select 
                    value={filters.rateType}
                    onChange={e => setFilters(prev => ({ ...prev, rateType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 outline-none text-right min-h-[48px] font-bold shadow-sm focus:border-[#0b1f50]"
                  >
                    <option value="all">هەموو جۆرەکان</option>
                    <option value="FIXED">تەنها دۆلاری جێگیر</option>
                    <option value="DAILY_MARKET">تەنها دۆلاری ڕۆژ</option>
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

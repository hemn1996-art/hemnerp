"use client";

import React, { useEffect, useState, useRef } from "react";
import { useStore } from "../../store/store";
import { useRouter } from "next/navigation";
import PrintHeader from "../../components/PrintHeader";
import { exportTableToExcel } from "../../utils/excelExport";

interface DropdownOption {
  value: string | number;
  label: string;
}

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  searchable = false
}: {
  label: string;
  options: DropdownOption[];
  selectedValues: any[];
  onChange: (values: any[]) => void;
  searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const toggleOption = (val: any) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
    inputRef.current?.focus();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const handleRemoveValue = (e: React.MouseEvent, val: any) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== val));
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full text-right" dir="rtl">
      <div 
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`mui-outline cursor-pointer select-none flex items-center justify-between gap-3 transition-all min-h-[52px] ${
          isOpen ? "border-[#0b1f50] ring-2 ring-[#0b1f50]/10" : ""
        }`}
      >
        <label className="select-none pointer-events-none">{label}</label>

        {/* Selected chips list + Search input inline */}
        <div className="flex-1 flex flex-wrap gap-1.5 items-center justify-start overflow-hidden py-1">
          {selectedValues.map(val => {
            const opt = options.find(o => o.value === val);
            const name = opt ? opt.label : String(val);
            return (
              <div
                key={val}
                className="bg-slate-100 border border-slate-200 text-slate-800 rounded-full flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 text-[11px] font-black hover:bg-slate-200 transition-colors shadow-sm animate-in fade-in-50 duration-150"
              >
                <button
                  type="button"
                  onClick={(e) => handleRemoveValue(e, val)}
                  className="w-4 h-4 rounded-full bg-slate-300 text-slate-600 hover:bg-slate-400 hover:text-slate-800 flex items-center justify-center text-[10px] font-black border-none cursor-pointer shrink-0 transition-colors"
                >
                  ✕
                </button>
                <span className="truncate max-w-[120px] select-none">{name}</span>
              </div>
            );
          })}

          {searchable ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={selectedValues.length === 0 ? "هەموو" : ""}
              className="flex-1 min-w-[60px] max-w-full border-none outline-none text-xs font-black text-slate-800 bg-transparent py-0.5 focus:ring-0 focus:outline-none"
              dir="rtl"
              onClick={e => e.stopPropagation()}
              onFocus={() => setIsOpen(true)}
            />
          ) : (
            selectedValues.length === 0 && (
              <span className="text-slate-400 font-bold text-xs pr-1">هەموو</span>
            )
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 text-slate-500 shrink-0 pl-1 border-r border-slate-200 pr-2">
          {(selectedValues.length > 0 || searchTerm) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer text-sm font-bold flex items-center justify-center w-5 h-5"
              title="پاککردنەوەی هەموو"
            >
              ✕
            </button>
          )}
          <span className="text-[10px] select-none text-slate-400">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[1050] mt-1 right-0 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 max-h-72 overflow-y-auto flex flex-col text-right">
          <div className="overflow-y-auto flex-1 space-y-1 pr-1" style={{ maxHeight: "220px" }}>
            <div
              onClick={() => {
                onChange([]);
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-black transition-all ${
                selectedValues.length === 0
                  ? "bg-slate-100 text-[#0b1f50]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="select-none">هەموو (کۆی گشتی)</span>
              <input
                type="checkbox"
                checked={selectedValues.length === 0}
                readOnly
                className="w-4 h-4 rounded border-slate-300 text-[#0b1f50] focus:ring-[#0b1f50] accent-[#0b1f50] cursor-pointer"
              />
            </div>

            {filteredOptions.map(opt => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-black transition-all ${
                    isChecked
                      ? "bg-slate-100 text-[#0b1f50]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate max-w-[85%] select-none">{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-[#0b1f50] focus:ring-[#0b1f50] accent-[#0b1f50] cursor-pointer"
                  />
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="text-center text-slate-400 py-3 text-xs select-none">
                هیچ ئەنجامێک نەدۆزرایەوە
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemsReportPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showReportStats, setShowReportStats] = useState(true);

  const {
    accounts, fetchAccounts,
    products, fetchProducts,
    accountTypes, fetchAccountTypes,
    currencies, fetchCurrencies,
    warehouses, fetchWarehouses,
    invoices, fetchInvoices
  } = useStore() as any;

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

  // Filters
  const [filterVoucherTypes, setFilterVoucherTypes] = useState<string[]>([]);
  const [filterProductIds, setFilterProductIds] = useState<number[]>([]);
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [itemCode, setItemCode] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [filterAccountIds, setFilterAccountIds] = useState<number[]>([]);
  const [filterAccountTypeIds, setFilterAccountTypeIds] = useState<number[]>([]);
  const [currencyId, setCurrencyId] = useState("all");
  const [filterWarehouseIds, setFilterWarehouseIds] = useState<number[]>([]);
  const [label, setLabel] = useState("all");
  const [filterCreatedBys, setFilterCreatedBys] = useState<string[]>([]);
  const [isGift, setIsGift] = useState("all");
  const [groupReverse, setGroupReverse] = useState("all");

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [labelsList, setLabelsList] = useState<any[]>([]);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const defaultItemsCols = {
    voucherReference: true,
    voucherType: true,
    productName: true,
    category: true,
    brand: true,
    label: true,
    warehouseName: true,
    quantity: true,
    accountName: true,
  };
  const [visibleColumns, setVisibleColumns] = useState(defaultItemsCols);
  const colsLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_items_report_cols");
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
      localStorage.setItem("__erp_items_report_cols", JSON.stringify(visibleColumns));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns]);

  useEffect(() => {
    fetchAccounts?.();
    fetchProducts?.();
    fetchAccountTypes?.();
    fetchCurrencies?.();
    fetchWarehouses?.();
    fetchInvoices?.();

    if (typeof window !== "undefined") {
      try {
        const rawCat = localStorage.getItem("__erp_categories");
        if (rawCat) setCategoriesList(JSON.parse(rawCat));
      } catch (e) { console.error(e); }

      try {
        const rawBrand = localStorage.getItem("__erp_brands");
        if (rawBrand) setBrandsList(JSON.parse(rawBrand));
      } catch (e) { console.error(e); }

      try {
        const rawPkg = localStorage.getItem("__erp_packaging");
        if (rawPkg) setLabelsList(JSON.parse(rawPkg));
      } catch (e) { console.error(e); }

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
  }, [fetchAccounts, fetchProducts, fetchAccountTypes, fetchCurrencies, fetchWarehouses, fetchInvoices]);

  const employeeOptions = React.useMemo(() => {
    if (!invoices) return [];
    const fromVouchers = invoices.map((v: any) => v.employeeName).filter(Boolean) as string[];
    const defaults = ["کۆساری مەلا فەرهاد", "کاک زاھیر ھەڵەبجە", "کۆسار سەنتەری لەندەن", "هێمن حەمە فەرهاد"];
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
      if (filterProductIds.length > 0) query.append("productId", filterProductIds.join(","));
      if (filterAccountIds.length > 0) query.append("accountId", filterAccountIds.join(","));
      if (filterAccountTypeIds.length > 0) query.append("accountTypeId", filterAccountTypeIds.join(","));
      if (currencyId !== "all") query.append("currencyId", currencyId);
      if (filterWarehouseIds.length > 0) query.append("warehouseId", filterWarehouseIds.join(","));
      if (filterCreatedBys.length > 0) query.append("createdBy", filterCreatedBys.join(","));
      if (itemCode) query.append("itemCode", itemCode);
      if (batchCode) query.append("batchCode", batchCode);

      const res = await fetch(`/api/reports/items?${query.toString()}`);
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
    if (filterProductIds.length > 0) count++;
    if (category !== "all" && category !== "") count++;
    if (brand !== "all" && brand !== "") count++;
    if (itemCode) count++;
    if (batchCode) count++;
    if (filterAccountIds.length > 0) count++;
    if (filterAccountTypeIds.length > 0) count++;
    if (currencyId !== "all") count++;
    if (filterWarehouseIds.length > 0) count++;
    if (label !== "all" && label !== "") count++;
    if (filterCreatedBys.length > 0) count++;
    if (isGift !== "all") count++;
    if (groupReverse !== "all") count++;
    return count;
  }, [
    filterVoucherTypes, filterProductIds, category, brand, itemCode, batchCode,
    filterAccountIds, filterAccountTypeIds, currencyId, filterWarehouseIds, label,
    filterCreatedBys, isGift, groupReverse
  ]);

  const handleResetFilters = () => {
    setFilterVoucherTypes([]);
    setFilterProductIds([]);
    setCategory("all");
    setBrand("all");
    setItemCode("");
    setBatchCode("");
    setFilterAccountIds([]);
    setFilterAccountTypeIds([]);
    setCurrencyId("all");
    setFilterWarehouseIds([]);
    setLabel("all");
    setFilterCreatedBys([]);
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

  const itemsMatchingNonVoucherFilters = React.useMemo(() => {
    let result = items;

    // Apply category filter
    if (category && category !== "all" && category !== "") {
      result = result.filter((item: any) => {
        const prod = products?.find((p: any) => p.id === item.productId || p.name === item.productName);
        return prod && prod.category === category;
      });
    }

    // Apply brand filter
    if (brand && brand !== "all" && brand !== "") {
      result = result.filter((item: any) => {
        const prod = products?.find((p: any) => p.id === item.productId || p.name === item.productName);
        return prod && prod.brand === brand;
      });
    }

    // Apply label filter
    if (label && label !== "all" && label !== "") {
      result = result.filter((item: any) => {
        const prod = products?.find((p: any) => p.id === item.productId || p.name === item.productName);
        return prod && prod.packaging === label;
      });
    }

    // Apply search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.productName?.toLowerCase().includes(q) ||
        i.accountName?.toLowerCase().includes(q) ||
        i.voucherReference?.toString().includes(q)
      );
    }

    return result;
  }, [items, searchTerm, category, brand, label, products]);

  const showSalesReturnNotice = React.useMemo(() => {
    return filterVoucherTypes.length === 1 && filterVoucherTypes[0] === "sales" && itemsMatchingNonVoucherFilters.some(item => item.voucherType === "sales_return");
  }, [filterVoucherTypes, itemsMatchingNonVoucherFilters]);

  const showPurchaseReturnNotice = React.useMemo(() => {
    return filterVoucherTypes.length === 1 && filterVoucherTypes[0] === "purchase" && itemsMatchingNonVoucherFilters.some(item => item.voucherType === "purchase_return");
  }, [filterVoucherTypes, itemsMatchingNonVoucherFilters]);

  const filteredItems = React.useMemo(() => {
    let result = itemsMatchingNonVoucherFilters;

    // Apply client-side voucher type filter
    if (filterVoucherTypes.length > 0) {
      result = result.filter((item: any) => filterVoucherTypes.includes(item.voucherType));
    }

    return result.map((item: any) => {
      const prod = products?.find((p: any) => p.id === item.productId || p.name === item.productName);
      return {
        ...item,
        category: prod?.category || "-",
        brand: prod?.brand || "-",
        label: prod?.packaging || "-",
      };
    });
  }, [itemsMatchingNonVoucherFilters, filterVoucherTypes, products]);

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
    return "کۆی گشتی";
  };

  const totalQty = filteredItems.reduce((s, i) => s + (i.quantity || 0), 0);

  // Group line totals by currency
  const perCurrencyTotals = React.useMemo(() => {
    const totals: Record<number, number> = {};
    filteredItems.forEach((i) => {
      const curId = Number(i.currencyId || currencies.find((c: any) => c.code === "USD")?.id || 1);
      totals[curId] = (totals[curId] || 0) + (i.lineTotal || 0);
    });
    return totals;
  }, [filteredItems, currencies]);

  const formatCurrencyValue = (amount: number, curId: number) => {
    const currencyObj = currencies.find((c: any) => c.id === curId);
    const formattedNumber = amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    if (currencyObj?.code === "IQD") {
      return `${formattedNumber} دینار`;
    } else if (currencyObj?.code === "USD") {
      return `${formattedNumber} دۆلار`;
    }
    return `${formattedNumber} ${currencyObj?.name || ""}`;
  };

  const renderTotalMoney = () => {
    if (currencyId !== "all") {
      const filterCurId = Number(currencyId);
      const amount = perCurrencyTotals[filterCurId] || 0;
      return <span>{formatCurrencyValue(amount, filterCurId)}</span>;
    }

    const parts: string[] = [];
    Object.entries(perCurrencyTotals).forEach(([curIdStr, amount]) => {
      const curId = Number(curIdStr);
      if (Math.abs(amount) > 0.01) {
        parts.push(formatCurrencyValue(amount, curId));
      }
    });

    if (parts.length === 0) {
      const defCur = currencies.find((c: any) => c.code === "USD") || currencies[0] || { id: 1, name: "دۆلار" };
      return <span>{formatCurrencyValue(0, defCur.id)}</span>;
    }

    return <span>{parts.join(" + ")}</span>;
  };

  return (
    <div className="p-0 bg-slate-50 min-h-screen font-ckb text-slate-800">

      {/* Top Header Bar */}
      <div className="bg-[#0b1f50] text-white p-3 flex items-center justify-between no-print">
        <h1 className="text-lg font-bold">ڕاپۆرتی کەرەستە</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dates */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">بەرواری دەستپێک</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-slate-300 p-1.5 text-xs rounded" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">بەرواری کۆتایی</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-slate-300 p-1.5 text-xs rounded" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          {showSearch && (
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="گەڕان..."
              className="border border-blue-400 p-1.5 text-xs rounded w-48 outline-none" autoFocus />
          )}
          <button onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition">
            🔍 گەڕان
          </button>

          {/* Filter */}
          <button onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
            <span>☰ فلتەرەکان</span>
            {activeFiltersCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button onClick={handleResetFilters}
              className="flex items-center gap-1 bg-rose-100 border border-rose-300 text-rose-700 px-3 py-1.5 rounded text-xs hover:bg-rose-200 transition">
              🔄 ڕێکخستنەوە
            </button>
          )}

          {/* Print */}
          <button onClick={() => window.print()}
            className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
            🖨 پرینت
          </button>

          {/* Export to Excel */}
          <button onClick={() => exportTableToExcel("items-report-table", "raporti_kerestekan.xlsx")}
            className="flex items-center gap-1.5 bg-emerald-600 border border-emerald-700 text-white px-3 py-1.5 rounded text-xs hover:bg-emerald-700 transition cursor-pointer font-bold border-none shadow-sm">
            ناردن بۆ ئێکسڵ 📊
          </button>


          {/* Columns */}
          <button onClick={() => setShowColumnsModal(true)}
            className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
            🗂 ئۆڵۆمەکان
          </button>
        </div>
      </div>

      <div id="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <PrintHeader />
          <h2 className="text-center font-black text-lg mb-6">ڕاپۆرتی کەرەستە</h2>
        </div>

        {/* Summary Cards */}
        {showReportStats && (
          <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap items-center gap-6 justify-end animate-in fade-in duration-200">
            <div className="text-center px-6 py-2 border-r border-slate-200">
              <p className="text-2xl font-bold text-slate-800">{renderTotalMoney()}</p>
              <p className="text-[11px] text-slate-500">گشتی پارە</p>
            </div>
            <div className="text-center px-6 py-2 border-r border-slate-200">
              <p className="text-2xl font-bold text-slate-800">{totalQty.toLocaleString("en-US")} عدد</p>
              <p className="text-[11px] text-slate-500">{getQtyCardLabel()}</p>
            </div>
            <div className="text-center px-6 py-2">
              <p className="text-2xl font-bold text-slate-400">0 عدد</p>
              <p className="text-[11px] text-slate-500">کۆی گشتی دیاری</p>
            </div>
          </div>
        )}

      {/* Notice Banners */}
      {showSalesReturnNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm no-print text-right m-4" dir="rtl">
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
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm no-print text-right m-4" dir="rtl">
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
      <div className="overflow-x-auto max-h-[70vh]">
        <table id="items-report-table" className="w-full text-[11px] text-right">
          <thead className="bg-[#1e293b] text-white sticky top-0 z-10">
            <tr>
              {visibleColumns.accountName && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">هەژمار</th>}
              {visibleColumns.quantity && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">عدد</th>}
              {visibleColumns.warehouseName && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">کۆگا</th>}
              {visibleColumns.label && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">لەبێڵ</th>}
              {visibleColumns.brand && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">براند</th>}
              {visibleColumns.category && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">کاتیگۆری</th>}
              {visibleColumns.productName && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center min-w-[250px] allow-wrap">کەرەستە</th>}
              {visibleColumns.voucherType && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">جۆر</th>}
              {visibleColumns.voucherReference && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center w-24">پسوولە ↑</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center text-slate-500 text-sm">خەریکی هێنانی داتاکانە...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-slate-500 text-sm">هیچ داتایەک نەدۆزرایەوە.</td></tr>
            ) : (
              filteredItems.map((item, i) => (
                <tr key={item.id} className={`border-b border-slate-200 hover:bg-blue-50/50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                  {visibleColumns.accountName && <td className="p-2.5 border-r border-slate-200 text-center text-blue-700 font-medium whitespace-nowrap">{item.accountName}</td>}
                  {visibleColumns.quantity && (
                    <td className={`p-2.5 border-r border-slate-200 text-center font-bold ${item.quantity < 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {item.quantity.toLocaleString("en-US")} دانە
                    </td>
                  )}
                  {visibleColumns.warehouseName && <td className="p-2.5 border-r border-slate-200 text-center text-slate-500">{item.warehouseName}</td>}
                  {visibleColumns.label && <td className="p-2.5 border-r border-slate-200 text-center text-slate-400">{item.label}</td>}
                  {visibleColumns.brand && <td className="p-2.5 border-r border-slate-200 text-center text-slate-500">{item.brand}</td>}
                  {visibleColumns.category && <td className="p-2.5 border-r border-slate-200 text-center text-slate-500">{item.category}</td>}
                  {visibleColumns.productName && <td className="p-2.5 border-r border-slate-200 text-center text-slate-700 font-medium allow-wrap">{item.productName}</td>}
                  {visibleColumns.voucherType && <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{translateVoucherType(item.voucherType)}</td>}
                  {visibleColumns.voucherReference && (
                    <td className="p-2.5 border-r border-slate-200 text-center">
                      <span 
                        onClick={() => router.push(`/invoices?editId=${item.voucherId}&type=${item.voucherType}`)}
                        className="bg-[#1e40af] text-white px-4 py-1 rounded text-[10px] font-bold inline-block min-w-[50px] cursor-pointer hover:bg-blue-800 transition"
                        title="کردنەوەی پسوولە"
                      >
                        {item.voucherReference}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      </div>

      {/* Columns Modal */}
      {showColumnsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#0b1f50] p-3 flex items-center justify-between text-white">
              <h2 className="font-bold text-sm">کۆڵۆمە دیاریکراوەکان</h2>
              <button onClick={() => setShowColumnsModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <div className="p-2 flex flex-col max-h-[60vh] overflow-y-auto">
              {Object.entries({
                voucherReference: "پسوولە",
                voucherType: "جۆر",
                productName: "کەرەستە",
                category: "کاتیگۆری",
                brand: "براند",
                label: "لەبێڵ",
                warehouseName: "کۆگا",
                quantity: "عدد",
                accountName: "هەژمار",
              }).map(([key, lbl]) => (
                <label key={key} className="flex items-center justify-between p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-0">
                  <span className="text-[13px] font-medium text-slate-700">{lbl}</span>
                  <input type="checkbox"
                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                    onChange={(e) => setVisibleColumns((prev: any) => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600" />
                </label>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t flex gap-2">
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 bg-[#0b1f50] text-white py-2 rounded text-xs font-bold">جێبەجێکردن</button>
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 text-slate-600 py-2 rounded text-xs font-bold hover:bg-slate-200">پاشگەزبوونەوە</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-slate-300">✕</button>
                <h2 className="font-bold text-lg">ئۆپشنەکانی فلتەرکردن</h2>
              </div>
              <button className="text-white hover:text-slate-300 flex items-center gap-2 text-sm">
                <span>لابردنی هەموو</span> 🗑
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto bg-white text-right space-y-8">
              <style dangerouslySetInnerHTML={{__html: `
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 12px; padding: 13px 16px; background: white; transition: border-color 0.2s; }
                .mui-outline:focus-within { border-color: #3b82f6; }
                .mui-outline label { position: absolute; top: -10px; right: 12px; background: white; padding: 0 6px; color: #475569; font-size: 11px; font-weight: bold; }
                .mui-outline input, .mui-outline select { width: 100%; border: none; outline: none; background: transparent; font-size: 14px; color: #1e293b; font-weight: bold; cursor: pointer; }
                .section-title { display: flex; align-items: center; gap: 8px; color: #0f172a; font-weight: 900; font-size: 13px; margin-bottom: 16px; }
                .section-title::before { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
              `}} />

              {/* Section: Dates */}
              <div>
                <div className="section-title flex-row-reverse">مەودای بەروار <span>📅</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>بەرواری دەستپێک</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="mui-outline">
                    <label>بەرواری کۆتایی</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Section: Voucher Details */}
              <div>
                <div className="section-title flex-row-reverse">وردەکاری پسووڵە <span>📄</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
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
                </div>
              </div>

              {/* Section: Item Filter */}
              <div>
                <div className="section-title flex-row-reverse">فلتەری کەرەستە <span>📦</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>براند</label>
                    <select value={brand} onChange={e => setBrand(e.target.value)}>
                      <option value="all">هەموو</option>
                      {brandsList.map((b: any) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>کاتیگۆری</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="all">هەموو</option>
                      {categoriesList.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
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

              {/* Section: Account Info */}
              <div>
                <div className="section-title flex-row-reverse">زانیاری هەژمار <span>👤</span></div>
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

              {/* Section: Secondary Filters */}
              <div>
                <div className="section-title flex-row-reverse">فلتەرە لاوەکییەکان <span>⚙</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <MultiSelectDropdown
                      label="کۆگا"
                      options={warehouses?.map((w: any) => ({ value: w.id, label: w.name })) || []}
                      selectedValues={filterWarehouseIds}
                      onChange={setFilterWarehouseIds}
                      searchable
                    />
                  </div>
                  <div className="mui-outline">
                    <label>دراو (پارە)</label>
                    <select value={currencyId} onChange={e => setCurrencyId(e.target.value)}>
                      <option value="all">هەموو</option>
                      {currencies?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>لەبێڵ</label>
                    <select value={label} onChange={e => setLabel(e.target.value)}>
                      <option value="all">هەموو</option>
                      {labelsList.map((l: any) => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
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

              {/* Section: Display Options */}
              <div>
                <div className="section-title flex-row-reverse">ئۆپشنەکانی پیشاندان <span>👁</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>گرووپکردنی کەرەستە</label>
                    <select><option>نەخێر</option></select>
                  </div>
                  <div className="mui-outline">
                    <label>کۆدی وەجبە</label>
                    <select><option>پیشاندان</option></select>
                  </div>
                  <div className="mui-outline">
                    <label>دیاری</label>
                    <select value={isGift} onChange={e => setIsGift(e.target.value)}>
                      <option value="all">هەمووی</option>
                      <option value="yes">بەڵێ</option>
                      <option value="no">نەخێر</option>
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>گرووپ بەپێی پێچەوانەوە</label>
                    <select value={groupReverse} onChange={e => setGroupReverse(e.target.value)}>
                      <option value="all"></option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
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

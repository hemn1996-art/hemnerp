"use client";

import React, { useEffect, useState, useRef } from "react";
import { useStore } from "../../store/store";
import { useRouter } from "next/navigation";

export default function ItemsReportPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
  const [voucherType, setVoucherType] = useState("all");
  const [productId, setProductId] = useState("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [itemCode, setItemCode] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [accountId, setAccountId] = useState("all");
  const [accountTypeId, setAccountTypeId] = useState("all");
  const [currencyId, setCurrencyId] = useState("all");
  const [warehouseId, setWarehouseId] = useState("all");
  const [label, setLabel] = useState("all");
  const [createdBy, setCreatedBy] = useState("all");
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
      if (voucherType !== "all") query.append("voucherType", voucherType);
      if (productId !== "all") query.append("productId", productId);
      if (accountId !== "all") query.append("accountId", accountId);
      if (accountTypeId !== "all") query.append("accountTypeId", accountTypeId);
      if (currencyId !== "all") query.append("currencyId", currencyId);
      if (warehouseId !== "all") query.append("warehouseId", warehouseId);
      if (createdBy && createdBy !== "all") query.append("createdBy", createdBy);
      if (itemCode) query.append("itemCode", itemCode);
      if (batchCode) query.append("batchCode", batchCode);

      const res = await fetch(`/api/reports/items?${query.toString()}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      default: return type;
    }
  };

  const filteredItems = React.useMemo(() => {
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

    return result.map((item: any) => {
      const prod = products?.find((p: any) => p.id === item.productId || p.name === item.productName);
      return {
        ...item,
        category: prod?.category || "-",
        brand: prod?.brand || "-",
        label: prod?.packaging || "-",
      };
    });
  }, [items, searchTerm, category, brand, label, products]);

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
      <div className="bg-[#0b1f50] text-white p-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">ڕاپۆرتی کەرەستە</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
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
            className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
            ☰ فلتەرەکان
          </button>

          {/* Print */}
          <button onClick={() => window.print()}
            className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
            🖨 پرینت
          </button>

          {/* Columns */}
          <button onClick={() => setShowColumnsModal(true)}
            className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs hover:bg-slate-200 transition">
            🗂 ئۆڵۆمەکان
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap items-center gap-6 justify-end">
        <div className="text-center px-6 py-2 border-r border-slate-200">
          <p className="text-2xl font-bold text-slate-800">{renderTotalMoney()}</p>
          <p className="text-[11px] text-slate-500">گشتی پارە</p>
        </div>
        <div className="text-center px-6 py-2 border-r border-slate-200">
          <p className="text-2xl font-bold text-slate-800">{totalQty.toLocaleString("en-US")} عدد</p>
          <p className="text-[11px] text-slate-500">کۆی گشتی</p>
        </div>
        <div className="text-center px-6 py-2">
          <p className="text-2xl font-bold text-slate-400">0 عدد</p>
          <p className="text-[11px] text-slate-500">کۆی گشتی دیاری</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-[11px] text-right">
          <thead className="bg-[#1e293b] text-white sticky top-0 z-10">
            <tr>
              {visibleColumns.accountName && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">هەژمار</th>}
              {visibleColumns.quantity && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">عدد</th>}
              {visibleColumns.warehouseName && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">کۆگا</th>}
              {visibleColumns.label && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">لەبێڵ</th>}
              {visibleColumns.brand && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">براند</th>}
              {visibleColumns.category && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center">کاتیگۆری</th>}
              {visibleColumns.productName && <th className="p-2.5 border-r border-slate-600 whitespace-nowrap text-center min-w-[250px]">کەرەستە</th>}
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
                  {visibleColumns.quantity && <td className="p-2.5 border-r border-slate-200 text-center text-slate-700">{item.quantity} دانە</td>}
                  {visibleColumns.warehouseName && <td className="p-2.5 border-r border-slate-200 text-center text-slate-500">{item.warehouseName}</td>}
                  {visibleColumns.label && <td className="p-2.5 border-r border-slate-200 text-center text-slate-400">{item.label}</td>}
                  {visibleColumns.brand && <td className="p-2.5 border-r border-slate-200 text-center text-slate-500">{item.brand}</td>}
                  {visibleColumns.category && <td className="p-2.5 border-r border-slate-200 text-center text-slate-500">{item.category}</td>}
                  {visibleColumns.productName && <td className="p-2.5 border-r border-slate-200 text-center text-slate-700 font-medium">{item.productName}</td>}
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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden">
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
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; background: white; }
                .mui-outline label { position: absolute; top: -10px; right: 10px; background: white; padding: 0 4px; color: #64748b; font-size: 11px; }
                .mui-outline input, .mui-outline select { width: 100%; outline: none; background: transparent; font-size: 13px; color: #334155; }
                .section-title { display: flex; align-items: center; gap: 8px; color: #475569; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
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
                  <div className="mui-outline md:col-span-2">
                    <label>پسووڵە</label>
                    <select value={voucherType} onChange={e => setVoucherType(e.target.value)}>
                      <option value="all">هەموو</option>
                      <option value="sales">فرۆشتن</option>
                      <option value="purchase">کڕین</option>
                      <option value="sales_return">گەڕانەوەی فرۆشتن</option>
                      <option value="purchase_return">گەڕانەوەی کڕین</option>
                    </select>
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
                  <div className="mui-outline">
                    <label>کەرەستە</label>
                    <select value={productId} onChange={e => setProductId(e.target.value)}>
                      <option value="all"></option>
                      {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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
                  <div className="mui-outline">
                    <label>جۆری هەژمار</label>
                    <select value={accountTypeId} onChange={e => setAccountTypeId(e.target.value)}>
                      <option value="all"></option>
                      {accountTypes?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>هەژمار</label>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                      <option value="all"></option>
                      {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Secondary Filters */}
              <div>
                <div className="section-title flex-row-reverse">فلتەرە لاوەکییەکان <span>⚙</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>کۆگا</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="all"></option>
                      {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
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
                  <div className="mui-outline md:col-span-2">
                    <label>لە لایەن</label>
                    <select value={createdBy} onChange={e => setCreatedBy(e.target.value)}>
                      <option value="all">هەموو</option>
                      {employeeOptions.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                    </select>
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

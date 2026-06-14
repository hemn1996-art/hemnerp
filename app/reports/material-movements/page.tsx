"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "../../store/store";
import { useRouter } from "next/navigation";

export default function ItemsReportPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { 
    accounts, fetchAccounts, 
    products, fetchProducts,
    accountTypes, fetchAccountTypes,
    currencies, fetchCurrencies
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

  // Voucher Details
  const [voucherType, setVoucherType] = useState("all");
  const [voucherReference, setVoucherReference] = useState("");

  // Item Filters
  const [productId, setProductId] = useState("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [itemCode, setItemCode] = useState("");
  const [batchCode, setBatchCode] = useState("");

  // Account Filters
  const [accountId, setAccountId] = useState("all");
  const [accountTypeId, setAccountTypeId] = useState("all");

  // Secondary Filters
  const [currencyId, setCurrencyId] = useState("all");
  const [warehouseId, setWarehouseId] = useState("all");
  const [label, setLabel] = useState("all");
  const [createdBy, setCreatedBy] = useState("all");

  // Display Options
  const [profitStatus, setProfitStatus] = useState("all");
  const [isGift, setIsGift] = useState("all");
  const [groupReverse, setGroupReverse] = useState("all");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultCols = {
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
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("__erp_mat_movements_cols");
        if (stored) return { ...defaultCols, ...JSON.parse(stored) };
      } catch (e) {
        console.error(e);
      }
    }
    return defaultCols;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("__erp_mat_movements_cols", JSON.stringify(visibleColumns));
      } catch (e) {
        console.error(e);
      }
    }
  }, [visibleColumns]);

  useEffect(() => {
    fetchAccounts?.();
    fetchProducts?.();
    fetchAccountTypes?.();
    fetchCurrencies?.();
  }, [fetchAccounts, fetchProducts, fetchAccountTypes, fetchCurrencies]);

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
      if (voucherReference) query.append("voucherReference", voucherReference);
      
      if (productId !== "all") query.append("productId", productId);
      if (category !== "all") query.append("category", category);
      if (brand !== "all") query.append("brand", brand);
      if (batchCode) query.append("batchCode", batchCode);

      if (accountId !== "all") query.append("accountId", accountId);
      if (accountTypeId !== "all") query.append("accountTypeId", accountTypeId);

      if (currencyId !== "all") query.append("currencyId", currencyId);
      if (warehouseId !== "all") query.append("warehouseId", warehouseId);
      
      if (profitStatus !== "all") query.append("profitStatus", profitStatus);
      if (isGift !== "all") query.append("isGift", isGift);

      const res = await fetch(`/api/reports/material-movements?${query.toString()}`);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-ckb text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <span className="text-blue-700 text-lg">📊</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">ڕاپۆرتی جووڵەی کەرەستە</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Dates */}
          <div className="flex items-center gap-2 ml-4">
            <label className="text-xs text-slate-500">بەرواری دەستپێک</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-1.5 text-xs rounded-md" />
            <label className="text-xs text-slate-500">بەرواری کۆتایی</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-1.5 text-xs rounded-md" />
          </div>

          <button onClick={() => setShowFilterModal(true)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs hover:bg-slate-700 transition">
            <span className="text-sm">🔍</span> فلتەرەکان
          </button>
          
          <button onClick={() => setShowColumnsModal(true)} className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-xs hover:bg-blue-100 transition">
            <span className="text-sm">⚙️</span> کۆڵۆمەکان
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-r-4 border-r-blue-500 flex flex-col justify-center items-center">
          <p className="text-2xl font-bold text-slate-800">{items.reduce((s, i) => s + i.quantity, 0).toLocaleString("en-US")} عدد</p>
          <p className="text-xs text-slate-500 mt-1">کۆی گشتی کەرەستە</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-r-4 border-r-green-500 flex flex-col justify-center items-center">
          <p className="text-2xl font-bold text-green-600">{items.reduce((s, i) => s + (i.profit || 0), 0).toLocaleString("en-US")} $</p>
          <p className="text-xs text-slate-500 mt-1">کۆی قازانج</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-[11px] text-right">
            <thead className="bg-[#1e293b] text-white sticky top-0 z-10 border-b-4 border-slate-700">
              <tr>
                {visibleColumns.voucherReference && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center w-20">پسوولە ↑</th>}
                {visibleColumns.voucherType && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">جۆر</th>}
                {visibleColumns.accountName && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">هەژمار</th>}
                {visibleColumns.productName && <th className="p-3 border-r border-slate-600 whitespace-nowrap text-center">کەرەستە</th>}
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
              ) : items.length === 0 ? (
                <tr><td colSpan={15} className="p-8 text-center text-slate-500 text-sm">هیچ داتایەک نەدۆزرایەوە بەپێی ئەم فلتەرانە.</td></tr>
              ) : (
                items.map((item, i) => (
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
                    {visibleColumns.accountName && <td className="p-2 border-r border-slate-200 text-center text-blue-700 font-bold">{item.accountName}</td>}
                    {visibleColumns.productName && <td className="p-2 border-r border-slate-200 text-center font-bold text-[#334155]">{item.productName}</td>}
                    {visibleColumns.category && <td className="p-2 border-r border-slate-200 text-center text-slate-500">{item.category}</td>}
                    {visibleColumns.brand && <td className="p-2 border-r border-slate-200 text-center text-slate-500">{item.brand}</td>}
                    {visibleColumns.warehouseName && <td className="p-2 border-r border-slate-200 text-center text-slate-500">{item.warehouseName}</td>}
                    {visibleColumns.cost && <td className="p-2 border-r border-slate-200 text-center text-slate-600 font-medium">${Number(item.cost).toLocaleString()}</td>}
                    {visibleColumns.quantity && <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">{item.quantity} دانە</td>}
                    {visibleColumns.price && <td className="p-2 border-r border-slate-200 text-center text-slate-600 font-medium">${Number(item.price).toLocaleString()}</td>}
                    {visibleColumns.offers && <td className="p-2 border-r border-slate-200 text-center text-slate-400">-</td>}
                    {visibleColumns.discount && <td className="p-2 border-r border-slate-200 text-center text-slate-600">{item.discount > 0 ? `$${item.discount}` : '-'}</td>}
                    {visibleColumns.lineTotal && <td className="p-2 border-r border-slate-200 text-center bg-slate-50 font-bold text-slate-800">${Number(item.lineTotal).toLocaleString()}</td>}
                    {visibleColumns.profit && <td className="p-2 border-r border-slate-200 text-center bg-green-50 font-bold text-green-700">${Number(item.profit).toLocaleString()}</td>}
                    {visibleColumns.date && <td className="p-2 border-r border-slate-200 text-center text-slate-500 text-[10px]">{formatDate(item.date)}</td>}
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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0f172a] p-3 flex items-center justify-between text-white">
              <h2 className="font-bold text-sm">کۆڵۆمە دیاریکراوەکان</h2>
              <button onClick={() => setShowColumnsModal(false)} className="text-slate-400 hover:text-white">✕</button>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; background: white; }
                .mui-outline label { position: absolute; top: -10px; right: 10px; background: white; padding: 0 4px; color: #64748b; font-size: 11px; }
                .mui-outline input, .mui-outline select { width: 100%; outline: none; background: transparent; font-size: 13px; color: #334155; }
                .section-title { display: flex; align-items: center; gap: 8px; color: #475569; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
                .section-title::before { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
              `}} />

              {/* Section 1: Dates */}
              <div>
                <div className="section-title text-slate-600 flex-row-reverse">مەودای بەروار <span className="text-lg">📅</span></div>
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

              {/* Section 2: Voucher Details */}
              <div>
                <div className="section-title flex-row-reverse">وردەکاری پسووڵە <span className="text-lg">📄</span></div>
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

              {/* Section 3: Item Filter */}
              <div>
                <div className="section-title flex-row-reverse">فلتەری کەرەستە <span className="text-lg">📦</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>براند</label>
                    <select value={brand} onChange={e => setBrand(e.target.value)}>
                      <option value="all"></option>
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>کاتیگۆری</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="all"></option>
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

              {/* Section 4: Account Info */}
              <div>
                <div className="section-title flex-row-reverse">زانیاری هەژمار <span className="text-lg">👤</span></div>
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
                  <div className="mui-outline">
                    <label>کۆگا</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="all"></option>
                      <option value="1">کۆگای سەرەکی</option>
                    </select>
                  </div>
                  <div className="mui-outline md:col-span-2">
                    <label>لە لایەن</label>
                    <select value={createdBy} onChange={e => setCreatedBy(e.target.value)}>
                      <option value="all"></option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 6: Display Options */}
              <div>
                <div className="section-title flex-row-reverse">ئۆپشنەکانی پیشاندان <span className="text-lg">👁</span></div>
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

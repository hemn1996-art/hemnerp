"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DateInput from "../../components/DateInput";
import { useStore } from "../../store/store";

export default function ProfitReportPage() {
  const router = useRouter();
  
  const {
    accounts, fetchAccounts,
    products, fetchProducts,
    accountTypes, fetchAccountTypes,
    currencies, fetchCurrencies,
    warehouses, fetchWarehouses,
    invoices, fetchInvoices
  } = useStore() as any;

  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number>(1);
  const [accountId, setAccountId] = useState("all");
  const [accountTypeId, setAccountTypeId] = useState("all");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [productId, setProductId] = useState("all");
  const [warehouseId, setWarehouseId] = useState("all");
  const [createdBy, setCreatedBy] = useState("all");

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [data, setData] = useState({
    sales: 0,
    cogs: 0,
    salesProfit: 0,
    myDebtDiscount: 0,
    expenses: 0,
    gifts: 0,
    peopleDebtDiscount: 0,
    losses: 0,
    finalProfit: 0,
    receivables: 0,
    payables: 0,
    cash: 0,
    bank: 0,
    warehouseValue: 0,
    currencySymbol: "$",
  });
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

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
    }
  }, [fetchAccounts, fetchProducts, fetchAccountTypes, fetchCurrencies, fetchWarehouses, fetchInvoices]);

  const employeeOptions = useMemo(() => {
    if (!invoices) return [];
    const fromVouchers = invoices.map((v: any) => v.employeeName).filter(Boolean) as string[];
    const defaults = ["کۆساری مەلا فەرهاد", "کاک زاھیر ھەڵەبجە", "کۆسار سەنتەری لەندەن", "هێمن حەمە فەرهاد"];
    return Array.from(new Set([...defaults, ...fromVouchers]));
  }, [invoices]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (accountId !== "all") count++;
    if (accountTypeId !== "all") count++;
    if (brand !== "all") count++;
    if (category !== "all") count++;
    if (productId !== "all") count++;
    if (warehouseId !== "all") count++;
    if (createdBy !== "all") count++;
    return count;
  }, [accountId, accountTypeId, brand, category, productId, warehouseId, createdBy]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("currencyId", String(selectedCurrencyId));

      if (accountId !== "all") params.append("accountId", accountId);
      if (accountTypeId !== "all") params.append("accountTypeId", accountTypeId);
      if (brand !== "all") params.append("brand", brand);
      if (category !== "all") params.append("category", category);
      if (productId !== "all") params.append("productId", productId);
      if (warehouseId !== "all") params.append("warehouseId", warehouseId);
      if (createdBy !== "all") params.append("createdBy", createdBy);

      const res = await fetch(`/api/reports/profit?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedCurrencyId, accountId, accountTypeId, brand, category, productId, warehouseId, createdBy]);

  const handleResetFilters = () => {
    setAccountId("all");
    setAccountTypeId("all");
    setBrand("all");
    setCategory("all");
    setProductId("all");
    setWarehouseId("all");
    setCreatedBy("all");
    
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    const today = new Date();
    setEndDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  const handleCardClick = (type: string) => {
    if (type === "sales") {
      router.push("/reports/invoices?type=sales");
    }
  };

  const formatCur = (num: number) => {
    const symbol = data.currencySymbol || "$";
    const formatted = Math.abs(num).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 2});
    const isNegative = num < 0;
    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", direction: "ltr" }}>
        {isNegative && <span style={{ marginRight: "2px" }}>-</span>}
        <span style={{ fontSize: "0.8em", opacity: 0.7, marginRight: "4px" }}>
          {symbol}
        </span>
        <span>{formatted}</span>
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-l from-[#061f5f] to-[#03133f] rounded-3xl shadow-xl mb-6 p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-400 opacity-10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
              className="sidebar-toggle-btn items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all cursor-pointer text-xl shadow-lg shrink-0"
              title="گەورەکردنی سایدبار"
            >
              ☰
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black m-0 tracking-tight flex items-center gap-3">
                <span>ڕاپۆرتی قازانجی گشتی</span>
                <span className="text-3xl">📊</span>
              </h1>
              <p className="text-blue-200 mt-1 text-sm md:text-base font-medium">پوختەی دارایی و قازانجی پاکی سیستەمەکە لەماوەی دیاریکراودا</p>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR SECTION */}
      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">لە بەرواری:</span>
            <DateInput
              value={startDate}
              onChange={(val) => setStartDate(val)}
              className="border border-slate-300 p-1.5 text-xs rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">تا بەرواری:</span>
            <DateInput
              value={endDate}
              onChange={(val) => setEndDate(val)}
              className="border border-slate-300 p-1.5 text-xs rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <span className="text-[11px] font-bold text-slate-500">دراو:</span>
            <select
              value={selectedCurrencyId}
              onChange={(e) => setSelectedCurrencyId(Number(e.target.value))}
              className="border border-slate-300 p-1.5 text-xs rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              {currencies && currencies.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 bg-[#061f5f] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#03133f] transition shadow-md cursor-pointer border-none outline-none"
          >
            <span>☰ فلتەرەکان</span>
            {activeFiltersCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            ✖️ ڕێکخستنەوە
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-md cursor-pointer border-none outline-none"
          >
            🖨️ پرێنتکردن
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 border-4 border-slate-200 border-t-[#061f5f] rounded-full animate-spin shadow-md"></div>
          <p className="mt-6 text-[#061f5f] font-black text-xl animate-pulse">لە بارکردندایە...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full pb-10 space-y-6">

          {/* TOP ROW - 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* فرۆش - Sales */}
            <div
              onClick={() => handleCardClick("sales")}
              className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-black text-lg m-0">فرۆش</h3>
                <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🛒</div>
              </div>
              <div className="text-2xl font-black text-slate-800 mb-2" dir="ltr">{formatCur(data.sales)}</div>
              <p className="text-xs text-slate-400 font-medium m-0">کۆی گشتی فرۆش دوای گەڕاندنەوە</p>
            </div>

            {/* دەسمایە - COGS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-black text-lg m-0">دەسمایە</h3>
                <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📦</div>
              </div>
              <div className="text-2xl font-black text-slate-800 mb-2" dir="ltr">{formatCur(data.cogs)}</div>
              <p className="text-xs text-slate-400 font-medium m-0">کۆی گشتی دەسمایەی فرۆش دوای گەڕاندنەوە</p>
            </div>

            {/* قازانجی فرۆش - Sales Profit */}
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-emerald-900 font-black text-lg m-0">قازانجی فرۆش</h3>
                <div className="w-11 h-11 bg-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center text-xl shadow-inner">📈</div>
              </div>
              <div className="text-2xl font-black text-emerald-800 mb-2" dir="ltr">{formatCur(data.salesProfit)}</div>
              <p className="text-xs text-emerald-500 font-medium m-0">کۆی گشتی قازانجی فرۆش دوای گەڕاندنەوە</p>
            </div>

            {/* داشکاندن لە قەرزی من - My Debt Discount */}
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-emerald-900 font-black text-lg m-0">داشکاندن لە قەرزی من</h3>
                <div className="w-11 h-11 bg-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center text-xl shadow-inner">💲</div>
              </div>
              <div className="text-2xl font-black text-emerald-800 mb-2" dir="ltr">{formatCur(data.myDebtDiscount)}</div>
              <p className="text-xs text-emerald-500 font-medium m-0">بڕی پارەی داشکێنراو لە پسووڵەی کڕین، پارەی ڕۆشتوو و قەرزی من</p>
            </div>
          </div>

          {/* BOTTOM ROW - 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

            {/* خەرجی - Expenses */}
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-sm hover:shadow-lg hover:border-rose-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-rose-900 font-black text-lg m-0">خەرجی</h3>
                <div className="w-11 h-11 bg-rose-200 text-rose-700 rounded-xl flex items-center justify-center text-xl shadow-inner">💸</div>
              </div>
              <div className="text-2xl font-black text-rose-800 mb-2" dir="ltr">{formatCur(data.expenses + data.losses)}</div>
              <p className="text-xs text-rose-500 font-medium m-0">کۆی گشتی (خەرجی، خەسارەی کۆگا، سەرفی مەواد)</p>
            </div>

            {/* داشکاندن لە قەرزی خەڵک - People Debt Discount */}
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-sm hover:shadow-lg hover:border-rose-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-rose-900 font-black text-lg m-0">داشکاندن لە قەرزی خەڵک</h3>
                <div className="w-11 h-11 bg-rose-200 text-rose-700 rounded-xl flex items-center justify-center text-xl shadow-inner">✂️</div>
              </div>
              <div className="text-2xl font-black text-rose-800 mb-2" dir="ltr">{formatCur(data.peopleDebtDiscount)}</div>
              <p className="text-xs text-rose-500 font-medium m-0">بڕی پارەی داشکێنراو لە پسووڵەی فرۆشتن، پارەی هاتوو، قەرزی خەڵک</p>
            </div>

            {/* قازانجی کۆتایی - Final Profit */}
            <div className={`p-5 rounded-2xl border shadow-sm hover:shadow-lg transition-all ${data.finalProfit >= 0 ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400" : "bg-rose-50 border-rose-200 hover:border-rose-400"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-black text-lg m-0">قازانجی کۆتایی</h3>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner ${data.finalProfit >= 0 ? "bg-emerald-200 text-emerald-700" : "bg-rose-200 text-rose-700"}`}>{data.finalProfit >= 0 ? "📈" : "📉"}</div>
              </div>
              <div className={`text-2xl font-black mb-2 ${data.finalProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`} dir="ltr">{formatCur(data.finalProfit)}</div>
              <p className="text-xs text-slate-400 font-medium m-0">کۆی گشتی قازانجی کۆتایی</p>
            </div>
          </div>

        </div>
      )}

      {/* Filters Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#061f5f] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilterModal(false)} className="text-white hover:text-slate-300 border-none bg-transparent cursor-pointer text-lg font-bold">✕</button>
                <h2 className="font-black text-lg m-0">ئۆپشنەکانی فلتەرکردن</h2>
              </div>
              <button 
                onClick={handleResetFilters}
                className="text-white hover:text-slate-300 flex items-center gap-2 text-sm border-none bg-transparent cursor-pointer font-bold"
              >
                <span>لابردنی هەموو</span> 🗑️
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto bg-white text-right space-y-6">
              <style dangerouslySetInnerHTML={{__html: `
                .mui-outline { position: relative; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 14px; background: white; transition: border-color 0.2s; }
                .mui-outline:focus-within { border-color: #3b82f6; }
                .mui-outline label { position: absolute; top: -10px; right: 12px; background: white; padding: 0 6px; color: #475569; font-size: 11px; font-weight: bold; }
                .mui-outline select { width: 100%; border: none; outline: none; background: transparent; font-size: 13px; color: #1e293b; font-weight: bold; cursor: pointer; }
                .section-title { display: flex; align-items: center; gap: 8px; color: #0f172a; font-weight: 900; font-size: 13px; margin-bottom: 16px; }
                .section-title::before { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
              `}} />

              {/* Section: Dates */}
              <div>
                <div className="section-title flex-row-reverse">مەودای بەروار <span>📅</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>بەرواری دەستپێک</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="w-full border-none outline-none text-[13px] font-bold text-slate-800"
                    />
                  </div>
                  <div className="mui-outline">
                    <label>بەرواری کۆتایی</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="w-full border-none outline-none text-[13px] font-bold text-slate-800"
                    />
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
                      <option value="all">هەموو</option>
                      {accountTypes?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>هەژمار</label>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                      <option value="all">هەموو</option>
                      {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
                    <label>کاتێگۆری</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="all">هەموو</option>
                      {categoriesList.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mui-outline md:col-span-2">
                    <label>کەرەستە</label>
                    <select value={productId} onChange={e => setProductId(e.target.value)}>
                      <option value="all">هەموو</option>
                      {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Secondary Filters */}
              <div>
                <div className="section-title flex-row-reverse">فلتەرە لاوەکییەکان <span>⚙️</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mui-outline">
                    <label>کۆگا</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="all">هەموو</option>
                      {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="mui-outline">
                    <label>له‌ لایه‌ن</label>
                    <select value={createdBy} onChange={e => setCreatedBy(e.target.value)}>
                      <option value="all">هەموو</option>
                      {employeeOptions.map((emp: string) => <option key={emp} value={emp}>{emp}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-start gap-4">
              <button 
                onClick={() => setShowFilterModal(false)} 
                className="px-6 py-2.5 bg-[#061f5f] hover:bg-[#03133f] text-white rounded-xl text-sm font-black transition cursor-pointer shadow-md flex items-center gap-2 border-none"
              >
                جێبەجێکردنی فلتەرەکان ✔️
              </button>
              <button 
                onClick={() => setShowFilterModal(false)} 
                className="text-slate-600 hover:text-slate-900 text-sm font-bold border-none bg-transparent cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

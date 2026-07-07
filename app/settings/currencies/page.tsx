"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "../../store/store";

type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  mode: string | null;
  rounding: boolean;
  color: string | null;
  isActive: boolean;
  createdAt: string;
};

type RateHistory = {
  id: string;
  currencyId: number;
  currencyName: string;
  oldRate: number;
  newRate: number;
  change: number;
  changePercent: number;
  changedBy: string;
  date: string;
};

const DEFAULT_HISTORY: RateHistory[] = [
  {
    id: "h1",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1530,
    newRate: 1535,
    change: 5,
    changePercent: 0.33,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 03:31 pm",
  },
  {
    id: "h2",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1550,
    newRate: 1530,
    change: -20,
    changePercent: -1.29,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 03:01 pm",
  },
  {
    id: "h3",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1500,
    newRate: 1550,
    change: 50,
    changePercent: 3.33,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 02:51 pm",
  },
  {
    id: "h4",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1550,
    newRate: 1500,
    change: -50,
    changePercent: -3.23,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 02:51 pm",
  },
  {
    id: "h5",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1535,
    newRate: 1550,
    change: 15,
    changePercent: 0.98,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 02:49 pm",
  },
  {
    id: "h6",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1550,
    newRate: 1535,
    change: -15,
    changePercent: -0.97,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 02:48 pm",
  },
  {
    id: "h7",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 1355,
    newRate: 1550,
    change: 195,
    changePercent: 14.39,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 02:48 pm",
  },
  {
    id: "h8",
    currencyId: 2,
    currencyName: "دینار",
    oldRate: 0,
    newRate: 1355,
    change: 1355,
    changePercent: 0,
    changedBy: "کۆساری مەلا فەرهاد",
    date: "16/05/2026, 02:46 pm",
  },
];

export default function CurrenciesPage() {
  const { fetchCurrencies } = useStore();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form" | "history">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCurrencyId, setFilterCurrencyId] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [formRate, setFormRate] = useState("1");
  const [formMode, setFormMode] = useState("1");
  const [formRounding, setFormRounding] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formColor, setFormColor] = useState("#3b82f6");

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [history, setHistory] = useState<RateHistory[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  useEffect(() => {
    loadCurrencies();
    // Load or initialize rate history
    const savedHistory = localStorage.getItem("currency_rate_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        setHistory(DEFAULT_HISTORY);
      }
    } else {
      setHistory(DEFAULT_HISTORY);
      localStorage.setItem("currency_rate_history", JSON.stringify(DEFAULT_HISTORY));
    }
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/currencies");
      if (res.ok) {
        const data = await res.json();
        setCurrencies(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleEditClick = (curr: Currency) => {
    setSelectedCurrency(curr);
    setFormName(curr.name);
    setFormCode(curr.code);
    setFormSymbol(curr.symbol);
    setFormRate(String((curr.rate ?? 0) * 100));
    setFormMode(curr.mode || "1");
    setFormRounding(curr.rounding);
    setFormIsActive(curr.isActive);
    setFormColor(curr.color || "#3b82f6");
    setView("form");
    setActiveDropdownId(null);
  };

  const handleNewClick = () => {
    setSelectedCurrency(null);
    setFormName("");
    setFormCode("");
    setFormSymbol("");
    setFormRate("100");
    setFormMode("1");
    setFormRounding(false);
    setFormIsActive(true);
    setFormColor("#3b82f6");
    setView("form");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode || !formSymbol) {
      showToast("تکایە هەموو فیلدە ناچاریەکان پڕبکەرەوە", "error");
      return;
    }

    const payload = {
      id: selectedCurrency?.id,
      name: formName,
      code: formCode,
      symbol: formSymbol,
      rate: Number(formRate) / 100,
      mode: formMode,
      rounding: formRounding,
      color: formColor,
      isActive: formIsActive,
    };

    try {
      const method = selectedCurrency ? "PUT" : "POST";
      const res = await fetch("/api/currencies", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved: Currency = await res.json();
        
        // Log rate change in history if rate was changed
        const oldRate = (selectedCurrency?.rate ?? 0) * 100;
        const newRate = Number(formRate);
        if (selectedCurrency && oldRate !== newRate) {
          const change = newRate - oldRate;
          const changePercent = oldRate !== 0 ? Number(((change / oldRate) * 100).toFixed(2)) : 0;
          
          const newHistoryItem: RateHistory = {
            id: String(Date.now()),
            currencyId: selectedCurrency.id,
            currencyName: selectedCurrency.name,
            oldRate,
            newRate,
            change,
            changePercent,
            changedBy: "کۆساری مەلا فەرهاد",
            date: new Date().toLocaleString("en-GB", { hour12: true }),
          };

          const updatedHistory = [newHistoryItem, ...history];
          setHistory(updatedHistory);
          localStorage.setItem("currency_rate_history", JSON.stringify(updatedHistory));
        }

        showToast("دراوەکە بە سەرکەوتوویی خەزنکرا ✅", "success");
        setView("list");
        loadCurrencies();
        fetchCurrencies(); // Sync global store
      } else {
        showToast("خەزنکردنی دراو شکست هێنا", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("هەڵەیەک ڕوویدا لە کاتی خەزنکردن", "error");
    }
  };

  const handleResetHistory = () => {
    setHistory(DEFAULT_HISTORY);
    localStorage.setItem("currency_rate_history", JSON.stringify(DEFAULT_HISTORY));
    showToast("مێژووی نرخەکان ڕێکخرایەوە 🔄", "success");
  };

  const filteredCurrencies = useMemo(() => {
    return currencies.filter((curr) => {
      const matchesSearch =
        curr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curr.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [currencies, searchQuery]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesCurrency = filterCurrencyId === "all" || String(item.currencyId) === filterCurrencyId;
      const matchesSearch = item.currencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.changedBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCurrency && matchesSearch;
    });
  }, [history, filterCurrencyId, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 rtl font-sans p-6 pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 left-6 z-50 px-6 py-3.5 rounded-2xl shadow-xl border text-white font-bold transition-all duration-300 backdrop-blur-md ${
            toastType === "success"
              ? "bg-[#10b981]/90 border-[#34d399]/40"
              : "bg-[#f43f5e]/90 border-[#f87171]/40"
          }`}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="text-slate-800 text-2xl font-bold cursor-pointer hover:bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-none bg-transparent lg:hidden"
          >
            ☰
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 m-0">ڕێکخستنی دراوەکان</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">بەڕێوەبردن و ڕێکخستنی نرخ و دراوەکانی سیستەم.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
              view === "list" ? "bg-[#0b1f50] text-white" : "bg-slate-100 text-slate-650 hover:bg-slate-200"
            }`}
          >
            🗂️ بینینی دراوەکان
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
              view === "history" ? "bg-[#0b1f50] text-white" : "bg-slate-100 text-slate-650 hover:bg-slate-200"
            }`}
          >
            📈 مێژووی نرخەکان
          </button>
        </div>
      </div>

      {/* ── View 1: Currency View Table (List) ── */}
      {view === "list" && (
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Top Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 گەڕان بۆ ناوی دراو یان کۆد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-semibold"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs border-none"
              >
                🖨️ پرێنتکردن
              </button>
              <button
                onClick={handleNewClick}
                className="bg-[#0b1f50] hover:bg-[#061f5f] text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs border-none"
              >
                ➕ دراوی نوێ
              </button>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-[#0f172a] text-white">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold">ناو</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">نرخ بۆ ١٠٠ $</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">مۆد</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">نزیککردنەوە</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">ڕەنگ</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">حاڵەت</th>
                  <th className="px-6 py-4 text-sm font-bold">دروستکرا</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">چالاکی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-450">
                      باردەکرێت... 🔄
                    </td>
                  </tr>
                ) : filteredCurrencies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-450">
                      هیچ دراوێک نەدۆزرایەوە 📭
                    </td>
                  </tr>
                ) : (
                  filteredCurrencies.map((curr) => (
                    <tr key={curr.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-extrabold flex items-center gap-2">
                        <span>{curr.name}</span>
                        <span className="text-xs text-slate-400 font-medium">({curr.symbol})</span>
                      </td>
                      <td className="px-6 py-4 text-center font-black">
                        {((curr.rate ?? 0) * 100).toLocaleString("en-US")}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 font-bold">
                        {curr.mode || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          curr.rounding ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {curr.rounding ? "بەڵێ" : "نەخێر"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div
                          className="w-5 h-5 rounded-md mx-auto shadow-sm"
                          style={{ backgroundColor: curr.color || "#3b82f6" }}
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                          curr.isActive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {curr.isActive ? "چالاک" : "ناچالاک"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-700">کۆساری مەلا فەرهاد</span>
                          <span>{new Date(curr.createdAt).toLocaleDateString("en-GB")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center relative">
                        <button
                          onClick={() => setActiveDropdownId(activeDropdownId === curr.id ? null : curr.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                        >
                          زیاتر ⚙️
                        </button>
                        {activeDropdownId === curr.id && (
                          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40 text-right">
                            <button
                              onClick={() => handleEditClick(curr)}
                              className="w-full text-right px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                            >
                              <span>✏️</span> نوێکردنەوە
                            </button>
                            <button
                              onClick={() => {
                                setFilterCurrencyId(String(curr.id));
                                setView("history");
                              }}
                              className="w-full text-right px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-transparent border-t border-slate-100"
                            >
                              <span>📈</span> مێژووی نرخ
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="bg-slate-55 p-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
              <span>کۆی گشتی: {filteredCurrencies.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── View 2: Form (Add / Edit) ── */}
      {view === "form" && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-250/80 shadow-md overflow-hidden">
          {/* Form Header Info */}
          <div className="bg-blue-50 text-blue-700 text-sm font-bold p-4 border-b border-blue-100">
            ئەو فێڵدانەی کە بە * نیشانە کراون داواکراون.
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            <h2 className="text-lg font-black text-slate-800 text-center m-0">
              {selectedCurrency ? `نوێکردنەوەی دراو / ${selectedCurrency.name}` : "دروستکردنی دراوی نوێ"}
            </h2>

            {/* Row 1: Name */}
            <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
              <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                ناو *
              </span>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-850 text-right"
                  placeholder="ناوی دراو بنووسە..."
                />
                <span className="px-3 text-slate-400 font-bold border-r border-slate-100">{formSymbol || "$"}</span>
              </div>
            </div>

            {/* Row 2: Code, Symbol */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  کۆد (کورتکراوە) *
                </span>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-850 text-left"
                  placeholder="USD, IQD"
                  dir="ltr"
                />
              </div>

              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  هێما (Symbol) *
                </span>
                <input
                  type="text"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-850 text-left"
                  placeholder="$, د.ع"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Row 3: Rate, Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  نرخ *
                </span>
                <input
                  type="number"
                  step="any"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-850 text-left"
                  placeholder="1.0"
                  dir="ltr"
                />
              </div>

              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  مۆد *
                </span>
                <input
                  type="text"
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-850 text-left"
                  placeholder="1"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Row 4: Rounding, Active */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  نزیککردنەوە *
                </span>
                <select
                  value={formRounding ? "yes" : "no"}
                  onChange={(e) => setFormRounding(e.target.value === "yes")}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer appearance-none text-right"
                >
                  <option value="no">نەخێر</option>
                  <option value="yes">بەڵێ</option>
                </select>
              </div>

              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  حاڵەت *
                </span>
                <select
                  value={formIsActive ? "active" : "inactive"}
                  onChange={(e) => setFormIsActive(e.target.value === "active")}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer appearance-none text-right"
                >
                  <option value="active">چالاک</option>
                  <option value="inactive">ناچالاک</option>
                </select>
              </div>
            </div>

            {/* Row 5: Color Pick */}
            <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-3 flex items-center justify-between">
              <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                ڕەنگ (Color Theme)
              </span>
              <span className="text-sm font-bold text-slate-500">ڕەنگی تایبەتی دراو</span>
              <input
                type="color"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="w-10 h-10 border-0 rounded-lg cursor-pointer bg-transparent"
              />
            </div>

            {/* Large Preview Color Box */}
            <div
              className="w-full h-20 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-sm transition-all"
              style={{ backgroundColor: formColor }}
            >
              پێشبینی ڕەنگی دراو: {formName || "..."} ({formSymbol || "..."})
            </div>

            {/* Buttons */}
            <div className="flex justify-start gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="bg-[#0b1f50] text-white px-8 py-2.5 rounded-xl shadow-md text-sm font-bold hover:bg-[#061f5f] transition-all cursor-pointer border-none"
              >
                💾 خەزنکردن
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="bg-transparent hover:bg-slate-100 text-slate-500 font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer border-none text-sm"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── View 3: Currency Rate History ── */}
      {view === "history" && (
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Top Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="🔍 گەڕان لە مێژوو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-xs border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-semibold"
              />
              <div className="relative border border-slate-250 rounded-xl bg-white px-2 py-1.5 flex items-center w-48">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[10px] font-bold text-slate-400">
                  دراو
                </span>
                <select
                  value={filterCurrencyId}
                  onChange={(e) => setFilterCurrencyId(e.target.value)}
                  className="w-full bg-transparent px-2 py-1 text-xs font-semibold outline-none text-slate-700 cursor-pointer appearance-none text-right"
                >
                  <option value="all">هەموو دراوەکان</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs border-none"
              >
                🖨️ پرێنتکردن
              </button>
              <button
                onClick={handleResetHistory}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs border-none"
              >
                🔄 ڕێکخستنەوەی مێژوو
              </button>
            </div>
          </div>

          {/* History Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-[#0f172a] text-white">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold">دراو</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">نرخی کۆن</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">نرخی نوێ</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">گۆڕان</th>
                  <th className="px-6 py-4 text-sm font-bold text-center">% گۆڕان</th>
                  <th className="px-6 py-4 text-sm font-bold">گۆڕدراوە لەلایەن</th>
                  <th className="px-6 py-4 text-sm font-bold">بەروار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-450">
                      هیچ تۆمارێک نەدۆزرایەوە لە مێژوودا 📭
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => {
                    const scaleRate = (val: number) => {
                      if (val > 0 && val < 10000) return val * 100;
                      return val;
                    };
                    const oRate = scaleRate(item.oldRate ?? 0);
                    const nRate = scaleRate(item.newRate ?? 0);
                    const chg = nRate - oRate;
                    const isIncrease = chg > 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-extrabold">
                          {item.currencyName}
                        </td>
                        <td className="px-6 py-4 text-center font-black">
                          {oRate.toLocaleString("en-US")}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-slate-900">
                          {nRate.toLocaleString("en-US")}
                        </td>
                        <td className={`px-6 py-4 text-center font-black ${
                          chg === 0 ? "text-slate-500" : isIncrease ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {chg === 0 ? "0" : `${isIncrease ? "+" : ""}${chg.toLocaleString("en-US")}`}
                        </td>
                        <td className={`px-6 py-4 text-center font-black ${
                          item.changePercent === 0 ? "text-slate-500" : isIncrease ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {item.changePercent === 0 ? "0%" : `${isIncrease ? "+" : ""}${item.changePercent}%`}
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-bold">
                          {item.changedBy}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                          {item.date}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="bg-slate-55 p-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
              <span>کۆی گشتی: {filteredHistory.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

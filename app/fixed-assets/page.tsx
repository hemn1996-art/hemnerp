"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store/store";
import DateInput from "../components/DateInput";

interface Category {
  id: number;
  name: string;
}

interface AssetHistory {
  id: number;
  assetId: number;
  value: number;
  changeDate: string;
  note: string | null;
  createdAt: string;
}

interface FixedAsset {
  id: number;
  name: string;
  categoryId: number;
  code: string | null;
  initialValue: number;
  currentValue: number;
  purchaseDate: string;
  isActive: boolean;
  category: {
    id: number;
    name: string;
  };
  history: AssetHistory[];
}

export default function FixedAssetsPage() {
  const router = useRouter();
  const currentUser = useStore((s: any) => s.currentUser);

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  // Modal States
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [showValueModal, setShowValueModal] = useState(false);
  const [valuingAsset, setValuingAsset] = useState<FixedAsset | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<FixedAsset | null>(null);

  // Form Fields - Asset CRUD
  const [nameInput, setNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [initialValueInput, setInitialValueInput] = useState("");
  const [purchaseDateInput, setPurchaseDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [isActiveInput, setIsActiveInput] = useState(true);

  // Form Fields - Value Change
  const [newValueInput, setNewValueInput] = useState("");
  const [changeDateInput, setChangeDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [valueNoteInput, setValueNoteInput] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resAssets, resCategories] = await Promise.all([
        fetch("/api/fixed-assets"),
        fetch("/api/fixed-asset-categories")
      ]);

      if (resAssets.ok && resCategories.ok) {
        const dataAssets = await resAssets.json();
        const dataCategories = await resCategories.json();
        setAssets(dataAssets);
        setCategories(dataCategories);
      } else {
        showToast("هەڵەیەک لە هێنانی داتاکان ڕوویدا", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("پەیوەندی لەگەڵ سێرڤەر نییە", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setNameInput("");
    setCategoryInput(categories[0]?.id ? String(categories[0].id) : "");
    setCodeInput("");
    setInitialValueInput("");
    setPurchaseDateInput(new Date().toISOString().split("T")[0]);
    setIsActiveInput(true);
    setShowAssetModal(true);
  };

  const handleOpenEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setNameInput(asset.name);
    setCategoryInput(String(asset.categoryId));
    setCodeInput(asset.code || "");
    setPurchaseDateInput(new Date(asset.purchaseDate).toISOString().split("T")[0]);
    setIsActiveInput(asset.isActive);
    setShowAssetModal(true);
  };

  const handleOpenValueModal = (asset: FixedAsset) => {
    setValuingAsset(asset);
    setNewValueInput(String(asset.currentValue));
    setChangeDateInput(new Date().toISOString().split("T")[0]);
    setValueNoteInput("");
    setShowValueModal(true);
  };

  const handleOpenHistoryModal = (asset: FixedAsset) => {
    setHistoryAsset(asset);
    setShowHistoryModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast("تکایە ناوی موجودات بنووسە", "error");
      return;
    }
    if (!categoryInput) {
      showToast("تکایە کاتیگۆری هەڵبژێرە", "error");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        name: nameInput.trim(),
        categoryId: Number(categoryInput),
        code: codeInput.trim() || null,
        purchaseDate: new Date(purchaseDateInput).toISOString(),
        isActive: isActiveInput
      };

      let res;
      if (editingAsset) {
        payload.id = editingAsset.id;
        res = await fetch("/api/fixed-assets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        payload.initialValue = Number(initialValueInput) || 0;
        res = await fetch("/api/fixed-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingAsset ? "مەوجودات بە سەرکەوتوویی نوێکرایەوە ✅" : "مەوجودات نوێ بە سەرکەوتوویی زیادکرا ✅", "success");
        setShowAssetModal(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "تۆمارکردن سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("سەرکەوتوو نەبوو", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveValueChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valuingAsset) return;
    if (newValueInput.trim() === "") {
      showToast("تکایە بەهای نوێ بنووسە", "error");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/fixed-assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: valuingAsset.id,
          newValue: Number(newValueInput),
          changeDate: new Date(changeDateInput).toISOString(),
          note: valueNoteInput.trim() || null
        })
      });

      if (res.ok) {
        showToast("بەهای موجودات بە سەرکەوتوویی نوێکرایەوە ✅", "success");
        setShowValueModal(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "گۆڕینی بەها سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("سەرکەوتوو نەبوو", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (asset: FixedAsset) => {
    try {
      const res = await fetch("/api/fixed-assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          isActive: !asset.isActive
        })
      });

      if (res.ok) {
        showToast("دۆخی چالاکی موجودات گۆڕدرا ✅");
        fetchData();
      } else {
        showToast("گۆڕینی دۆخی چالاکی سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("سەرکەوتوو نەبوو", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("ئایا دڵنیای لە سڕینەوەی ئەم موجوداتە؟")) return;

    try {
      const res = await fetch(`/api/fixed-assets?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        showToast("مەوجودات بە سەرکەوتوویی سڕایەوە ✅");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "سڕینەوە سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("هەڵە لە سڕینەوە", "error");
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.code && asset.code.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      !selectedCategoryFilter || asset.categoryId === Number(selectedCategoryFilter);

    return matchesSearch && matchesCategory;
  });

  const fmt = (n: number) => {
    return "$ " + n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="p-4 md:p-6 bg-[#f8f9fb] min-h-screen font-ckb text-slate-700" dir="rtl">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[9999] border backdrop-blur-md transition-all animate-bounce ${
          toast.type === "success" 
            ? "bg-emerald-500/90 text-white border-emerald-400" 
            : "bg-red-500/90 text-white border-red-400"
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>{toast.type === "success" ? "✅" : "❌"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header Box */}
      <div className="bg-[#0b1f50] text-white p-6 rounded-3xl shadow-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <span>🏛️ بەڕێوەبردنی مەوجودات</span>
          </h1>
          <p className="text-xs text-blue-200 mt-1">بۆ بەڕێوەبردن، دەستکاریکردن، کڕین و بەدواداچوونی بەها و داخورانی مەوجوداتی کۆمپانیا</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/fixed-asset-categories")}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-2xl transition duration-150 cursor-pointer text-sm border border-white/10"
          >
            🗂️ کاتیگۆرییەکان
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl transition duration-150 cursor-pointer shadow-md text-sm border-none"
          >
            ➕ زیادکردنی مەوجودات
          </button>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
        
        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row md:justify-between items-center gap-4">
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="🔍 گەڕان بە ناو یان کۆد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold text-slate-700 shadow-sm bg-white"
            />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold text-slate-700 shadow-sm bg-white"
            >
              <option value="">هەموو کاتیگۆرییەکان 📁</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-auto flex justify-end text-xs text-slate-400 font-bold">
            کۆی مەوجوداتی پۆلێنکراو: {filteredAssets.length}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-200">
                <th className="py-3 px-2 text-slate-500 font-bold text-xs w-12">#</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs text-right">ناو</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">کاتیگۆری</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">کۆد</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">بەرواری کڕین</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">بەهای سەرەتایی</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">بەهای ئێستا</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">دۆخ</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs w-96">کردار</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-slate-400 font-bold">
                    خەریکی بارکردنی داتایە...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-slate-400 font-bold">
                    هیچ موجوداتێک نەدۆزرایەوە
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, index) => (
                  <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-2 text-slate-400 text-xs font-bold">{index + 1}</td>
                    <td className="py-4 px-4 text-slate-800 font-bold text-sm text-right">{asset.name}</td>
                    <td className="py-4 px-4 text-slate-600 font-medium text-xs">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        {asset.category?.name || "بێ کاتیگۆری"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-xs">{asset.code || "—"}</td>
                    <td className="py-4 px-4 text-slate-600 font-bold text-xs">
                      {new Date(asset.purchaseDate).toLocaleDateString("en-US")}
                    </td>
                    <td className="py-4 px-4 text-slate-700 font-black text-xs" dir="ltr">{fmt(asset.initialValue)}</td>
                    <td className="py-4 px-4 text-emerald-700 font-black text-sm" dir="ltr">{fmt(asset.currentValue)}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        onClick={() => handleToggleActive(asset)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-85 active:scale-95 transition-all select-none ${
                          asset.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title="کلیک بکە بۆ گۆڕینی دۆخی چالاکبوون"
                      >
                        {asset.isActive ? 'چالاک 🟢' : 'ناچالاک 🔴'}
                      </span>
                    </td>
                    <td className="py-4 px-4 flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenValueModal(asset)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                      >
                        گۆڕینی بەها 💲
                      </button>
                      <button
                        onClick={() => handleOpenHistoryModal(asset)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                      >
                        مێژووی بەها 📋
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                      >
                        دەستکاری 📝
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer border-none"
                      >
                        سڕینەوە 🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">
                {editingAsset ? "📝 دەستکاریکردنی موجودات" : "➕ زیادکردنی موجوداتی نوێ"}
              </h3>
              <button 
                onClick={() => setShowAssetModal(false)}
                className="text-white hover:text-slate-300 bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleSaveAsset}>
              <div className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">ناوی موجودات:</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold bg-white text-right"
                    placeholder="سەیارەی بار، کورسی..."
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">کاتیگۆری:</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold bg-white text-right"
                    required
                  >
                    <option value="">کاتیگۆری هەڵبژێرە</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Code */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">کۆد یان نیشانە:</label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold bg-white text-right"
                    placeholder="کۆدی موجودات..."
                  />
                </div>

                {/* Initial Value (Only when adding) */}
                {!editingAsset && (
                  <div className="space-y-1 text-right">
                    <label className="text-xs font-bold text-slate-500">بەهای سەرەتایی (دۆلار):</label>
                    <input
                      type="number"
                      value={initialValueInput}
                      onChange={(e) => setInitialValueInput(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold bg-white text-right"
                      placeholder="0"
                      required
                    />
                  </div>
                )}

                {/* Purchase Date */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">بەرواری کڕین:</label>
                  <DateInput
                    value={purchaseDateInput}
                    onChange={setPurchaseDateInput}
                    label={false}
                    className="w-full"
                  />
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">مەوجودات چالاکە؟</span>
                  <input
                    type="checkbox"
                    checked={isActiveInput}
                    onChange={(e) => setIsActiveInput(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-start gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#0b1f50] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition border-none cursor-pointer"
                >
                  {isSaving ? "چاوەڕوانبە..." : "خەزنکردن 💾"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border-none cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Value Modal */}
      {showValueModal && valuingAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">
                💲 گۆڕینی بەهای موجودات
              </h3>
              <button 
                onClick={() => setShowValueModal(false)}
                className="text-white hover:text-slate-300 bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleSaveValueChange}>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right space-y-1.5">
                  <div className="text-xs text-slate-500 font-bold">ناوی موجودات: <span className="text-slate-800 font-black">{valuingAsset.name}</span></div>
                  <div className="text-xs text-slate-500 font-bold">بەهای ئێستا: <span className="text-emerald-700 font-black" dir="ltr">{fmt(valuingAsset.currentValue)}</span></div>
                </div>

                {/* New Value */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">بەهای نوێ (دۆلار):</label>
                  <input
                    type="number"
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    className="w-full px-4 py-2.5 border border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-bold bg-white text-right"
                    placeholder="بەهای نوێ بنووسە..."
                    required
                  />
                </div>

                {/* Change Date */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">بەرواری گۆڕین:</label>
                  <DateInput
                    value={changeDateInput}
                    onChange={setChangeDateInput}
                    label={false}
                    className="w-full"
                  />
                </div>

                {/* Note */}
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">تێبینی / هۆکاری گۆڕین:</label>
                  <input
                    type="text"
                    value={valueNoteInput}
                    onChange={(e) => setValueNoteInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold bg-white text-right"
                    placeholder="بۆ نموونە: داخورانی ساڵانە..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-start gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition border-none cursor-pointer"
                >
                  {isSaving ? "چاوەڕوانبە..." : "سەبتکردن 💾"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowValueModal(false)}
                  className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border-none cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white flex-shrink-0">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <span>📋 مێژووی بەهای {historyAsset.name}</span>
              </h3>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-white hover:text-slate-300 bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 text-right" dir="rtl">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-bold">بەهای سەرەتایی: <span className="text-slate-800 font-black" dir="ltr">{fmt(historyAsset.initialValue)}</span></div>
                <div className="text-xs text-slate-500 font-bold">بەهای ئێستا: <span className="text-emerald-700 font-black" dir="ltr">{fmt(historyAsset.currentValue)}</span></div>
              </div>

              {historyAsset.history && historyAsset.history.length > 0 ? (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="py-2.5 px-2 text-slate-500 font-bold text-xs w-12">#</th>
                        <th className="py-2.5 px-4 text-slate-500 font-bold text-xs text-right">بەروار</th>
                        <th className="py-2.5 px-4 text-slate-500 font-bold text-xs">بەهای نوێ</th>
                        <th className="py-2.5 px-4 text-slate-500 font-bold text-xs text-right">تێبینی / هۆکار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyAsset.history.map((hist, idx) => (
                        <tr key={hist.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-2 text-slate-400 text-xs font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs text-right">
                            {new Date(hist.changeDate).toLocaleDateString("en-US")} {new Date(hist.changeDate).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-black text-sm" dir="ltr">{fmt(hist.value)}</td>
                          <td className="py-3 px-4 text-slate-500 text-xs text-right">{hist.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-bold">هیچ گۆڕانکارییەک لە بەها تۆمار نەکراوە</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-start flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border-none cursor-pointer"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

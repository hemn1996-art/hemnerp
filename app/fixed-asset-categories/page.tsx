"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store/store";

interface Category {
  id: number;
  name: string;
  _count: {
    assets: number;
  };
}

export default function FixedAssetCategoriesPage() {
  const router = useRouter();
  const currentUser = useStore((s: any) => s.currentUser);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fixed-asset-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        showToast("هەڵەیەک لە هێنانی کاتیگۆرییەکان ڕوویدا", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("پەیوەندی لەگەڵ سێرڤەر نییە", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast("تکایە ناوی کاتیگۆری بنووسە", "error");
      return;
    }

    try {
      setIsSaving(true);
      const payload = { name: nameInput.trim() };
      let res;
      
      if (editingCategory) {
        res = await fetch("/api/fixed-asset-categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingCategory.id })
        });
      } else {
        res = await fetch("/api/fixed-asset-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingCategory ? "کاتیگۆری بە سەرکەوتوویی دەستکاری کرا ✅" : "کاتیگۆری نوێ بە سەرکەوتوویی زیادکرا ✅", "success");
        setShowModal(false);
        setEditingCategory(null);
        setNameInput("");
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "خەزنکردن سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("سەرکەوتوو نەبوو", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("ئایا دڵنیای لە سڕینەوەی ئەم کاتیگۆرییە؟")) return;

    try {
      const res = await fetch(`/api/fixed-asset-categories?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        showToast("کاتیگۆری بە سەرکەوتوویی سڕایەوە ✅");
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "سڕینەوە سەرکەوتوو نەبوو ❌", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("هەڵە لە سڕینەوە", "error");
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

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
            <span>🗂️ کاتیگۆرییەکانی مەوجودات</span>
          </h1>
          <p className="text-xs text-blue-200 mt-1">بۆ بەڕێوەبردن و پۆلێنکردنی مەوجوداتەکان (سەیارە، کورسی، مێز...)</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setNameInput("");
            setShowModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl transition duration-150 cursor-pointer shadow-md text-sm border-none"
        >
          ➕ زیادکردنی کاتیگۆری
        </button>
      </div>

      {/* Search and List Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
        
        {/* Search Input */}
        <div className="mb-6 flex justify-end">
          <input
            type="text"
            placeholder="🔍 گەڕان لە کاتیگۆرییەکان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold text-slate-700 shadow-sm bg-white"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-200">
                <th className="py-3 px-2 text-slate-500 font-bold text-xs w-16">#</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs text-right">ناو</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs">ژمارەی مەوجوداتەکان</th>
                <th className="py-3 px-4 text-slate-500 font-bold text-xs w-48">کردار</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-slate-400 font-bold">
                    خەریکی بارکردنی داتایە...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-slate-400 font-bold">
                    هیچ کاتیگۆرییەک نەدۆزرایەوە
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => (
                  <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-slate-400 text-xs font-bold">{index + 1}</td>
                    <td className="py-3 px-4 text-slate-800 font-bold text-sm text-right">{cat.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-bold text-sm">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-black">
                        {cat._count?.assets || 0} موجود
                      </span>
                    </td>
                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setNameInput(cat.name);
                          setShowModal(true);
                        }}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-xl text-xs transition duration-150 cursor-pointer border-none"
                      >
                        دەستکاری 📝
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-xl text-xs transition duration-150 cursor-pointer border-none"
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

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0b1f50] p-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">
                {editingCategory ? "📝 دەستکاریکردنی کاتیگۆری" : "➕ زیادکردنی کاتیگۆری نوێ"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white hover:text-slate-300 bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-slate-500">ناوی کاتیگۆری:</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0b1f50] text-sm font-bold bg-white text-right"
                    placeholder="کاتیگۆری بنووسە..."
                    autoFocus
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
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border-none cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

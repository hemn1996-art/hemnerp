"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store/store";
import AlertModal from "./AlertModal";

type WarehouseLike = {
  id: number;
  name: string;
  color?: string | null;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
};

type ToastType = "error" | "success" | "info";

export default function WarehouseSettingsPage() {
  const warehousesState = useStore((state) => state.warehouses) || [];
  const fetchWarehouses = useStore((state) => state.fetchWarehouses);
  const addWarehouse = useStore((state) => state.addWarehouse);
  const updateWarehouse = useStore((state) => state.updateWarehouse);
  const deleteWarehouse = useStore((state) => state.deleteWarehouse);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("success");

  // View state: "list" or "form"
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isMain, setIsMain] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "error" | "warning" | "success" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "warning", title: "", message: "" });

  const showAlert = (
    type: "error" | "warning" | "success" | "confirm",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => setAlertConfig({ isOpen: true, type, title, message, onConfirm });

  const closeAlert = () => setAlertConfig((a: any) => ({ ...a, isOpen: false }));

  useEffect(() => {
    fetchWarehouses().finally(() => setIsLoading(false));
  }, [fetchWarehouses]);

  function showToast(message: string, type: ToastType = "success") {
    setToastMessage(message);
    setToastType(type);
    window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  const filteredWarehouses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return warehousesState.filter((w: any) => {
      if (!q) return true;
      return (
        String(w.name || "").toLowerCase().includes(q) ||
        (w.isMain ? "سەرەکی" : "").includes(q)
      );
    });
  }, [warehousesState, search]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setColor("#3b82f6");
    setIsMain(false);
    setIsActive(true);
  }

  function handleAddClick() {
    resetForm();
    setViewMode("form");
  }

  function handleEditClick(w: WarehouseLike) {
    setEditingId(w.id);
    setName(w.name);
    setColor(w.color || "#3b82f6");
    setIsMain(w.isMain);
    setIsActive(w.isActive);
    setViewMode("form");
  }

  function handleCancel() {
    resetForm();
    setViewMode("list");
  }

  function validateForm() {
    if (!name.trim()) {
      showToast("تکایە ناوی کۆگا بنووسە.", "error");
      return false;
    }

    const duplicate = warehousesState.find(
      (w: any) =>
        w.id !== editingId &&
        w.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      showToast("ئەم ناوی کۆگایە پێشتر تۆمارکراوە.", "error");
      return false;
    }

    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;

    const payload = {
      name: name.trim(),
      color,
      isMain,
      isActive,
    };

    if (editingId) {
      const res = await updateWarehouse({ id: editingId, ...payload });
      if (res) {
        showToast("کۆگاکە بە سەرکەوتوویی نوێکرایەوە ✅", "success");
        setViewMode("list");
        resetForm();
      } else {
        showToast("نوێکردنەوە سەرکەوتوو نەبوو ❌", "error");
      }
    } else {
      const res = await addWarehouse(payload);
      if (res) {
        showToast("کۆگای نوێ زیادکرا ✅", "success");
        setViewMode("list");
        resetForm();
      } else {
        showToast("زیادکردن سەرکەوتوو نەبوو ❌", "error");
      }
    }
  }

  async function handleDeleteClick(id: number, wName: string) {
    showAlert(
      "confirm",
      "دڵنیایت لە سڕینەوە؟",
      `ئایا دڵنیای لە سڕینەوەی کۆگای "${wName}"؟`,
      async () => {
        closeAlert();
        const success = await deleteWarehouse(id);
        if (success) {
          showToast("کۆگا سڕایەوە ✅", "success");
        } else {
          showToast("سڕینەوە سەرکەوتوو نەبوو ❌", "error");
        }
      }
    );
  }

  return (
    <div className="p-6 rtl text-gray-900 font-sans min-h-screen pb-20">
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] min-w-[360px] max-w-[80vw] px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-2xl transition-all ${
            toastType === "success"
              ? "bg-green-600"
              : toastType === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          <span>{toastMessage}</span>
          <button
            className="text-white hover:text-gray-200 transition-colors text-2xl bg-transparent border-none cursor-pointer"
            onClick={() => setToastMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Card Header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 flex justify-between items-center shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
              className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
              title="گەورەکردنی سایدبار"
            >
              ☰
            </button>
            <h1 className="text-3xl font-black text-[#0b1f50] m-0">ڕێکخستنی کۆگا</h1>
          </div>
          <p className="mt-2 text-gray-500 font-medium">بەڕێوەبردنی کۆگاکانی کەرەستە و ماددەکان.</p>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {/* Actions and Search */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer border-none"
                onClick={handleAddClick}
              >
                <span className="text-xl">+</span> زیادکردن
              </button>
              <button
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer bg-white"
                onClick={() => {
                  setIsLoading(true);
                  fetchWarehouses().finally(() => setIsLoading(false));
                }}
              >
                🔄 ڕێکخستنەوە
              </button>
              <button
                className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer bg-white"
                onClick={() => window.print()}
                title="پرێنتکردن"
              >
                🖨️
              </button>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="گەڕان بە ناو، جۆر، بارودۆخ..."
                className="w-full md:w-[320px] px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              />
              <div className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-full font-black text-sm whitespace-nowrap">
                کۆی گشتی: {filteredWarehouses.length}
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-[#0b1f50] text-white font-black">
              خشتەی بینینی کۆگاکان
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm border-collapse">
                <thead className="bg-[#0f296d] text-white/95 text-xs font-bold uppercase">
                  <tr>
                    <th className="px-6 py-4">ناو</th>
                    <th className="px-6 py-4">ڕەنگ</th>
                    <th className="px-6 py-4">سەرەکییە؟</th>
                    <th className="px-6 py-4">حاڵەت</th>
                    <th className="px-6 py-4">دروستکرا</th>
                    <th className="px-6 py-4 text-center">چالاکی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold">
                        بار دەکرێت... 🔄
                      </td>
                    </tr>
                  ) : filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        هیچ کۆگایەک نەدۆزرایەوە
                      </td>
                    </tr>
                  ) : (
                    filteredWarehouses.map((w: any) => (
                      <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-800">{w.name}</td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-block w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                            style={{ backgroundColor: w.color || "#cbd5e1" }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          {w.isMain ? (
                            <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-lg font-bold text-xs">
                              بەڵێ
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {w.isActive ? (
                            <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-md font-bold text-xs">
                              چالاک
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-md font-bold text-xs">
                              ناچالاک
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-bold text-xs">
                          {new Date(w.createdAt).toLocaleDateString("en-GB")}{" "}
                          {new Date(w.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditClick(w)}
                              className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 px-3.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                            >
                              دەستکاری
                            </button>
                            <button
                              onClick={() => handleDeleteClick(w.id, w.name)}
                              className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                            >
                              سڕینەوە
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Form Card */
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm max-w-2xl mx-auto overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-[#0b1f50] text-white font-black text-lg">
            {editingId ? "دەستکاریکردنی کۆگا" : "زیادکردنی کۆگا"}
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl font-bold text-sm">
              ئەو فێڵدانەی کە بە * نیشانە کراون داواکراون.
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">ناو *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ناوی کۆگا"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              />
            </div>

            {/* Is Main Select */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">سەرەکییە؟ *</label>
              <select
                value={isMain ? "yes" : "no"}
                onChange={(e) => setIsMain(e.target.value === "yes")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
              >
                <option value="no">نەخێر</option>
                <option value="yes">بەڵێ</option>
              </select>
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">بارودۆخ</label>
              <select
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
              >
                <option value="active">چالاک</option>
                <option value="inactive">ناچالاک</option>
              </select>
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">ڕەنگی ناسێنەر</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-0 overflow-hidden"
                />
                <span className="font-mono text-gray-500 text-sm">{color}</span>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer bg-white"
                onClick={handleCancel}
              >
                پاشگەزبوونەوە
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm cursor-pointer border-none"
                onClick={handleSave}
              >
                خەزنکردن
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

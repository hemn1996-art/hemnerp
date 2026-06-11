"use client";

import { useEffect, useState, useRef } from "react";
import AlertModal from "../../components/AlertModal";

type InvoiceTemplate = {
  id?: number;
  name: string;
  isActive: boolean;
  isMain: boolean;
  format: string; // "A4" | "80mm"
  headerImage: string | null;
  footerImage: string | null;
  watermarkImage: string | null;
  statementHeaderImage: string | null;
  fixedNote: string | null;
  tableHeaderBg: string;
  tableHeaderColor: string;
  employeeName: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isEditing, setIsEditing] = useState(false);

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

  const closeAlert = () => setAlertConfig((a) => ({ ...a, isOpen: false }));

  // Form State
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate>({
    name: "",
    isActive: true,
    isMain: false,
    format: "A4",
    headerImage: null,
    footerImage: null,
    watermarkImage: null,
    statementHeaderImage: null,
    fixedNote: "سپاس بۆ کڕینەکەتان! هیوادارین تەندروست بن.",
    tableHeaderBg: "#E6F7FA",
    tableHeaderColor: "#000000",
    employeeName: "کۆساری مەلا فەرهاد",
  });

  const fileInputHeaderRef = useRef<HTMLInputElement>(null);
  const fileInputFooterRef = useRef<HTMLInputElement>(null);
  const fileInputWatermarkRef = useRef<HTMLInputElement>(null);
  const fileInputStatementRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/invoice-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        showToast("کێشەیەک ڕوویدا لە بارکردنی کڵێشەکان", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("پەیوەندی بە داتابەیس پچڕا", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "headerImage" | "footerImage" | "watermarkImage" | "statementHeaderImage"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentTemplate((prev) => ({
          ...prev,
          [field]: reader.result as string,
        }));
        showToast("وێنەکە بە سەرکەوتوویی بارکرا 🖼️", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteImage = (
    field: "headerImage" | "footerImage" | "watermarkImage" | "statementHeaderImage",
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    setCurrentTemplate((prev) => ({ ...prev, [field]: null }));
    if (inputRef.current) inputRef.current.value = "";
    showToast("وێنەکە سڕایەوە 🗑️", "success");
  };

  const handleSave = async () => {
    if (!currentTemplate.name.trim()) {
      showToast("تکایە ناوی کڵێشەکە بنووسە", "error");
      return;
    }

    try {
      const url = currentTemplate.id
        ? `/api/invoice-templates/${currentTemplate.id}`
        : "/api/invoice-templates";
      const method = currentTemplate.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentTemplate),
      });

      if (res.ok) {
        showToast("کڵێشەکە بە سەرکەوتوویی خەزن کرا ✅", "success");
        setIsEditing(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        showToast(err.error || "خەزنکردن سەرکەوتوو نەبوو", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("پەیوەندی سیستەم شکستی هێنا", "error");
    }
  };

  const handleDelete = async (id: number) => {
    showAlert(
      "confirm",
      "دڵنیایت لە سڕینەوە؟",
      "ئایا دڵنیایت لە سڕینەوەی ئەم کڵێشەیە؟",
      async () => {
        closeAlert();
        try {
          const res = await fetch(`/api/invoice-templates/${id}`, {
            method: "DELETE",
          });

          if (res.ok) {
            showToast("کڵێشەکە سڕایەوە 🗑️", "success");
            fetchTemplates();
          } else {
            showToast("سڕینەوە سەرکەوتوو نەبوو", "error");
          }
        } catch (e) {
          console.error(e);
          showToast("پەیوەندی داتابەیس پچڕا", "error");
        }
      }
    );
  };

  const startEdit = (template: InvoiceTemplate) => {
    setCurrentTemplate(template);
    setIsEditing(true);
  };

  const startNew = () => {
    setCurrentTemplate({
      name: "",
      isActive: true,
      isMain: false,
      format: "A4",
      headerImage: null,
      footerImage: null,
      watermarkImage: null,
      statementHeaderImage: null,
      fixedNote: "سپاس بۆ کڕینەکەتان! هیوادارین تەندروست بن.",
      tableHeaderBg: "#E6F7FA",
      tableHeaderColor: "#000000",
      employeeName: "کۆساری مەلا فەرهاد",
    });
    setIsEditing(true);
  };

  const toggleMain = async (template: InvoiceTemplate) => {
    if (template.isMain) return;
    try {
      const res = await fetch(`/api/invoice-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMain: true }),
      });
      if (res.ok) {
        showToast("کڵێشەی سەرەکی گۆڕدرا 🎯", "success");
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleActive = async (template: InvoiceTemplate) => {
    try {
      const res = await fetch(`/api/invoice-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      if (res.ok) {
        showToast("دۆخی کڵێشەکە نوێکرایەوە 🔄", "success");
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 rtl font-sans p-6 pb-24" style={{ direction: "rtl" }}>
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

      {/* Top Navbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="text-slate-800 text-2xl font-bold cursor-pointer hover:bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-none bg-transparent"
          >
            ☰
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 m-0">کڵێشەی پسووڵە</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">بەڕێوەبردن و داڕشتنی کڵێشەکانی پرێنتکردنی پسووڵە.</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={startNew}
            className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl shadow-md text-sm font-bold hover:bg-blue-700 transition-all cursor-pointer border-none flex items-center gap-1.5"
          >
            <span>+ کڵێشەی نوێ</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Preview on Left (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 m-0 mb-3 text-right">پێشبینین (Preview)</h3>
              
              <div className="flex justify-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setCurrentTemplate(prev => ({ ...prev, format: "A4" }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors ${
                    currentTemplate.format === "A4" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  A4 Layout
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTemplate(prev => ({ ...prev, format: "80mm" }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors ${
                    currentTemplate.format === "80mm" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  80mm Layout
                </button>
              </div>

              {currentTemplate.format === "A4" ? (
                /* A4 Preview Container */
                <div
                  className="border border-slate-200 rounded-xl mx-auto overflow-hidden bg-white shadow-inner relative flex flex-col justify-between"
                  style={{
                    width: "100%",
                    minHeight: "500px",
                    backgroundImage: currentTemplate.watermarkImage ? `url(${currentTemplate.watermarkImage})` : "none",
                    backgroundSize: "200px 200px",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {/* Top Header Image */}
                  {currentTemplate.headerImage ? (
                    <img src={currentTemplate.headerImage} alt="Header" className="w-full h-[80px] object-cover" />
                  ) : (
                    <div className="h-[80px] border-b border-slate-100 flex items-center justify-center text-slate-350 text-xs font-bold bg-slate-50/50">
                      وێنەی بەشی سەرەوە
                    </div>
                  )}

                  {/* Sample Invoice Body */}
                  <div className="p-4 flex-1 space-y-4 text-[10px]">
                    <div className="flex justify-between items-center text-slate-500">
                      <div>
                        <b>ژمارەی پسووڵە:</b> 100234
                      </div>
                      <div>
                        <b>بەروار:</b> 05/06/2026
                      </div>
                    </div>

                    <table className="w-full border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: currentTemplate.tableHeaderBg, color: currentTemplate.tableHeaderColor }}>
                          <th className="p-1 border border-slate-200 text-right">ماددە</th>
                          <th className="p-1 border border-slate-200 text-center">دانە</th>
                          <th className="p-1 border border-slate-200 text-left">نرخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1 border border-slate-200 text-right text-slate-600">کەرەستەی نموونە ١</td>
                          <td className="p-1 border border-slate-200 text-center text-slate-600">2</td>
                          <td className="p-1 border border-slate-200 text-left text-slate-600">$50.00</td>
                        </tr>
                        <tr>
                          <td className="p-1 border border-slate-200 text-right text-slate-600">کەرەستەی نموونە ٢</td>
                          <td className="p-1 border border-slate-200 text-center text-slate-600">1</td>
                          <td className="p-1 border border-slate-200 text-left text-slate-600">$25.00</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="text-left font-bold text-slate-700">
                      کۆی گشتی: $125.00
                    </div>

                    {currentTemplate.fixedNote && (
                      <div className="border border-slate-100 p-2 rounded bg-slate-50/30 text-slate-500 text-[9px] leading-relaxed text-right">
                        <b>تێبینی:</b> {currentTemplate.fixedNote}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer Image */}
                  {currentTemplate.footerImage ? (
                    <img src={currentTemplate.footerImage} alt="Footer" className="w-full h-[50px] object-cover" />
                  ) : (
                    <div className="h-[50px] border-t border-slate-100 flex items-center justify-center text-slate-350 text-xs font-bold bg-slate-50/50">
                      وێنەی بەشی خوارەوە
                    </div>
                  )}
                </div>
              ) : (
                /* 80mm Layout POS Receipt Preview */
                <div
                  className="border border-slate-200 rounded-xl mx-auto overflow-hidden bg-white shadow-inner p-3 flex flex-col justify-between"
                  style={{
                    width: "250px",
                    minHeight: "450px",
                    backgroundImage: currentTemplate.watermarkImage ? `url(${currentTemplate.watermarkImage})` : "none",
                    backgroundSize: "120px 120px",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <div className="space-y-4 text-[9px]">
                    <div className="text-center font-bold text-slate-800 text-xs border-b border-dashed border-slate-200 pb-2">
                      {currentTemplate.headerImage ? (
                        <img src={currentTemplate.headerImage} alt="Header" className="max-w-full h-8 object-contain mx-auto" />
                      ) : (
                        "پسووڵەی فرۆشتن"
                      )}
                    </div>

                    <div className="text-slate-500 space-y-1">
                      <div><b>ژمارە:</b> 100234</div>
                      <div><b>بەروار:</b> 05/06/2026</div>
                    </div>

                    <div className="border-b border-dashed border-slate-200 pb-2">
                      <div className="flex justify-between font-bold text-slate-700 py-1" style={{ backgroundColor: currentTemplate.tableHeaderBg, color: currentTemplate.tableHeaderColor, padding: "2px 4px" }}>
                        <span>ماددە</span>
                        <span>کۆی گشتی</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>کەرەستە ١ (x2)</span>
                        <span>$100.00</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>کەرەستە ٢ (x1)</span>
                        <span>$25.00</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-slate-800">
                      <span>کۆی گشتی:</span>
                      <span>$125.00</span>
                    </div>

                    {currentTemplate.fixedNote && (
                      <div className="text-center text-slate-500 text-[8px] border-t border-dashed border-slate-200 pt-2 leading-relaxed">
                        {currentTemplate.fixedNote}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-slate-350 text-[8px] pt-3 border-t border-dashed border-slate-150">
                    {currentTemplate.footerImage ? (
                      <img src={currentTemplate.footerImage} alt="Footer" className="max-w-full h-6 object-contain mx-auto" />
                    ) : (
                      "بای پاس - پڕۆژەی دۆستان"
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor Form on Right (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800 m-0 pb-3 border-b border-slate-100 text-right">
                {currentTemplate.id ? "دەستکاریکردنی کڵێشە" : "زیادکردنی کڵێشەی نوێ"}
              </h3>

              {/* General Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    ناوی کڵێشە *
                  </span>
                  <input
                    type="text"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-800 text-right"
                    placeholder="بۆ نموونە: کڵێشەی سەرەکی، شین..."
                  />
                </div>

                <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    جۆری فۆرمات
                  </span>
                  <select
                    value={currentTemplate.format}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, format: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer text-right appearance-none"
                  >
                    <option value="A4">ئەی چوار (A4)</option>
                    <option value="80mm">پۆس (80mm)</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6 items-center">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentTemplate.isActive}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  چالاک بێت (Active)
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentTemplate.isMain}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, isMain: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  کڵێشەی سەرەکی بێت (Main Template)
                </label>
              </div>

              {/* Image Uploaders */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 m-0 border-b border-slate-100 pb-2 text-right">وێنە و لۆگۆکانی کڵێشە</h4>

                {/* 1. Header Image */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-750 block">وێنەی بەشی سەرەوە (Header Image)</span>
                    <span className="text-[10px] text-slate-400">بۆ نووسینی ناونیشان و لۆگۆ لە سەرەوە</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputHeaderRef}
                      onChange={(e) => handleImageUpload(e, "headerImage")}
                      accept="image/*"
                      className="hidden"
                    />
                    {currentTemplate.headerImage ? (
                      <button
                        type="button"
                        onClick={() => deleteImage("headerImage", fileInputHeaderRef)}
                        className="bg-rose-50 border-none text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-rose-100"
                      >
                        سڕینەوە
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputHeaderRef.current?.click()}
                        className="bg-blue-50 border-none text-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100"
                      >
                        بارکردن
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Footer Image */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-750 block">وێنەی بەشی خوارەوە (Footer Image)</span>
                    <span className="text-[10px] text-slate-400">وێنەی پەیوەندییەکان و تۆڕە کۆمەڵایەتییەکان</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputFooterRef}
                      onChange={(e) => handleImageUpload(e, "footerImage")}
                      accept="image/*"
                      className="hidden"
                    />
                    {currentTemplate.footerImage ? (
                      <button
                        type="button"
                        onClick={() => deleteImage("footerImage", fileInputFooterRef)}
                        className="bg-rose-50 border-none text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-rose-100"
                      >
                        سڕینەوە
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputFooterRef.current?.click()}
                        className="bg-blue-50 border-none text-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100"
                      >
                        بارکردن
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Watermark Image */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-750 block">وێنەی پشتەوە (Watermark Image)</span>
                    <span className="text-[10px] text-slate-400">وێنەیەکی لێڵ لە پشت ناوی ماددەکان دەکێشرێت</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputWatermarkRef}
                      onChange={(e) => handleImageUpload(e, "watermarkImage")}
                      accept="image/*"
                      className="hidden"
                    />
                    {currentTemplate.watermarkImage ? (
                      <button
                        type="button"
                        onClick={() => deleteImage("watermarkImage", fileInputWatermarkRef)}
                        className="bg-rose-50 border-none text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-rose-100"
                      >
                        سڕینەوە
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputWatermarkRef.current?.click()}
                        className="bg-blue-50 border-none text-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100"
                      >
                        بارکردن
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Statement Header Image */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-750 block">وێنەی کەشف حساب (Statement Header)</span>
                    <span className="text-[10px] text-slate-400">وێنەی تایبەت بە پرێنتی کەشفی حساب</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputStatementRef}
                      onChange={(e) => handleImageUpload(e, "statementHeaderImage")}
                      accept="image/*"
                      className="hidden"
                    />
                    {currentTemplate.statementHeaderImage ? (
                      <button
                        type="button"
                        onClick={() => deleteImage("statementHeaderImage", fileInputStatementRef)}
                        className="bg-rose-50 border-none text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-rose-100"
                      >
                        سڕینەوە
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputStatementRef.current?.click()}
                        className="bg-blue-50 border-none text-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100"
                      >
                        بارکردن
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table Colors */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 m-0 border-b border-slate-100 pb-2 text-right">ڕەنگەکانی خشتە</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">ڕەنگی پاشبنەمای سەردێڕ</span>
                    <input
                      type="color"
                      value={currentTemplate.tableHeaderBg}
                      onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, tableHeaderBg: e.target.value }))}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer p-0"
                    />
                  </div>

                  <div className="flex items-center gap-3 justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">ڕەنگی دەقی سەردێڕ</span>
                    <input
                      type="color"
                      value={currentTemplate.tableHeaderColor}
                      onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, tableHeaderColor: e.target.value }))}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Text / Note Content */}
              <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                  تێبینی جێگیر (پەیامی سوپاسگوزاری)
                </span>
                <textarea
                  rows={3}
                  value={currentTemplate.fixedNote || ""}
                  onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, fixedNote: e.target.value }))}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-800 text-right resize-none"
                  placeholder="بۆ نموونە: کاڵای فرۆشراو وەرناگیرێتەوە..."
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl shadow-md text-sm font-bold hover:bg-blue-700 transition-all cursor-pointer border-none"
                >
                  💾 خەزنکردن
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-none"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Template List Table View */
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold">داگرتنی کڵێشەکان...</div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold">
              هیچ کڵێشەیەک دروست نەکراوە بۆ پیشاندان.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-sm font-black text-slate-800">ناوی کڵێشە</th>
                    <th className="p-4 text-sm font-black text-slate-800">فۆرمات</th>
                    <th className="p-4 text-sm font-black text-slate-800">دۆخ (Status)</th>
                    <th className="p-4 text-sm font-black text-slate-800">کڵێشەی سەرەکی</th>
                    <th className="p-4 text-sm font-black text-slate-800">دروستکەر</th>
                    <th className="p-4 text-sm font-black text-slate-800 text-left">کارەکان</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800">{template.name}</td>
                      <td className="p-4 text-sm font-bold text-slate-500">
                        {template.format === "A4" ? "ئەی چوار (A4)" : "پۆس (80mm)"}
                      </td>
                      <td className="p-4 text-sm">
                        <button
                          type="button"
                          onClick={() => toggleActive(template)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border-none cursor-pointer ${
                            template.isActive
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {template.isActive ? "چالاک" : "ناچالاک"}
                        </button>
                      </td>
                      <td className="p-4 text-sm">
                        <button
                          type="button"
                          disabled={template.isMain}
                          onClick={() => toggleMain(template)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border-none ${
                            template.isMain
                              ? "bg-blue-600 text-white cursor-default"
                              : "bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100"
                          }`}
                        >
                          {template.isMain ? "سەرەکی" : "بیکە بە سەرەکی"}
                        </button>
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-bold">{template.employeeName}</td>
                      <td className="p-4 text-sm text-left flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(template)}
                          className="bg-transparent hover:bg-slate-100 border-none text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          دەستکاریکردن
                        </button>
                        <button
                          type="button"
                          onClick={() => template.id && handleDelete(template.id)}
                          className="bg-transparent hover:bg-rose-50 border-none text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          سڕینەوە
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

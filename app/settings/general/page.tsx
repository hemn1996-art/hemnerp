"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "../../store/store";

type SettingsState = {
  // Original compatibility fields
  timezone: string;
  language: string;
  hideZeroBalance: boolean;
  showReportStats: boolean;
  // Extended fields matching design mockups
  logo: string; // base64 representation of company logo
  companyName: string;
  companyNameLang: string;
  about: string;
  aboutLang: string;
  address: string;
  addressLang: string;
  emails: string[];
  phones: string[];
  primaryCurrency: string;
  notificationLanguage: string;
};

export default function GeneralSettingsPage() {
  const currentUser = useStore((s) => s.currentUser) as any;

  const [settings, setSettings] = useState<SettingsState>({
    timezone: "Asia/Baghdad",
    language: "کوردی",
    hideZeroBalance: true,
    showReportStats: true,
    logo: "",
    companyName: "سەنتەری کارەبای لەندەن",
    companyNameLang: "ku",
    about: "",
    aboutLang: "ku",
    address: "سلێمانی کۆگانی ژووری بازرگانی 456",
    addressLang: "ku",
    emails: ["info@londoncenter.com"],
    phones: ["07501734006", "07701403038"],
    primaryCurrency: "$",
    notificationLanguage: "کوردی",
  });

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Announcement states
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementType, setAnnouncementType] = useState("info");
  const [announcementActive, setAnnouncementActive] = useState(false);

  // Accordion open/close state
  const [collapsed, setCollapsed] = useState({
    logo: false,
    company: false,
    contact: false,
    system: false,
    display: false,
    announcement: true,
  });

  useEffect(() => {
    const fetchActiveAnnouncement = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setAnnouncementMsg(data.message);
            setAnnouncementType(data.type);
            setAnnouncementActive(data.isActive);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchActiveAnnouncement();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);


  const handleSave = () => {
    localStorage.setItem("general_settings", JSON.stringify(settings));
    showToast("ڕێکخستنەکان بە سەرکەوتوویی خەزن کران ✅", "success");
  };

  const handlePublishAnnouncement = async (isActiveStatus = true) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: announcementMsg,
          type: announcementType,
          isActive: isActiveStatus,
        }),
      });
      if (res.ok) {
        setAnnouncementActive(isActiveStatus);
        if (isActiveStatus) {
          showToast("ئاگاداری سیستەم بە سەرکەوتوویی بڵاوکرایەوە 📢", "success");
        } else {
          setAnnouncementMsg("");
          showToast("ئاگاداری سیستەم ناچالاک کرا 🛑", "success");
        }
      } else {
        showToast("کردارەکە سەرکەوتوو نەبوو", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("کێشە لە پەیوەندی سێرڤەر هەیە", "error");
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings((prev) => ({ ...prev, logo: reader.result as string }));
        showToast("لۆگۆ بە سەرکەوتوویی بارکرا 🖼️", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteLogo = () => {
    setSettings((prev) => ({ ...prev, logo: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("لۆگۆ سڕایەوە 🗑️", "success");
  };

  const viewLogo = () => {
    if (settings.logo) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<img src="${settings.logo}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
      }
    } else {
      showToast("هیچ لۆگۆیەک بارنەکراوە بۆ پیشاندان", "error");
    }
  };

  const addEmail = () => {
    setSettings((prev) => ({ ...prev, emails: [...prev.emails, ""] }));
  };

  const updateEmail = (index: number, val: string) => {
    setSettings((prev) => {
      const copy = [...prev.emails];
      copy[index] = val;
      return { ...prev, emails: copy };
    });
  };

  const removeEmail = (index: number) => {
    setSettings((prev) => {
      const copy = prev.emails.filter((_, i) => i !== index);
      return { ...prev, emails: copy };
    });
  };

  const addPhone = () => {
    setSettings((prev) => ({ ...prev, phones: [...prev.phones, ""] }));
  };

  const updatePhone = (index: number, val: string) => {
    setSettings((prev) => {
      const copy = [...prev.phones];
      copy[index] = val;
      return { ...prev, phones: copy };
    });
  };

  const removePhone = (index: number) => {
    setSettings((prev) => {
      const copy = prev.phones.filter((_, i) => i !== index);
      return { ...prev, phones: copy };
    });
  };

  const toggleCollapsed = (key: keyof typeof collapsed) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
            <h1 className="text-xl font-bold text-slate-900 m-0">ڕێکخستنی گشتی</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">بەڕێوەبردنی ڕێکخستنەکانی سیستەم.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Accordion: 1. لۆگۆ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden border-t-4 border-[#7c3aed]">
          <div
            onClick={() => toggleCollapsed("logo")}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-[#7c3aed]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-right">
                <h3 className="text-[16px] font-bold text-slate-850 m-0">لۆگۆ</h3>
                <p className="text-[12px] text-slate-400 m-0 mt-0.5">خەزنکردنی لۆگۆی کۆمپانیا</p>
              </div>
            </div>
            <span className={`text-slate-400 transition-transform duration-300 font-mono text-lg ${collapsed.logo ? "" : "rotate-180"}`}>
              ▲
            </span>
          </div>

          {!collapsed.logo && (
            <div className="p-6 border-t border-slate-100 bg-white space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 border-2 border-dashed border-blue-400/80 rounded-2xl flex flex-col items-center justify-center bg-blue-50/10 hover:bg-blue-50/30 transition-all cursor-pointer p-4 text-center relative overflow-hidden"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {settings.logo ? (
                    <img src={settings.logo} alt="Company Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-blue-600 text-sm font-bold">{settings.companyName || "سەنتەری کارەبای لەندەن"}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4 text-right">
                  <div className="flex gap-3">
                    <button
                      onClick={deleteLogo}
                      className="border border-rose-200 text-rose-500 bg-rose-50/40 hover:bg-rose-50 hover:text-rose-600 transition-colors rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer border-none"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      سڕینەوە
                    </button>
                    <button
                      onClick={viewLogo}
                      className="border border-blue-200 text-blue-500 bg-blue-50/40 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer border-none"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      پیشاندان
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                    له هەموو ئەپلیکەیشنەکاندا دەردەکەوێت. وێنەی پێشنیارکراو: وێنەکە پێویستە JPG یاخوود PNG بێت، بە قیاسی پانی 500 پێکسڵ، وە درێژی 500 پێکسڵ.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion: 2. زانیاری کۆمپانیا */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden border-t-4 border-[#1d4ed8]">
          <div
            onClick={() => toggleCollapsed("company")}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1d4ed8]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="text-right">
                <h3 className="text-[16px] font-bold text-slate-850 m-0">زانیاری کۆمپانیا</h3>
                <p className="text-[12px] text-slate-400 m-0 mt-0.5">ناوی کۆمپانیا، دەربارە و ناونیشان</p>
              </div>
            </div>
            <span className={`text-slate-400 transition-transform duration-300 font-mono text-lg ${collapsed.company ? "" : "rotate-180"}`}>
              ▲
            </span>
          </div>

          {!collapsed.company && (
            <div className="p-6 border-t border-slate-100 bg-white space-y-6">
              {/* Row 1: Company Name */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="relative flex-1 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400 focus-within:text-blue-500">
                    ناوی کۆمپانیا
                  </span>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-800 text-right"
                  />
                </div>
                <div className="relative w-full md:w-48 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    زمان
                  </span>
                  <select
                    value={settings.companyNameLang}
                    onChange={(e) => setSettings((prev) => ({ ...prev, companyNameLang: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer text-right appearance-none"
                  >
                    <option value="ku">کوردی</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
              </div>

              {/* Row 2: About */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="relative flex-1 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    دەربارە
                  </span>
                  <textarea
                    rows={2}
                    value={settings.about}
                    onChange={(e) => setSettings((prev) => ({ ...prev, about: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-800 text-right min-h-[50px] resize-none"
                  />
                </div>
                <div className="relative w-full md:w-48 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    زمان
                  </span>
                  <select
                    value={settings.aboutLang}
                    onChange={(e) => setSettings((prev) => ({ ...prev, aboutLang: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer text-right appearance-none"
                  >
                    <option value="ku">کوردی</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Address */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="relative flex-1 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    ناونیشان
                  </span>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-800 text-right"
                  />
                </div>
                <div className="relative w-full md:w-48 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                  <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                    زمان
                  </span>
                  <select
                    value={settings.addressLang}
                    onChange={(e) => setSettings((prev) => ({ ...prev, addressLang: e.target.value }))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer text-right appearance-none"
                  >
                    <option value="ku">کوردی</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion: 3. زانیاری پەیوەندیکردن */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden border-t-4 border-[#15803d]">
          <div
            onClick={() => toggleCollapsed("contact")}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-[#15803d]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="text-right">
                <h3 className="text-[16px] font-bold text-slate-850 m-0">زانیاری پەیوەندیکردن</h3>
                <p className="text-[12px] text-slate-400 m-0 mt-0.5">ژمارە تەلەرۆنەکان و ناونیشانی ئیمەیڵ</p>
              </div>
            </div>
            <span className={`text-slate-400 transition-transform duration-300 font-mono text-lg ${collapsed.contact ? "" : "rotate-180"}`}>
              ▲
            </span>
          </div>

          {!collapsed.contact && (
            <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Emails Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border border-blue-200 text-[11px] font-bold text-blue-600 flex items-center justify-center">
                      {settings.emails.length}
                    </span>
                    <span className="text-sm font-bold text-slate-700">ناونیشانی ئیمەیڵەکان</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  {settings.emails.map((email, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <button
                        onClick={() => removeEmail(index)}
                        className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-500 flex items-center justify-center transition-all cursor-pointer border-none"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="relative flex-1 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1 flex items-center justify-between">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          placeholder="example@domain.com"
                          className="w-full bg-transparent px-3 py-2 text-sm font-semibold outline-none text-slate-800 text-left placeholder:text-slate-350"
                          dir="ltr"
                        />
                        <svg className="w-4 h-4 text-slate-400 mr-2 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addEmail}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-transparent flex items-center gap-1 cursor-pointer border-none pt-1"
                  >
                    <span>+ زیادکردن</span>
                  </button>
                </div>
              </div>

              {/* Phones Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border border-blue-200 text-[11px] font-bold text-blue-600 flex items-center justify-center">
                      {settings.phones.length}
                    </span>
                    <span className="text-sm font-bold text-slate-700">ژمارە تەلەفۆنەکان</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  {settings.phones.map((phone, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <button
                        onClick={() => removePhone(index)}
                        className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-500 flex items-center justify-center transition-all cursor-pointer border-none"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="relative flex-1 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1 flex items-center justify-between">
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => updatePhone(index, e.target.value)}
                          placeholder="0750XXXXXXX"
                          className="w-full bg-transparent px-3 py-2 text-sm font-semibold outline-none text-slate-800 text-left placeholder:text-slate-350"
                          dir="ltr"
                        />
                        <svg className="w-4 h-4 text-slate-400 mr-2 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addPhone}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-transparent flex items-center gap-1 cursor-pointer border-none pt-1"
                  >
                    <span>+ زیادکردن</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion: 4. ڕێکخستنی سیستەم */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden border-t-4 border-[#c2410c]">
          <div
            onClick={() => toggleCollapsed("system")}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#c2410c]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div className="text-right">
                <h3 className="text-[16px] font-bold text-slate-850 m-0">ڕێکخستنی سیستەم</h3>
                <p className="text-[12px] text-slate-400 m-0 mt-0.5">ڕێکخستنی دراو و نۆتیفیکەیشن</p>
              </div>
            </div>
            <span className={`text-slate-400 transition-transform duration-300 font-mono text-lg ${collapsed.system ? "" : "rotate-180"}`}>
              ▲
            </span>
          </div>

          {!collapsed.system && (
            <div className="p-6 border-t border-slate-100 bg-white space-y-4">
              {/* Row 1: Primary Currency */}
              <div className="flex items-center justify-between p-4 bg-slate-50/40 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-base">
                    $
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-slate-800 m-0">دراوی سەرەکی سیستەم</h4>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">دراوی سەرەکی بۆ مامەڵەکان</p>
                  </div>
                </div>
                <select
                  value={settings.primaryCurrency}
                  onChange={(e) => setSettings((p) => ({ ...p, primaryCurrency: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold bg-white text-slate-700 outline-none cursor-pointer focus:border-[#0b1f50] transition-colors"
                >
                  <option value="$">$ (USD)</option>
                  <option value="IQD">IQD (د.ع)</option>
                </select>
              </div>

              {/* Row 2: Notification Language */}
              <div className="flex items-center justify-between p-4 bg-slate-50/40 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.33 16.5 3 19" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-slate-800 m-0">زمانی نۆتیفیکەیشن</h4>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">زمان بۆ SMS و نۆتیفیکەیشنەکان</p>
                  </div>
                </div>
                <select
                  value={settings.notificationLanguage}
                  onChange={(e) => setSettings((p) => ({ ...p, notificationLanguage: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold bg-white text-slate-700 outline-none cursor-pointer focus:border-[#0b1f50] transition-colors"
                >
                  <option value="کوردی">کوردی</option>
                  <option value="English">English</option>
                  <option value="العربية">العربية</option>
                </select>
              </div>

              {/* Row 3: Timezone */}
              <div className="flex items-center justify-between p-4 bg-slate-50/40 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-slate-800 m-0">ناوچەی کاتژمێر</h4>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">ناوچەی کاتژمێر بۆ بەرواری پسووڵە و ڕاپۆرت</p>
                  </div>
                </div>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings((p) => ({ ...p, timezone: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold bg-white text-slate-750 outline-none cursor-pointer focus:border-[#0b1f50] transition-colors text-left"
                  dir="ltr"
                >
                  <option value="Asia/Baghdad">Asia/Baghdad</option>
                  <option value="Asia/Riyadh">Asia/Riyadh</option>
                  <option value="Asia/Tehran">Asia/Tehran</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Accordion: 5. ڕێکخستنی پیشاندان */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden border-t-4 border-[#0d9488]">
          <div
            onClick={() => toggleCollapsed("display")}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-[#0d9488]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="text-right">
                <h3 className="text-[16px] font-bold text-slate-850 m-0">ڕێکخستنی پیشاندان</h3>
                <p className="text-[12px] text-slate-400 m-0 mt-0.5">ڕێکخستنی سیستەم</p>
              </div>
            </div>
            <span className={`text-slate-400 transition-transform duration-300 font-mono text-lg ${collapsed.display ? "" : "rotate-180"}`}>
              ▲
            </span>
          </div>

          {!collapsed.display && (
            <div className="p-6 border-t border-slate-100 bg-white space-y-4">
              {/* Option 1: Hide Zero Balance */}
              <label className="flex items-center justify-between p-4 bg-teal-50/10 border border-[#e2f0ec] rounded-2xl cursor-pointer hover:bg-[#f6fbf9] transition-all">
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-sm font-bold text-slate-800">شاردنەوەی باڵانسی سفر لە پسوولە</span>
                  <span className="text-xs text-slate-400">شاردنەوەی باڵانسی سفر لە کاتی پرینتکردنی پسوولە</span>
                </div>
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={settings.hideZeroBalance}
                    onChange={(e) => setSettings((p) => ({ ...p, hideZeroBalance: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-6 h-6 rounded-lg border border-slate-200 bg-white flex items-center justify-center peer-checked:bg-[#0d9488] peer-checked:border-none transition-all">
                    {settings.hideZeroBalance && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </label>

              {/* Option 2: Show Report Stats */}
              <label className="flex items-center justify-between p-4 bg-teal-50/10 border border-[#e2f0ec] rounded-2xl cursor-pointer hover:bg-[#f6fbf9] transition-all">
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-sm font-bold text-slate-800">پیشاندانی ئاماری ڕاپۆرت</span>
                  <span className="text-xs text-slate-400">پیشاندانی ئاماری ڕاپۆرت لە کاتی پرینتکردن</span>
                </div>
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={settings.showReportStats}
                    onChange={(e) => setSettings((p) => ({ ...p, showReportStats: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-6 h-6 rounded-lg border border-slate-200 bg-white flex items-center justify-center peer-checked:bg-[#0d9488] peer-checked:border-none transition-all">
                    {settings.showReportStats && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Accordion: 6. ئاگاداری گشتی سیستەم (Admin only) */}
        {currentUser?.role === "admin" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden border-t-4 border-[#dc2626]">
            <div
              onClick={() => toggleCollapsed("announcement")}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-[#dc2626]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="text-right">
                  <h3 className="text-[16px] font-bold text-slate-850 m-0">ئاگاداری سیستەم (Announcement)</h3>
                  <p className="text-[12px] text-slate-400 m-0 mt-0.5">بڵاوکردنەوەی پەیام و ئاگاداری ڕاستەوخۆ بۆ بەکارهێنەران</p>
                </div>
              </div>
              <span className={`text-slate-400 transition-transform duration-300 font-mono text-lg ${collapsed.announcement ? "" : "rotate-180"}`}>
                ▲
              </span>
            </div>

            {!collapsed.announcement && (
              <div className="p-6 border-t border-slate-100 bg-white space-y-6">
                {/* Active Announcement Status Alert Box */}
                {announcementActive && announcementMsg ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 text-lg">📢</span>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-800 m-0">ئاگاداریی چالاک هەیە</p>
                        <p className="text-xs text-emerald-650 m-0 mt-0.5">بەکارهێنەران لەم کاتەدا ئەم پەیامە دەبینن.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePublishAnnouncement(false)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-sm active:scale-95"
                    >
                      🛑 ناچالاککردن و سڕینەوە
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-250 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 m-0 text-right">هیچ ئاگادارییەک چالاک نییە لای بەکارهێنەران</p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="relative border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1">
                    <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                      پەیامەکە (Message)
                    </span>
                    <textarea
                      rows={3}
                      value={announcementMsg}
                      onChange={(e) => setAnnouncementMsg(e.target.value)}
                      placeholder="بۆ نموونە: دوای ٢ خولەکی تر ئەپدێت دێت، بۆ ماوەیەکی کورت پڕۆگرامەکە دەوەستێت..."
                      className="w-full bg-transparent px-3 py-2 text-sm font-semibold outline-none text-slate-800 text-right min-h-[70px] resize-none"
                    />
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 border border-slate-200 rounded-xl bg-white focus-within:border-blue-500 transition-all p-1">
                      <span className="absolute -top-2.5 right-4 px-1.5 bg-white text-[11px] font-bold text-slate-400">
                        جۆری ئاگاداری (Alert Type)
                      </span>
                      <select
                        value={announcementType}
                        onChange={(e) => setAnnouncementType(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none text-slate-700 cursor-pointer text-right appearance-none"
                      >
                        <option value="info">📢 سەرنج (شین - پەیامی ئاسایی)</option>
                        <option value="warning">⚠️ ئاگاداری (زەرد - گرنگ)</option>
                        <option value="error">❌ مەترسی (سوور - وەستان)</option>
                        <option value="success">✅ سەرکەوتوو (سەوز)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handlePublishAnnouncement(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-none shadow-md active:scale-95"
                  >
                    🚀 بڵاوکردنەوەی پەیامەکە
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Save Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 py-4 px-6 flex justify-center gap-4 z-40 shadow-lg">
        <button
          onClick={handleSave}
          className="bg-[#0b1f50] text-white px-10 py-3 rounded-xl shadow-lg shadow-blue-900/10 text-sm font-bold hover:bg-[#061f5f] transition-all active:scale-95 cursor-pointer border-none"
        >
          💾 خەزنکردن
        </button>
        <button
          onClick={() => {
            const saved = localStorage.getItem("general_settings");
            if (saved) {
              try {
                setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
                showToast("ڕێکخستنەکان گەڕێنرانەوە 🔄", "success");
              } catch (e) {
                showToast("شکست هێنا لە گەڕاندنەوە", "error");
              }
            }
          }}
          className="bg-transparent hover:bg-slate-150/40 text-slate-500 font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer border-none text-sm"
        >
          پاشگەزبوونەوە
        </button>
      </div>
    </div>
  );
}

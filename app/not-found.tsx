"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 select-none font-sans" dir="rtl">
      <div className="max-w-md w-full flex flex-col items-center gap-4 bg-white/60 backdrop-blur-md p-10 rounded-3xl border border-gray-200/80 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 m-0 tracking-tight" dir="ltr">
          Page Not Found - 404
        </h1>
        <p className="text-gray-500 font-medium text-base m-0" dir="ltr">
          Oops! The page you are looking for does not exist.
        </p>
        <p className="text-gray-600 font-bold text-sm m-0">
          ئەم لاپەڕەیە نەدۆزرایەوە یان ڕاگوێزراوە.
        </p>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleBack}
            className="w-12 h-12 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
            title="گەڕانەوە بۆ لاپەڕەی پێشتر"
          >
            {/* Lucide ArrowLeft SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            گەڕانەوە بۆ داشبۆرد
          </button>
        </div>
      </div>
    </div>
  );
}

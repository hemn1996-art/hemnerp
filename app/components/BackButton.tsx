"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}

export default function BackButton({
  className = "",
  label = "گەڕانەوە",
  style = {},
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if current active page has unsaved changes
    const checkFn = (window as any).hasUnsavedChanges;
    if (typeof checkFn === "function") {
      try {
        const res = checkFn();
        if (res && res.unsaved) {
          const proceed = window.confirm("تۆ داتای خەزن نەکراوت هەیە لەسەر ئەم پەڕەیە. دڵنیایت دەتەوێت بگەڕێیتەوە؟");
          if (!proceed) return;
        }
      } catch (e) {
        console.error("Error running hasUnsavedChanges:", e);
      }
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      title="گەڕانەوە بۆ لاپەڕەی پێشتر"
      aria-label="Back"
      className={`no-print inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-blue-600 border border-slate-300 shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95 group font-bold text-sm select-none ${className}`}
      style={{
        minWidth: "110px",
        height: "40px",
        fontFamily: '"Speda", "Segoe UI", Tahoma, Arial, sans-serif',
        ...style,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform group-hover:-translate-x-1 flex-shrink-0"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      <span className="leading-none text-[13px] font-black">{label}</span>
    </button>
  );
}

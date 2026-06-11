"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useStore } from "../store/store";

/* ─── Eastern-Arabic / Persian digits → Western (English) ─── */
const ARABIC_DIGIT_MAP: Record<string, string> = {
  "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4",
  "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9",
  "\u06f0": "0", "\u06f1": "1", "\u06f2": "2", "\u06f3": "3", "\u06f4": "4",
  "\u06f5": "5", "\u06f6": "6", "\u06f7": "7", "\u06f8": "8", "\u06f9": "9",
};
const ARABIC_DIGIT_RE = /[\u0660-\u0669\u06f0-\u06f9]/g;

function isNumberInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  return (
    el.type === "number" ||
    el.inputMode === "decimal" ||
    el.inputMode === "numeric" ||
    el.lang === "en"
  );
}

type LayoutShellProps = {
  children: React.ReactNode;
};

export default function LayoutShell({ children }: LayoutShellProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  
  const fetchCurrencies = useStore((s) => s.fetchCurrencies);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  /* Global: auto-convert Arabic/Kurdish digits → English on any numeric input */
  useEffect(() => {
    function handleBeforeInput(e: Event) {
      const event = e as InputEvent;
      if (!isNumberInput(event.target)) return;
      if (!event.data || !ARABIC_DIGIT_RE.test(event.data)) return;

      event.preventDefault();
      // Reset lastIndex because regex is global
      ARABIC_DIGIT_RE.lastIndex = 0;
      const converted = event.data.replace(
        /[\u0660-\u0669\u06f0-\u06f9]/g,
        (ch) => ARABIC_DIGIT_MAP[ch] ?? ch
      );
      // Standard way to insert text in contenteditable / input
      document.execCommand("insertText", false, converted);
    }

    document.addEventListener("beforeinput", handleBeforeInput, true);
    return () =>
      document.removeEventListener("beforeinput", handleBeforeInput, true);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#f3f4f6",
        minWidth: "1280px",
        minHeight: "100vh",
      }}
    >
      {/* Mobile Top Bar - hidden on desktop */}
      {!isLoginPage && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center z-[999] shadow-sm flex-shrink-0">
          <button
            onClick={() => setIsOpenMobile(true)}
            className="text-xl p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border-none cursor-pointer flex items-center justify-center leading-none"
          >
            ☰
          </button>
          <span className="font-black text-lg text-gray-900">ERP System</span>
          <div className="w-10"></div>
        </div>
      )}

      {/* Main Row - sidebar + content, fills all remaining height */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          position: "relative",
        }}
      >
        {/* Sidebar */}
        {!isLoginPage && (
          <Sidebar isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />
        )}

        {/* Backdrop for Mobile Sidebar */}
        {!isLoginPage && isOpenMobile && (
          <div
            onClick={() => setIsOpenMobile(false)}
            className="fixed inset-0 bg-black/50 z-[999] lg:hidden"
          />
        )}

        {/* Main Content */}
        <main
          id="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            background: "#f3f4f6",
            transition: "padding 0.3s ease-in-out",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

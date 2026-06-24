"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import NegativeCashboxWarning from "./NegativeCashboxWarning";
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
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  
  const fetchCurrencies = useStore((s) => s.fetchCurrencies);
  const fetchCurrentUser = useStore((s) => s.fetchCurrentUser);
  const userLoaded = useStore((s) => s.userLoaded);
  const currentUser = useStore((s) => s.currentUser);

  const [announcement, setAnnouncement] = useState<{ id: number; message: string; type: string } | null>(null);
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    fetchCurrencies();
    if (!isLoginPage) {
      fetchCurrentUser();
    }
  }, [fetchCurrencies, fetchCurrentUser, isLoginPage, pathname]);

  useEffect(() => {
    if (!isLoginPage && userLoaded && !currentUser) {
      router.push("/login");
    }
  }, [isLoginPage, userLoaded, currentUser, router]);

  // Poll for announcements
  useEffect(() => {
    if (isLoginPage || !currentUser) {
      setAnnouncement(null);
      return;
    }

    try {
      const storedDismissed = sessionStorage.getItem("__dismissed_announcement_id");
      if (storedDismissed) {
        setDismissedId(Number(storedDismissed));
      }
    } catch (e) {
      console.error(e);
    }

    const fetchAnnouncement = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data && data.isActive) {
            setAnnouncement(data);
          } else {
            setAnnouncement(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch announcements", err);
      }
    };

    fetchAnnouncement();
    const interval = setInterval(fetchAnnouncement, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [currentUser, isLoginPage]);

  // Real-time updates via SSE (Server-Sent Events)
  useEffect(() => {
    if (isLoginPage || !currentUser) return;

    const eventSource = new EventSource("/api/users/me/updates");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "permissions_updated" || data.type === "user_updated" || data.type === "deactivated") {
          // Trigger fetchCurrentUser to sync permissions/status.
          // If deactivated, this fetch will fail with 401 and automatically log the user out.
          fetchCurrentUser();
        }
      } catch (err) {
        console.error("Error parsing real-time updates:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser, isLoginPage, fetchCurrentUser]);


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

  if (!isLoginPage && !userLoaded) {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f3f4f6", fontFamily: '"Speda", sans-serif' }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "4px solid #d1d5db", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#4b5563" }}>داخڵبوون...</span>
        </div>
      </div>
    );
  }

  const handleDismissAnnouncement = (ann: { id: number; message: string; type: string }) => {
    setDismissedId(ann.id);
    try {
      sessionStorage.setItem("__dismissed_announcement_id", ann.id.toString());
      
      const saved = localStorage.getItem("__dismissed_notifications");
      const list = saved ? JSON.parse(saved) : [];
      if (!list.some((n: any) => n.id === ann.id)) {
        list.push({
          id: ann.id,
          message: ann.message,
          type: ann.type,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("__dismissed_notifications", JSON.stringify(list));
        window.dispatchEvent(new Event("notifications-updated"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="layout-shell-root"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#f3f4f6",
        minWidth: "1280px",
        minHeight: "100vh",
      }}
    >
      {/* System Announcement Banner */}
      {announcement && announcement.id !== dismissedId && (
        <div
          onClick={() => handleDismissAnnouncement(announcement)}
          className={`px-6 py-4 flex items-center justify-center transition-all shadow-md border-b font-sans cursor-pointer hover:opacity-95 text-center relative ${
            announcement.type === "warning" || announcement.type === "confirm"
              ? "bg-amber-100 border-amber-300 text-amber-950"
              : announcement.type === "error"
              ? "bg-rose-100 border-rose-300 text-rose-950"
              : announcement.type === "success"
              ? "bg-emerald-100 border-emerald-300 text-emerald-950"
              : "bg-blue-100 border-blue-300 text-blue-950"
          }`}
          style={{ direction: "rtl" }}
          title="بۆ داخستنی ئەم ئاگادارییە، کلیک لە هەر شوێنێکی ئەم بۆکسە بکە"
        >
          <div className="flex items-center justify-center gap-3 w-full">
            <span className="text-2xl animate-bounce">
              {announcement.type === "warning" || announcement.type === "confirm"
                ? "⚠️"
                : announcement.type === "error"
                ? "❌"
                : announcement.type === "success"
                ? "✅"
                : "📢"}
            </span>
            <span className="text-base md:text-lg font-extrabold tracking-wide select-none leading-normal">
              {announcement.message}
            </span>
            <span className="text-xs opacity-60 mr-4 border border-black/10 px-2.5 py-0.5 rounded-full whitespace-nowrap bg-black/5 select-none">
              داخستن ×
            </span>
          </div>
        </div>
      )}

      {/* Negative Cashbox Balance Alert Banner */}
      {!isLoginPage && currentUser && <NegativeCashboxWarning />}

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
        className="layout-main-row"
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

"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type BackupFile = {
  fileName: string;
  date: string;
  size: string;
  createdAt?: string;
};

// IndexedDB helpers for persisting directory handle
const DB_NAME = "backup_db";
const STORE_NAME = "handles";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(handle, "backupDir");
  return new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get("backupDir");
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export default function BackupSettingsPage() {
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [autoBackup, setAutoBackup] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Directory handle for saving to user-chosen folder
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirName, setDirName] = useState<string | null>(null);
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Auto-backup on close
  const [backupOnClose, setBackupOnClose] = useState(false);

  // Restore state
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const showToast = (msg: string, type: "success" | "error") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedAutoBackup = localStorage.getItem("auto_backup_enabled");
    if (savedAutoBackup === "true") setAutoBackup(true);
    const savedLastBackup = localStorage.getItem("last_backup_time");
    if (savedLastBackup) setLastBackupTime(savedLastBackup);
    const savedBackupOnClose = localStorage.getItem("backup_on_close");
    if (savedBackupOnClose === "true") setBackupOnClose(true);

    // Load saved directory handle from IndexedDB
    loadHandle().then(async (handle) => {
      if (handle) {
        try {
          // Verify permission
          const perm = await (handle as any).queryPermission({ mode: "readwrite" });
          if (perm === "granted") {
            setDirHandle(handle);
            setDirName(handle.name);
            dirHandleRef.current = handle;
          }
        } catch {
          // Permission lost, clear it
        }
      }
    });
  }, []);

  // Fetch backup list
  const fetchBackupList = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/list");
      const data = await res.json();
      if (data.backups) {
        const mapped: BackupFile[] = data.backups.map((b: any) => ({
          fileName: b.fileName,
          date: b.date,
          size: b.fileSize,
          createdAt: b.createdAt
        }));
        setBackupFiles(mapped);

        // Update the last backup time to the creation time of the latest backup file in list
        if (mapped.length > 0) {
          const latest = mapped[0];
          if (latest.createdAt) {
            const formatted = new Date(latest.createdAt).toLocaleString("ku", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            setLastBackupTime(formatted);
            localStorage.setItem("last_backup_time", formatted);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch backups", e);
    }
  }, []);

  useEffect(() => {
    fetchBackupList();
  }, [fetchBackupList]);

  // Auto backup interval
  useEffect(() => {
    if (autoBackup) {
      createBackup(true);
      backupIntervalRef.current = setInterval(() => {
        createBackup(true);
      }, 60 * 60 * 1000);
    } else {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
        backupIntervalRef.current = null;
      }
    }
    return () => {
      if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
    };
  }, [autoBackup]);

  // Backup on close/unload
  useEffect(() => {
    if (!backupOnClose) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable last-chance backup to server
      navigator.sendBeacon("/api/backup", "");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        navigator.sendBeacon("/api/backup", "");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [backupOnClose]);

  // Pick a directory
  const pickDirectory = async () => {
    try {
      // @ts-ignore - File System Access API
      const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
        mode: "readwrite",
      });
      setDirHandle(handle);
      setDirName(handle.name);
      dirHandleRef.current = handle;
      await saveHandle(handle);
      localStorage.setItem("backup_dir_name", handle.name);
      showToast(`فۆڵدەری "${handle.name}" هەڵبژێردرا 📂`, "success");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        showToast("هەڵە لە هەڵبژاردنی فۆڵدەر", "error");
      }
    }
  };

  // Write backup data to user-chosen directory
  const writeToChosenDir = async (data: any) => {
    const handle = dirHandleRef.current;
    if (!handle) return;

    try {
      // Re-verify permission
      const perm = await (handle as any).requestPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        showToast("ڕێگەپێدانی فۆڵدەر پێویستە", "error");
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `backup-${dateStr}.json`;
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) {
      console.error("Failed to write to chosen directory", e);
    }
  };

  const createBackup = async (silent = false) => {
    if (!silent) setBackupLoading(true);
    try {
      // First save to server
      const res = await fetch("/api/backup", { method: "POST" });
      const result = await res.json();

      if (result.success) {
        const now = new Date().toLocaleString("ku", { dateStyle: "medium", timeStyle: "short" });
        setLastBackupTime(now);
        localStorage.setItem("last_backup_time", now);

        // Also write to user-chosen directory if set
        if (dirHandleRef.current) {
          const dataRes = await fetch("/api/backup");
          const data = await dataRes.json();
          await writeToChosenDir(data);
        }

        if (!silent) showToast("باکئەپ بە سەرکەوتوویی دروست کرا ✅", "success");
        fetchBackupList();
      } else {
        if (!silent) showToast("هەڵە لە دروستکردنی باکئەپ ❌", "error");
      }
    } catch (e) {
      if (!silent) showToast("هەڵە لە دروستکردنی باکئەپ ❌", "error");
    } finally {
      if (!silent) setBackupLoading(false);
    }
  };

  const downloadBackup = async () => {
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("فایلی باکئەپ دابەزێنرا 📥", "success");
    } catch (e) {
      showToast("هەڵە لە داونلۆد ❌", "error");
    }
  };

  const toggleAutoBackup = (enabled: boolean) => {
    setAutoBackup(enabled);
    localStorage.setItem("auto_backup_enabled", String(enabled));
    if (enabled) {
      showToast("باکئەپی خۆکار چالاک کرا 🔄", "success");
    } else {
      showToast("باکئەپی خۆکار لەکارخرا ⏸️", "success");
    }
  };

  const toggleBackupOnClose = (enabled: boolean) => {
    setBackupOnClose(enabled);
    localStorage.setItem("backup_on_close", String(enabled));
    if (enabled) {
      showToast("باکئەپ لەکاتی داخستن چالاک کرا 🛡️", "success");
    } else {
      showToast("باکئەپ لەکاتی داخستن لەکارخرا", "success");
    }
  };

  const clearDirectory = () => {
    setDirHandle(null);
    setDirName(null);
    dirHandleRef.current = null;
    localStorage.removeItem("backup_dir_name");
    // Clear from IndexedDB
    openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete("backupDir");
    });
    showToast("شوێنی خەزنکردن سڕایەوە", "success");
  };

  // Restore backup from file
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      showToast("تەنها فایلی JSON قبوڵ دەکرێت", "error");
      return;
    }
    setAdminUsername("");
    setAdminPassword("");
    setRestoreFile(file);
    setShowRestoreConfirm(true);
    // Reset input so same file can be selected again
    if (restoreInputRef.current) restoreInputRef.current.value = "";
  };

  const confirmRestore = async () => {
    if (!restoreFile) return;

    if (!adminUsername || !adminPassword) {
      showToast("تکایە یوزەرنەیم و پاسوۆرد بنووسە ❌", "error");
      return;
    }

    setShowRestoreConfirm(false);
    setRestoreLoading(true);
    try {
      const text = await restoreFile.text();
      const data = JSON.parse(text);

      if (!data.data || !data.version) {
        showToast("فایلەکە فایلی باکئەپی دروست نییە ❌", "error");
        setRestoreLoading(false);
        return;
      }

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-auth-username": encodeURIComponent(adminUsername),
          "x-auth-password": encodeURIComponent(adminPassword),
        },
        body: text,
      });
      const result = await res.json();

      if (res.ok && result.success) {
        showToast("داتا بە سەرکەوتوویی گەڕێنرایەوە ✅ — لاپەڕە ڕیفرێش دەکرێت...", "success");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        showToast(result.error || "هەڵە لە گەڕاندنەوە ❌", "error");
      }
    } catch (e) {
      showToast("هەڵە لە خوێندنەوەی فایل ❌", "error");
    } finally {
      setRestoreLoading(false);
      setRestoreFile(null);
      setAdminUsername("");
      setAdminPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 rtl font-sans p-6 pb-24">
      {/* Toast */}
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
            <h1 className="text-xl font-bold text-slate-900 m-0">باکئەپی داتا</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">بەڕێوەبردنی باکئەپ و گەڕاندنەوەی داتا.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">

        {/* Status Card */}
        <div className="bg-gradient-to-br from-[#6366f1] to-[#4f46e5] rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold m-0">دۆخی باکئەپ</h2>
                <p className="text-sm opacity-80 m-0 mt-1">
                  {autoBackup ? "باکئەپی خۆکار چالاکە — هەر ١ کاتژمێر جارێک" : "باکئەپی خۆکار لەکارخراوە"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {autoBackup ? (
                <span className="bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  چالاک
                </span>
              ) : (
                <span className="bg-white/10 text-white/70 border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold">
                  ناچالاک
                </span>
              )}
            </div>
          </div>

          {lastBackupTime && (
            <div className="mt-4 pt-4 border-t border-white/15 flex items-center gap-2 text-sm opacity-90">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              دوایین باکئەپ: <strong>{lastBackupTime}</strong>
            </div>
          )}
        </div>

        {/* Save Location Picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                📂
              </div>
              <div className="text-right">
                <h3 className="text-[15px] font-bold text-slate-800 m-0">شوێنی خەزنکردنی باکئەپ</h3>
                {dirName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                      📁 {dirName}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 m-0 mt-1">فۆڵدەرێک هەڵبژێرە بۆ خەزنکردنی فایلی باکئەپ</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dirName && (
                <button
                  onClick={clearDirectory}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-2 rounded-lg cursor-pointer border-none transition-colors"
                >
                  سڕینەوە
                </button>
              )}
              <button
                onClick={pickDirectory}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl cursor-pointer border-none transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {dirName ? "گۆڕین" : "هەڵبژاردن"}
              </button>
            </div>
          </div>
        </div>

        {/* Auto Backup Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6366f1]">
                🔄
              </div>
              <div className="text-right">
                <h3 className="text-[15px] font-bold text-slate-800 m-0">باکئەپی خۆکار</h3>
                <p className="text-xs text-slate-400 m-0 mt-1">هەر ١ کاتژمێر جارێک باکئەپ نوێ دەکرێتەوە. هەر ڕۆژ فایلێکی جیاواز.</p>
              </div>
            </div>
            <label className="relative flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => toggleAutoBackup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-slate-200 peer-checked:bg-[#6366f1] rounded-full transition-colors relative">
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all ${autoBackup ? 'left-[22px]' : 'left-0.5'}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Backup on Close Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                🛡️
              </div>
              <div className="text-right">
                <h3 className="text-[15px] font-bold text-slate-800 m-0">باکئەپ لەکاتی داخستن</h3>
                <p className="text-xs text-slate-400 m-0 mt-1">لەکاتی داخستنی بەرنامەکە کۆتا نوسخەی باکئەپ خەزن دەکرێت</p>
              </div>
            </div>
            <label className="relative flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={backupOnClose}
                onChange={(e) => toggleBackupOnClose(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-slate-200 peer-checked:bg-rose-500 rounded-full transition-colors relative">
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all ${backupOnClose ? 'left-[22px]' : 'left-0.5'}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => createBackup(false)}
            disabled={backupLoading}
            className="flex items-center justify-center gap-3 bg-[#6366f1] text-white p-5 rounded-2xl text-sm font-bold hover:bg-[#4f46e5] transition-all cursor-pointer border-none disabled:opacity-50 shadow-md shadow-indigo-500/15"
          >
            {backupLoading ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            )}
            دروستکردنی باکئەپ
          </button>
          <button
            onClick={downloadBackup}
            className="flex items-center justify-center gap-3 bg-white text-emerald-700 p-5 rounded-2xl text-sm font-bold hover:bg-emerald-50 transition-all cursor-pointer border border-emerald-200 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            داونلۆدی فایل
          </button>
        </div>

        {/* Backup Files List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                📁
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 m-0">فایلەکانی باکئەپ</h3>
                <p className="text-xs text-slate-400 m-0 mt-0.5">{backupFiles.length} فایل</p>
              </div>
            </div>
            <button
              onClick={fetchBackupList}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer border-none transition-colors"
            >
              نوێکردنەوە
            </button>
          </div>

          {backupFiles.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-3 opacity-40">📭</div>
              <p className="text-sm text-slate-400 m-0">هیچ فایلێکی باکئەپ نەدۆزرایەوە</p>
              <p className="text-xs text-slate-300 m-0 mt-1">باکئەپی یەکەم دروست بکە بۆ دەستپێکردن</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {backupFiles.map((file) => (
                <div key={file.fileName} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <span className="text-indigo-500 text-sm">📄</span>
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-700 block">{file.fileName}</span>
                      <span className="text-xs text-slate-400">{file.date}</span>
                    </div>
                  </div>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500">{file.size}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Restore Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden border-t-4 border-amber-400">
          <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-right">
                <h3 className="text-[15px] font-bold text-slate-800 m-0">گەڕاندنەوەی باکئەپ</h3>
                <p className="text-xs text-slate-400 m-0 mt-1">فایلی باکئەپ بارکە بۆ گەڕاندنەوەی هەموو داتاکان</p>
              </div>
            </div>

            <div className="bg-rose-50/50 border border-rose-200/50 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <p className="text-xs text-rose-700/80 m-0 leading-relaxed">
                  <strong>ئاگاداربە:</strong> گەڕاندنەوەی باکئەپ هەموو داتای ئێستا دەسڕێتەوە و جێگرەوەی دەکات بە داتای فایلی باکئەپ. پێش گەڕاندنەوە، باکئەپی ئێستا خەزن بکە.
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={restoreInputRef}
              onChange={handleRestoreFileSelect}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => restoreInputRef.current?.click()}
              disabled={restoreLoading}
              className="w-full flex items-center justify-center gap-3 bg-amber-500 text-white p-4 rounded-xl text-sm font-bold hover:bg-amber-600 transition-all cursor-pointer border-none disabled:opacity-50 shadow-md shadow-amber-500/15"
            >
              {restoreLoading ? (
                <span className="animate-spin text-xl">⏳</span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              {restoreLoading ? "گەڕاندنەوە..." : "بارکردنی فایلی باکئەپ بۆ گەڕاندنەوە"}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-right">
            <h4 className="text-sm font-bold text-amber-800 m-0">زانیاری گرنگ</h4>
            <p className="text-xs text-amber-700/80 m-0 mt-1 leading-relaxed">
              ئەگەر فۆڵدەرێک هەڵبژاردووە، فایلی باکئەپ هەم لە سێرڤەر و هەم لەو فۆڵدەرەدا خەزن دەکرێت.
              لەگەڵ هەر ڕۆژ فایلێکی نوێ دروست دەبێت (وەکو <strong dir="ltr">backup-2026-06-05.json</strong>).
              لەکاتی داخستنی بەرنامەکە کۆتا نوسخەی باکئەپ خۆکار خەزن دەکرێت.
            </p>
          </div>
        </div>

      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 m-0">دڵنیایت؟</h3>
                <p className="text-xs text-slate-400 m-0 mt-0.5">
                  فایل: <strong>{restoreFile?.name}</strong>
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-sm text-rose-800 m-0 font-bold leading-relaxed">
                ئەم کارە هەموو داتای ئێستا دەسڕێتەوە و جێگرەوەی دەکات بە داتای فایلی باکئەپ. ئەم کارە ناگەڕێتەوە!
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">یوزەرنەیمی بەڕێوبەر</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-semibold"
                  placeholder="یوزەرنەیم بنووسە"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">پاسوۆردی بەڕێوبەر</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-semibold"
                  placeholder="پاسوۆرد بنووسە"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={confirmRestore}
                className="flex-1 bg-rose-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-rose-600 transition-all cursor-pointer border-none"
              >
                بەڵێ، گەڕاندنەوە
              </button>
              <button
                onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); setAdminUsername(""); setAdminPassword(""); }}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all cursor-pointer border-none"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

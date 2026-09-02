const DB_NAME = "backup_db";
const STORE_NAME = "handles";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is only available in browser context"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
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

export async function writeToChosenDir(handle: FileSystemDirectoryHandle, data: any): Promise<boolean> {
  try {
    // Re-verify permission in write mode
    const perm = await (handle as any).requestPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      console.warn("Local directory write permission denied.");
      return false;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `backup-${dateStr}.json`;
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    console.log(`Saved backup locally to "${handle.name}/${fileName}"`);
    return true;
  } catch (e) {
    console.error("Failed to write to chosen directory:", e);
    return false;
  }
}

/**
 * Triggers the complete backup flow: saving on server filesystem (with /tmp fallback)
 * and saving to the user-chosen local PC directory if one is configured in IndexedDB.
 */
export async function performBackupFlow(): Promise<{ success: boolean; savedOnServer: boolean; savedLocally: boolean }> {
  let savedOnServer = false;
  let savedLocally = false;
  let success = false;

  // 1. Try to trigger server-side backup (with /tmp fallback)
  try {
    const res = await fetch("/api/backup", { method: "POST" });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        success = true;
        savedOnServer = result.savedOnServer;
      }
    }
  } catch (err) {
    console.error("Server-side backup failed:", err);
  }

  // 2. Try to write to local folder if configured in IndexedDB
  try {
    const handle = await loadHandle();
    if (handle) {
      const dataRes = await fetch("/api/backup");
      if (dataRes.ok) {
        const data = await dataRes.json();
        const saved = await writeToChosenDir(handle, data);
        if (saved) {
          savedLocally = true;
          success = true; // Succeeding locally is a success even if server storage is read-only
        }
      }
    }
  } catch (err) {
    console.error("Local client-side backup failed:", err);
  }

  if (success) {
    const now = new Date().toLocaleString("ku", { dateStyle: "medium", timeStyle: "short" });
    localStorage.setItem("last_backup_time", now);
  }

  return { success, savedOnServer, savedLocally };
}

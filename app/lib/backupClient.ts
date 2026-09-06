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
    // 1. Check existing permission first without user gesture
    let perm = "denied";
    try {
      perm = await (handle as any).queryPermission({ mode: "readwrite" });
    } catch {
      perm = "prompt";
    }

    // If not granted and we can request (e.g. from user click), try requestPermission
    if (perm !== "granted") {
      try {
        perm = await (handle as any).requestPermission({ mode: "readwrite" });
      } catch (err) {
        console.warn("Could not request permission without user gesture:", err);
      }
    }

    if (perm !== "granted") {
      console.warn("Local directory write permission denied.");
      return false;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const fileName = `backup-${dateStr}.json`;

    // Clean up any older same-day fragmented/timestamped files in the chosen local folder
    try {
      // @ts-ignore
      if (typeof handle.entries === "function") {
        // @ts-ignore
        for await (const [name, entry] of handle.entries()) {
          if (entry.kind === "file" && name.startsWith(`backup-${dateStr}_`) && name.endsWith(".json")) {
            await handle.removeEntry(name);
          }
        }
      }
    } catch {
      // Non-fatal if removal not supported by browser
    }

    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    console.log(`Saved daily backup locally to "${handle.name}/${fileName}"`);
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
    const res = await fetch(`/api/backup?_t=${Date.now()}`, { 
      method: "POST",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" }
    });
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
      const dataRes = await fetch(`/api/backup?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" }
      });
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

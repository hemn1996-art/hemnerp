/**
 * Voucher Draft Storage
 * پارێزەری داتاکانی پسووڵە لە sessionStorage
 * 
 * لە کاتی چوون بۆ کەشفی حساب یان گەڕانەوە بۆ لاپەڕەی پێشوو، 
 * ڕێگری دەکات لە سڕینەوە یان لەدەستچوونی داتای کڕیار و کاڵاکانی نێو پسووڵە.
 */

const STORAGE_PREFIX = "erp_voucher_draft_";

export function saveVoucherDraft(voucherType: string, draftData: any): void {
  if (typeof window === "undefined") return;
  try {
    if (!draftData) {
      clearVoucherDraft(voucherType);
      return;
    }
    const key = `${STORAGE_PREFIX}${voucherType}`;
    const payload = {
      savedAt: Date.now(),
      data: draftData,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save voucher draft:", err);
  }
}

export function getVoucherDraft<T = any>(voucherType: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${STORAGE_PREFIX}${voucherType}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed?.data as T) || null;
  } catch (err) {
    console.warn("Failed to retrieve voucher draft:", err);
    return null;
  }
}

export function clearVoucherDraft(voucherType: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${STORAGE_PREFIX}${voucherType}`;
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn("Failed to clear voucher draft:", err);
  }
}

export function hasVoucherDraft(voucherType: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `${STORAGE_PREFIX}${voucherType}`;
    return Boolean(sessionStorage.getItem(key));
  } catch {
    return false;
  }
}

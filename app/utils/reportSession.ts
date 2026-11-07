/**
 * reportSession.ts
 *
 * Preserves report filter state (search term, product selection, date range, pagination)
 * across navigation so when a user clicks into a voucher and returns,
 * their report search and date filters are not reset.
 */

export function getReportSessionState<T>(storageKey: string, defaultValues: T): T {
  if (typeof window === "undefined") return defaultValues;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return defaultValues;
    const parsed = JSON.parse(raw);
    return { ...defaultValues, ...parsed };
  } catch (e) {
    console.error(`Error reading session state for ${storageKey}:`, e);
    return defaultValues;
  }
}

export function saveReportSessionState<T>(storageKey: string, state: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) {
    console.error(`Error saving session state for ${storageKey}:`, e);
  }
}

export function clearReportSessionState(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey);
  } catch (e) {
    console.error(`Error clearing session state for ${storageKey}:`, e);
  }
}

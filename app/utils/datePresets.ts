/**
 * datePresets.ts
 *
 * Fast date range presets and helpers for all ERP reports.
 * Week starts on Saturday (شەممە).
 * Default start date is the 1st of current month.
 */

export type DatePresetKey = "today" | "yesterday" | "week" | "month" | "year" | "all" | "custom";

export interface DatePresetItem {
  key: DatePresetKey;
  label: string;
}

export const DATE_PRESETS: DatePresetItem[] = [
  { key: "today", label: "ئەمڕۆ" },
  { key: "yesterday", label: "دوێنێ" },
  { key: "week", label: "ئەم هەفتەیە" },
  { key: "month", label: "ئەم مانگە" },
  { key: "year", label: "ئەم ساڵە" },
  { key: "all", label: "هەمووی" },
];

export function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDatePresetRange(preset: DatePresetKey): { startDate: string; endDate: string } {
  const today = new Date();
  const todayStr = formatDateStr(today);

  switch (preset) {
    case "today":
      return { startDate: todayStr, endDate: todayStr };

    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateStr(y);
      return { startDate: yStr, endDate: yStr };
    }

    case "week": {
      // Week starts on Saturday (شەممە)
      const d = new Date(today);
      const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const diff = (dayOfWeek + 1) % 7;
      d.setDate(d.getDate() - diff);
      return { startDate: formatDateStr(d), endDate: todayStr };
    }

    case "month": {
      // 1st of current month to today
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDateStr(d), endDate: todayStr };
    }

    case "year": {
      // Jan 1st of current year to today
      const d = new Date(today.getFullYear(), 0, 1);
      return { startDate: formatDateStr(d), endDate: todayStr };
    }

    case "all":
      return { startDate: "", endDate: "" };

    default: {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDateStr(d), endDate: todayStr };
    }
  }
}

/**
 * Returns default date range for reports: 1st of this month to today.
 */
export function getDefaultReportDateRange(): { startDate: string; endDate: string } {
  return getDatePresetRange("month");
}

/**
 * Detects if the current startDate and endDate match any standard preset.
 */
export function detectMatchingPreset(startDate: string, endDate: string): DatePresetKey {
  if (!startDate && !endDate) return "all";
  const presets: DatePresetKey[] = ["today", "yesterday", "week", "month", "year"];
  for (const key of presets) {
    const r = getDatePresetRange(key);
    if (r.startDate === startDate && r.endDate === endDate) {
      return key;
    }
  }
  return "custom";
}

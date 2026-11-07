"use client";

import React, { useMemo } from "react";
import { DATE_PRESETS, DatePresetKey, getDatePresetRange, detectMatchingPreset } from "../utils/datePresets";

interface QuickDateFilterProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string, preset: DatePresetKey) => void;
  className?: string;
}

export default function QuickDateFilter({
  startDate,
  endDate,
  onChange,
  className = "",
}: QuickDateFilterProps) {
  const activePreset = useMemo(() => {
    return detectMatchingPreset(startDate, endDate);
  }, [startDate, endDate]);

  const handleSelect = (key: DatePresetKey) => {
    const range = getDatePresetRange(key);
    onChange(range.startDate, range.endDate, key);
  };

  return (
    <div className={`inline-flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 shadow-xs no-print h-[48px] box-border ${className}`}>
      {DATE_PRESETS.map((p) => {
        const isActive = activePreset === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => handleSelect(p.key)}
            className={`px-2.5 h-full text-xs font-black rounded-lg transition-all cursor-pointer border-none flex items-center gap-1 ${
              isActive
                ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80 active:scale-95"
            }`}
          >
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

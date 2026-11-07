"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { normalizeKurdishSearchText } from "@/app/utils/digits";

export interface Option {
  value: string | number;
  label: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  searchable = true,
  pluralLabel = "دیاریکراوە",
  compact = false,
  className = "",
  placeholder,
  maxDisplayTags,
}: {
  label: string;
  options: Option[];
  selectedValues: any[];
  onChange: (values: any[]) => void;
  searchable?: boolean;
  pluralLabel?: string;
  compact?: boolean;
  className?: string;
  placeholder?: string;
  maxDisplayTags?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveMaxTags = maxDisplayTags !== undefined ? maxDisplayTags : (compact ? 2 : 999);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const normSearch = normalizeKurdishSearchText(searchTerm);
    return options.filter(opt =>
      normalizeKurdishSearchText(opt.label).includes(normSearch)
    );
  }, [options, searchTerm]);

  const displayedOptions = useMemo(() => {
    return filteredOptions.slice(0, 100);
  }, [filteredOptions]);

  const toggleOption = (val: any) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
    inputRef.current?.focus();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const visibleSelectedValues = selectedValues.slice(0, effectiveMaxTags);
  const hiddenCount = selectedValues.length - visibleSelectedValues.length;

  return (
    <div ref={containerRef} className={`relative w-full text-right ${className}`} dir="rtl">
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full border rounded-xl bg-white outline-none text-right font-bold text-slate-800 shadow-xs flex items-center justify-between gap-2 cursor-pointer transition-all px-3.5 h-[48px] min-h-[48px] text-[14px] ${
          isOpen ? "border-[#0b1f50] ring-2 ring-[#0b1f50]/25 shadow-sm" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <div className="flex-1 flex flex-wrap items-center justify-start gap-1.5 overflow-hidden">
          {visibleSelectedValues.map(val => {
            const opt = options.find(o => o.value === val);
            if (!opt) return null;
            return (
              <span
                key={val}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-[#0b1f50] font-black rounded-lg transition-colors shrink-0 max-w-[220px] text-xs px-2.5 py-1 shadow-2xs"
                title={opt.label}
              >
                <span className="truncate">{opt.label}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                  className="bg-slate-300 hover:bg-rose-600 text-slate-700 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer border-none p-0 shrink-0"
                >
                  ✕
                </button>
              </span>
            );
          })}

          {hiddenCount > 0 && (
            <span
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center bg-blue-50 border border-blue-200 text-blue-800 font-black text-xs px-2.5 py-1 rounded-lg shrink-0 shadow-2xs"
              title={`${hiddenCount} زیاتر`}
            >
              +{hiddenCount} {pluralLabel}
            </span>
          )}

          {selectedValues.length === 0 && !isOpen && (
            <span className="text-slate-500 font-bold truncate text-right text-[14px]">
              {placeholder || label || "هەموو"}
            </span>
          )}

          {searchable && isOpen && (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={selectedValues.length === 0 ? (placeholder || label || "گەڕان...") : "گەڕان..."}
              className="flex-1 min-w-[130px] border-none outline-none font-bold text-slate-800 bg-transparent py-1 text-[14px] focus:ring-0 focus:outline-none"
              dir="rtl"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-gray-400 shrink-0 pl-0.5 border-r border-gray-200 pr-1.5">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-gray-400 hover:text-rose-600 bg-transparent border-none cursor-pointer text-xs font-bold flex items-center justify-center w-4 h-4"
              title="پاککردنەوەی هەموو"
            >
              ✕
            </button>
          )}
          <span className="text-[10px] text-gray-400 select-none">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[1050] mt-1 right-0 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 max-h-72 overflow-y-auto flex flex-col text-right">
          <div className="overflow-y-auto flex-1 space-y-1 pr-1 custom-scrollbar" style={{ maxHeight: "220px" }}>
            <div
              onClick={() => {
                onChange([]);
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              className={`flex items-center justify-start gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-xs font-black transition-all ${
                selectedValues.length === 0
                  ? "bg-slate-100 text-[#0b1f50]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedValues.length === 0}
                readOnly
                className="w-4 h-4 rounded border-slate-300 text-[#0b1f50] focus:ring-[#0b1f50] accent-[#0b1f50] cursor-pointer"
              />
              <span className="select-none">هەموو (کۆی گشتی)</span>
            </div>

            {displayedOptions.map(opt => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex items-center justify-start gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-black transition-all ${
                    isChecked
                      ? "bg-slate-100 text-[#0b1f50]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-[#0b1f50] focus:ring-[#0b1f50] accent-[#0b1f50] cursor-pointer"
                  />
                  <span className="truncate select-none">{opt.label}</span>
                </div>
              );
            })}

            {filteredOptions.length > 100 && (
              <div className="text-center text-slate-400 py-1.5 text-[11px] select-none border-t border-slate-100 mt-1">
                پیشاندانی ١٠٠ لە کۆی {filteredOptions.length} دانە — بۆ بینینی زیاتر بنووسە...
              </div>
            )}

            {filteredOptions.length === 0 && (
              <div className="text-center text-slate-400 py-3 text-xs select-none">
                هیچ ئەنجامێک نەدۆزرایەوە
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

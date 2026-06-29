"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

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
}: {
  label: string;
  options: Option[];
  selectedValues: any[];
  onChange: (values: any[]) => void;
  searchable?: boolean;
  pluralLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

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

  return (
    <div ref={containerRef} className="relative w-full text-right" dir="rtl">
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) inputRef.current?.focus();
        }}
        className={`mui-outline cursor-pointer select-none flex items-center justify-between gap-3 transition-all min-h-[52px] ${
          isOpen ? "border-[#0b1f50] ring-2 ring-[#0b1f50]/10" : ""
        }`}
      >
        <label className="select-none pointer-events-none">{label}</label>

        <div className="flex-1 flex flex-wrap items-center justify-start gap-1 py-1 px-1 overflow-hidden">
          {selectedValues.map(val => {
            const opt = options.find(o => o.value === val);
            if (!opt) return null;
            return (
              <span
                key={val}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-[#0b1f50] font-bold text-[11px] pr-2.5 pl-1.5 py-0.5 rounded-full transition-colors shrink-0"
              >
                <span>{opt.label}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                  className="bg-slate-300 hover:bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-black transition-colors cursor-pointer border-none p-0 shrink-0"
                >
                  ✕
                </button>
              </span>
            );
          })}

          {selectedValues.length === 0 && !isOpen && (
            <span className="text-slate-400 font-bold text-sm text-right px-1">
              هەموو
            </span>
          )}

          {searchable && isOpen && (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={selectedValues.length === 0 ? "گەڕان..." : ""}
              className="flex-1 min-w-[80px] border-none outline-none text-xs font-bold text-slate-800 bg-transparent py-0.5 focus:ring-0 focus:outline-none"
              dir="rtl"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500 shrink-0 pl-1 border-r border-slate-200 pr-2">
          {(selectedValues.length > 0 || searchTerm) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer text-sm font-bold flex items-center justify-center w-5 h-5"
              title="پاککردنەوەی هەموو"
            >
              ✕
            </button>
          )}
          <span className="text-[10px] select-none text-slate-400">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[1050] mt-1 right-0 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 max-h-72 overflow-y-auto flex flex-col text-right">
          <div className="overflow-y-auto flex-1 space-y-1 pr-1 custom-scrollbar" style={{ maxHeight: "220px" }}>
            <div
              onClick={() => {
                onChange([]);
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              className={`flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-black transition-all ${
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

            {filteredOptions.map(opt => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-black transition-all ${
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

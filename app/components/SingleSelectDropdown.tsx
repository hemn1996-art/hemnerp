"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

export interface SingleSelectOption {
  value: string;
  label: string;
}

export default function SingleSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "دیاری بکە...",
}: {
  options: SingleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  return (
    <div ref={containerRef} className={`relative w-full text-right ${isOpen ? "z-[9999]" : "z-10"}`} dir="rtl">
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full border rounded-lg px-3 py-2.5 bg-white min-h-[42px] outline-none text-right font-bold text-xs text-gray-700 shadow-sm flex items-center justify-between gap-2 cursor-pointer transition-colors ${
          isOpen ? "border-[#0b1f50] ring-2 ring-[#0b1f50]/20" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="flex-1 flex items-center justify-start overflow-hidden">
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={selectedOption ? selectedOption.label : placeholder}
              className="w-full border-none outline-none text-xs font-bold text-gray-800 bg-transparent py-0.5 focus:ring-0 focus:outline-none"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={selectedOption ? "text-gray-800 font-bold" : "text-gray-400 font-medium"}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-gray-400 shrink-0 pr-1">
          {value && !isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchTerm("");
              }}
              className="text-gray-400 hover:text-rose-600 bg-transparent border-none cursor-pointer text-xs font-bold flex items-center justify-center w-4 h-4"
              title="پاککردنەوە"
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
        <div className="absolute z-[1050] mt-1 right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto flex flex-col text-right">
          <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar" style={{ maxHeight: "200px" }}>
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearchTerm("");
              }}
              className={`px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                !value ? "bg-slate-100 text-[#0b1f50]" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {placeholder}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 font-medium text-center">
                هیچ ئەنجامێک نەدۆزرایەوە
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                    value === opt.value
                      ? "bg-[#0b1f50] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { CSSProperties, useRef, useState } from "react";

type DateInputProps = {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  placeholder?: string;
};

/**
 * A custom date input that displays the date in Day/Month/Year format (DD/MM/YYYY)
 * across all browsers, regardless of system locale, while utilizing the native date picker.
 */
export default function DateInput({
  value,
  onChange,
  disabled,
  style,
  className,
  placeholder,
}: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Format YYYY-MM-DD to DD/MM/YYYY
  const formatDisplayDate = (dateVal: string) => {
    if (!dateVal) return "";
    const cleanVal = dateVal.split("T")[0].split(" ")[0];
    const parts = cleanVal.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateVal;
  };

  const displayVal = formatDisplayDate(value);

  // Define fallback default classes if none provided
  const baseClassName =
    className ||
    "border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white font-bold shadow-sm";

  const handleClick = () => {
    if (!disabled && ref.current) {
      ref.current.showPicker?.();
      ref.current.focus();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        ...style,
      }}
      className={`${baseClassName} ${isFocused ? "ring-2 ring-blue-500 outline-none" : ""}`}
    >
      <span className="select-none font-bold" style={{ direction: "ltr", pointerEvents: "none" }}>
        {displayVal || placeholder || "DD/MM/YYYY"}
      </span>

      {/* Calendar Icon */}
      <svg
        className="w-4 h-4 opacity-70 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ pointerEvents: "none" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>

      {/* Hidden Native Date Input */}
      <input
        ref={ref}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          zIndex: 50,
          fontSize: "16px", // prevents iOS zoom
          pointerEvents: "none", // Let the parent div catch all clicks
        }}
      />
    </div>
  );
}

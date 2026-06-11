"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import { convertDigits } from "../utils/digits";

type FormattedNumberInputProps = {
  value: string | number;
  onChange: (val: string) => void;
  style?: CSSProperties;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

/**
 * Formats a number with commas (e.g., 1000000 -> 1,000,000).
 * Handles decimals correctly.
 */
function formatWithCommas(val: string): string {
  if (!val) return "";
  
  // Convert digits to English
  const englishVal = convertDigits(val);
  
  // Remove any non-digit, non-decimal, non-minus chars
  let cleaned = englishVal.replace(/[^\d.-]/g, "");
  
  // Handle multiple decimals (keep only first)
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  
  // Split into integer and decimal parts
  const intPart = parts[0];
  const decPart = parts.length > 1 ? "." + parts[1] : "";
  
  // Add commas to integer part
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  return formattedInt + decPart;
}

export default function FormattedNumberInput({
  value,
  onChange,
  style,
  placeholder,
  disabled,
  readOnly,
  className,
  onFocus,
  onBlur
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  // Update display value when external value changes
  useEffect(() => {
    // Only format if the passed value doesn't already match our unformatted display value
    const unformattedDisplay = displayValue.replace(/,/g, "");
    if (String(value) !== unformattedDisplay) {
      setDisplayValue(formatWithCommas(String(value)));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    // Format for display
    const formatted = formatWithCommas(rawVal);
    setDisplayValue(formatted);
    
    // Send unformatted numeric string to parent
    const unformatted = formatted.replace(/,/g, "");
    onChange(unformatted);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ ...style, direction: "ltr", textAlign: "right" }}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    />
  );
}

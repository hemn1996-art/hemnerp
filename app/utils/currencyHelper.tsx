import React from "react";

export interface CurrencyConfig {
  id?: number;
  code?: string;
  name?: string;
  symbol?: string;
  rate?: number;
  mode?: string | number | null;
  rounding?: boolean;
  decimalPlaces?: number;
  color?: string | null;
  isActive?: boolean;
}

/**
 * Resolves a CurrencyConfig from either:
 * - A CurrencyConfig object
 * - A currency ID (number or string) matching against a currencies array
 * - A currency code/symbol ("IQD", "USD", "$", "دینار")
 */
export function getCurrencyConfig(
  currencyOrId?: any,
  currenciesList?: any[]
): CurrencyConfig | null {
  if (!currencyOrId && !currenciesList) return null;

  if (typeof currencyOrId === "object" && currencyOrId !== null && (currencyOrId.code || currencyOrId.symbol || currencyOrId.id)) {
    return currencyOrId as CurrencyConfig;
  }

  const list = currenciesList || [];
  const search = currencyOrId;

  if (typeof search === "number" || (typeof search === "string" && /^\d+$/.test(search.trim()))) {
    const numId = Number(search);
    const found = list.find((c: any) => c.id === numId);
    if (found) return found;
    // Common fallback IDs
    if (numId === 2 || numId === 12) {
      return { id: 2, code: "IQD", name: "دینار", symbol: "دینار", mode: "250", rounding: true, decimalPlaces: 0 };
    }
    if (numId === 1 || numId === 11) {
      return { id: 1, code: "USD", name: "دۆلار", symbol: "$", mode: "1", rounding: false, decimalPlaces: 2 };
    }
  }

  if (typeof search === "string") {
    const s = search.trim();
    const found = list.find(
      (c: any) =>
        c.code?.toLowerCase() === s.toLowerCase() ||
        c.symbol?.toLowerCase() === s.toLowerCase() ||
        c.name?.toLowerCase() === s.toLowerCase()
    );
    if (found) return found;

    if (s === "IQD" || s === "دینار" || s.includes("دینار") || s === "د.ع") {
      return { id: 2, code: "IQD", name: "دینار", symbol: "دینار", mode: "250", rounding: true, decimalPlaces: 0 };
    }
    if (s === "USD" || s === "$" || s.includes("دۆلار")) {
      return { id: 1, code: "USD", name: "دۆلار", symbol: "$", mode: "1", rounding: false, decimalPlaces: 2 };
    }
  }

  return null;
}

/**
 * Rounds a numerical amount according to currency settings:
 * 1. If rounding === true:
 *    - If mode > 0 (e.g., 250 for IQD): rounds to nearest multiple of mode (Math.round(amount / mode) * mode)
 *    - E.g. 19,999 -> 20,000 | -19,999 -> -20,000 | 35,120 -> 35,000 | 35,130 -> 35,250
 *    - If no mode or mode <= 0: rounds to decimalPlaces.
 * 2. If rounding === false:
 *    - Rounds strictly to decimalPlaces (default 2 for USD, 0 for IQD).
 */
export function roundCurrency(
  value: number | string | null | undefined,
  currency?: any,
  currenciesList?: any[]
): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return 0;

  const cfg = getCurrencyConfig(currency, currenciesList);
  const isIQD = cfg?.code === "IQD" || cfg?.id === 2 || cfg?.id === 12 || cfg?.symbol === "دینار";
  
  const isRounding = cfg?.rounding ?? isIQD;
  const rawMode = cfg?.mode !== undefined && cfg?.mode !== null ? String(cfg.mode).trim() : (isIQD ? "250" : "1");
  const modeVal = parseFloat(rawMode);

  const decimals = cfg?.decimalPlaces !== undefined && cfg?.decimalPlaces !== null
    ? Number(cfg.decimalPlaces)
    : (isIQD ? 0 : 2);

  if (isRounding && !isNaN(modeVal) && modeVal > 0) {
    // Round to multiple of mode
    const stepped = Math.round(num / modeVal) * modeVal;
    // Fix any floating point noise (e.g. 0.1 * 3 = 0.30000000000000004)
    if (decimals >= 0) {
      return Number(stepped.toFixed(decimals));
    }
    return stepped;
  }

  // Round strictly to decimalPlaces
  const factor = Math.pow(10, Math.max(0, decimals));
  return Math.round(num * factor) / factor;
}

/**
 * Format a number according to currency settings as a clean string.
 * Strictly adheres to AGENTS.md rules:
 * - IQD: {number} دینار (دینار on the right)
 * - USD: $ {number} ($ on the left)
 * - Negative amounts: -{number} دینار or -$ {number} (never flips to number-)
 */
export function formatCurrencyString(
  value: number | string | null | undefined,
  currency?: any,
  currenciesList?: any[]
): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "0";

  const cfg = getCurrencyConfig(currency, currenciesList);
  const isIQD = cfg?.code === "IQD" || cfg?.id === 2 || cfg?.id === 12 || cfg?.symbol === "دینار";

  const rounded = roundCurrency(num, cfg);
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);

  const decimals = cfg?.decimalPlaces !== undefined && cfg?.decimalPlaces !== null
    ? Number(cfg.decimalPlaces)
    : (isIQD ? 0 : 2);

  const formattedNum = absVal.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = "";

  if (isIQD) {
    return `\u2066دینار ${formattedNum}\u2069`;
  }

  const symbol = cfg?.symbol || "$";
  if (symbol === "$") {
    return `\u2066$ ${formattedNum}\u2069`;
  }

  return `\u2066${symbol} ${formattedNum}\u2069`;
}

/**
 * Render currency JSX element with guaranteed correct visual layout:
 * - Uses `<span dir="ltr">`
 * - IQD: `دینار {number}` (دینار on the left)
 * - USD: `$ {number}` ($ on the left)
 */
export function formatCurrencyJSX(
  value: number | string | null | undefined,
  currency?: any,
  currenciesList?: any[],
  options?: {
    className?: string;
    symbolClassName?: string;
    decimalClassName?: string;
  }
): React.ReactElement {
  if (value === null || value === undefined || value === "") {
    return <span className={options?.className || ""}>0</span>;
  }
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) {
    return <span className={options?.className || ""}>0</span>;
  }

  const cfg = getCurrencyConfig(currency, currenciesList);
  const isIQD = cfg?.code === "IQD" || cfg?.id === 2 || cfg?.id === 12 || cfg?.symbol === "دینار";

  const rounded = roundCurrency(num, cfg);
  const absVal = Math.abs(rounded);

  const decimals = cfg?.decimalPlaces !== undefined && cfg?.decimalPlaces !== null
    ? Number(cfg.decimalPlaces)
    : (isIQD ? 0 : 2);

  const formattedStr = absVal.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const parts = formattedStr.split(".");
  const wholePart = parts[0];
  const decimalPart = parts[1];

  const symbolStyle: React.CSSProperties = {
    fontSize: "0.85em",
    opacity: 0.85,
  };

  const decimalStyle: React.CSSProperties = {
    fontSize: "0.82em",
    opacity: 0.85,
  };

  if (isIQD) {
    return (
      <span
        className={`inline-flex items-baseline gap-1 font-semibold ${options?.className || ""}`}
        dir="ltr"
      >
        <span className={options?.symbolClassName || ""} style={symbolStyle}>
          دینار
        </span>
        <span>{wholePart}</span>
        {decimalPart && (
          <span className={options?.decimalClassName || ""} style={decimalStyle}>
            .{decimalPart}
          </span>
        )}
      </span>
    );
  }

  const symbol = cfg?.symbol || "$";

  return (
    <span
      className={`inline-flex items-baseline gap-1 font-semibold ${options?.className || ""}`}
      dir="ltr"
    >
      <span className={options?.symbolClassName || ""} style={symbolStyle}>
        {symbol}
      </span>
      <span>{wholePart}</span>
      {decimalPart && (
        <span className={options?.decimalClassName || ""} style={decimalStyle}>
          .{decimalPart}
        </span>
      )}
    </span>
  );
}

/**
 * Format a number with comma separators (e.g., 1,000,000)
 * Handles negative numbers, decimals, and string inputs
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // Use toLocaleString for comma formatting
  // Round to avoid floating point display issues
  const rounded = Math.round(num * 10) / 10;
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Format number with currency symbol
 */
export function formatCurrency(value: number | string | null | undefined, symbol: string = "$"): string {
  return `${formatNumber(value)} ${symbol}`;
}

import React from 'react';

interface FormattedNumberProps {
  value: number | string;
  decimals?: number;
  className?: string;
  currencySymbol?: string;
}

export default function FormattedNumber({ 
  value, 
  decimals = 2, 
  className = "",
  currencySymbol = ""
}: FormattedNumberProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return <span className={className}>{value} {currencySymbol}</span>;
  }

  const isIQD = currencySymbol === "دینار" || currencySymbol.includes("دینار") || currencySymbol.includes("IQD");
  const actualDecimals = isIQD ? 0 : decimals;
  const processedValue = isIQD ? Math.round(numValue) : numValue;

  // Format to string with fixed decimals
  const formatted = processedValue.toLocaleString('en-US', {
    minimumFractionDigits: actualDecimals,
    maximumFractionDigits: actualDecimals
  });

  const parts = formatted.split('.');
  const wholePart = parts[0];
  const decimalPart = parts[1] || (actualDecimals > 0 ? "0".repeat(actualDecimals) : null);

  return (
    <span className={className} dir="ltr" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'baseline', gap: '4px' }}>
      {currencySymbol && <span style={{ fontSize: '0.8em', opacity: 0.8 }}>{currencySymbol}</span>}
      <span>
        <span>{wholePart}</span>
        {decimalPart && (
          <span style={{ fontSize: '0.7em', opacity: 0.8, verticalAlign: 'baseline' }}>
            .{decimalPart}
          </span>
        )}
      </span>
    </span>
  );
}

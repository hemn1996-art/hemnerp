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
  const isInteger = processedValue % 1 === 0;
  // If it's an integer, maybe we don't want decimals? 
  // Let's use toLocaleString with minimumFractionDigits: 0, maximumFractionDigits: decimals
  const formatted = processedValue.toLocaleString('en-US', {
    minimumFractionDigits: isInteger ? 0 : actualDecimals,
    maximumFractionDigits: actualDecimals
  });

  const parts = formatted.split('.');
  const wholePart = parts[0];
  const decimalPart = parts[1];

  return (
    <span className={className} dir="ltr" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'baseline', gap: '4px' }}>
      {currencySymbol && <span style={{ fontSize: '0.8em', opacity: 0.8 }}>{currencySymbol}</span>}
      <span>
        <span>{wholePart}</span>
        {decimalPart && (
          <span className="text-[0.7em] opacity-80" style={{ verticalAlign: 'baseline' }}>
            .{decimalPart}
          </span>
        )}
      </span>
    </span>
  );
}

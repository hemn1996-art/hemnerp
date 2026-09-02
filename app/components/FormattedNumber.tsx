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

  const isIQD = currencySymbol === "دینار" || currencySymbol.includes("دینار") || currencySymbol.includes("IQD") || currencySymbol.includes("د.ع");
  const displaySymbol = currencySymbol;
  const actualDecimals = isIQD ? 0 : Math.min(decimals, 2);
  const processedValue = isIQD ? Math.round(numValue) : Math.round(numValue * 100) / 100;
  const isInteger = processedValue % 1 === 0;

  // Format to string with fixed decimals
  const formatted = processedValue.toLocaleString('en-US', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: actualDecimals
  });

  const parts = formatted.split('.');
  const wholePart = parts[0];
  const decimalPart = parts[1];

  return (
    <span className={className} dir="ltr" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'baseline', gap: '3px' }}>
      {!isIQD && displaySymbol && <span style={{ fontSize: '0.78em', opacity: 0.8, fontWeight: 700 }}>{displaySymbol}</span>}
      {isIQD && <span style={{ fontSize: '0.78em', opacity: 0.8, fontWeight: 700 }}>دینار</span>}
      <span>
        <span>{wholePart}</span>
        {decimalPart && (
          <span style={{ fontSize: '0.72em', opacity: 0.8, verticalAlign: 'baseline', fontWeight: 700 }}>
            .{decimalPart}
          </span>
        )}
      </span>
    </span>
  );
}

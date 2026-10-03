/**
 * voucherGuard.ts
 *
 * Server-side Accounting & Exchange Rate Guard for Vouchers.
 * Guarantees that:
 * 1. Exchange rates are always within valid bounds and normalized (per 1 USD).
 * 2. Rates entered as 100$ rate (e.g. 156,000) or decimalized (e.g. 15.6) are normalized to 1560.
 * 3. Shareholder withdrawal & deposit USD equivalents are mathematically verified and cannot be distorted.
 * 4. Corrupted or malicious exchange rates never reach PostgreSQL.
 */

export interface CurrencyRecord {
  id: number;
  code: string;
  rate?: number;
  exchangeRate?: number;
  isActive?: boolean;
}

function getCurrencyRate(c?: CurrencyRecord): number {
  if (!c) return 1560;
  const val = c.rate ?? c.exchangeRate ?? 1560;
  return val > 500 ? val : 1560;
}

/**
 * Normalizes an exchange rate to represent rate per 1 USD for IQD.
 * E.g.:
 * - 156000 -> 1560
 * - 15.6 -> 1560
 * - 15.5 -> 1550
 * - 1560 -> 1560
 */
export function normalizeExchangeRatePerDollar(
  rawRate: number | string | undefined | null,
  currencyCodeOrId: string | number | undefined,
  currencies: CurrencyRecord[]
): number {
  const isUSD = currencyCodeOrId === 1 || currencyCodeOrId === "USD";
  if (isUSD) return 1;

  const iqdCurrency = currencies.find(c => c.code === "IQD" || c.id === 2);
  const defaultIqdRate = getCurrencyRate(iqdCurrency);

  const num = typeof rawRate === "string" ? parseFloat(rawRate.replace(/,/g, "")) : Number(rawRate);
  if (!num || isNaN(num) || num <= 0) {
    return defaultIqdRate;
  }

  let normalized = num;
  if (normalized >= 100000) {
    normalized = normalized / 100;
  } else if (normalized < 100 && normalized > 1) {
    normalized = normalized * 100;
  }

  // Sanity range check: rate per 1 USD must be between 500 and 5000
  if (normalized < 500 || normalized > 5000) {
    console.warn(`[voucherGuard] Out-of-bounds exchange rate ${num} detected, falling back to ${defaultIqdRate}`);
    return defaultIqdRate;
  }

  return Number(normalized.toFixed(4));
}

/**
 * Validates and normalizes all financial data on voucher create/update before DB transaction.
 */
export function sanitizeAndGuardVoucherData(data: any, currencies: CurrencyRecord[]): any {
  if (!data) return data;

  const iqdCurrency = currencies.find(c => c.code === "IQD" || c.id === 2);
  const defaultIqdRate = getCurrencyRate(iqdCurrency);

  // 0. Auto-sync voucher currency with lines if all lines are pure IQD or pure USD
  if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
    const allLinesIQD = data.lines.every((l: any) => l.currencyId === 2 || l.currencyId === 12);
    const allLinesUSD = data.lines.every((l: any) => l.currencyId === 1 || l.currencyId === 11);

    if (allLinesIQD) {
      data.currencyId = 2;
      const sumIQD = data.lines.reduce((s: number, l: any) => s + (Number(l.lineTotal || (Number(l.qty || 0) * Number(l.unitPrice || 0))) || 0), 0);
      // If totalAmount was erroneously converted to USD (e.g. 769.23 while sumIQD is 1,200,000), restore sumIQD
      if (sumIQD > 5000 && Number(data.totalAmount) < 10000) {
        data.totalAmount = sumIQD;
        data.netAmount = sumIQD - Number(data.totalDiscount || 0);
      }
    } else if (allLinesUSD && Number(data.currencyId) !== 1) {
      // If line amounts or total are >= 10000, they are almost certainly IQD entered under USD default
      if (Number(data.totalAmount) >= 10000 || data.lines.some((l: any) => Number(l.lineTotal) >= 10000 || Number(l.unitPrice) >= 10000)) {
        data.currencyId = 2;
        data.lines.forEach((l: any) => { l.currencyId = 2; });
        if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
          data.paidAmounts.forEach((p: any) => { if (Number(p.amount) >= 10000) p.currencyId = 2; });
        }
      } else {
        data.currencyId = 1;
      }
    } else if (Number(data.currencyId) === 1) {
      // If total amount is >= 10000 and paid amount is >= 10000, user entered IQD without switching currency
      if (Number(data.totalAmount) >= 10000 || (data.paidAmounts && data.paidAmounts.some((p: any) => Number(p.amount) >= 10000))) {
        data.currencyId = 2;
        data.lines.forEach((l: any) => { l.currencyId = 2; });
        if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
          data.paidAmounts.forEach((p: any) => { if (Number(p.amount) >= 10000) p.currencyId = 2; });
        }
      }
    }
  }

  // 1. Determine voucher currency
  const voucherCurrencyId = Number(data.currencyId || 1);
  const isVoucherIQD = voucherCurrencyId === 2 || (iqdCurrency && voucherCurrencyId === iqdCurrency.id);

  // 2. Normalize voucher exchangeRate
  if (isVoucherIQD) {
    data.exchangeRate = normalizeExchangeRatePerDollar(data.exchangeRate, 2, currencies);
  } else if (voucherCurrencyId === 1) {
    data.exchangeRate = 1;
  } else {
    data.exchangeRate = normalizeExchangeRatePerDollar(data.exchangeRate, voucherCurrencyId, currencies);
  }

  // 3. Normalize paidAmounts exchangeRate
  if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
    for (const pa of data.paidAmounts) {
      const paCurId = Number(pa.currencyId);
      if (paCurId === 2 || (iqdCurrency && paCurId === iqdCurrency.id)) {
        pa.exchangeRate = normalizeExchangeRatePerDollar(pa.exchangeRate, 2, currencies);
      } else if (paCurId === 1) {
        pa.exchangeRate = 1;
      }
    }
  }

  // 4. Normalize ledgerEntries exchangeRate
  if (data.ledgerEntries && Array.isArray(data.ledgerEntries)) {
    for (const le of data.ledgerEntries) {
      const leCurId = Number(le.currencyId);
      if (leCurId === 2 || (iqdCurrency && leCurId === iqdCurrency.id)) {
        le.exchangeRate = normalizeExchangeRatePerDollar(le.exchangeRate, 2, currencies);
      } else if (leCurId === 1) {
        le.exchangeRate = 1;
      }
    }
  }

  // 5. Special Hard Protection for Shareholder Vouchers
  const isShareholder = data.type === "shareholder_withdrawal" || data.type === "shareholder_deposit";
  if (isShareholder && data.paidAmounts && Array.isArray(data.paidAmounts) && data.paidAmounts.length > 0) {
    const primaryPayment = data.paidAmounts[0];
    const pAmt = Number(primaryPayment.amount) || 0;
    const pCurId = Number(primaryPayment.currencyId);

    if (pCurId === 2 || (iqdCurrency && pCurId === iqdCurrency.id)) {
      const rate = normalizeExchangeRatePerDollar(primaryPayment.exchangeRate || data.exchangeRate, 2, currencies);
      const calculatedUSD = Number((pAmt / rate).toFixed(2));

      // Overwrite totalAmount with the mathematically sound USD equivalent
      data.totalAmount = calculatedUSD;
      data.exchangeRate = rate;
      primaryPayment.exchangeRate = rate;
    } else if (pCurId === 1) {
      data.totalAmount = pAmt;
      data.exchangeRate = 1;
      primaryPayment.exchangeRate = 1;
    }
  }

  return data;
}

/**
 * voucherGuard.ts
 *
 * Server-side Accounting & Exchange Rate Guard for Vouchers.
 * Guarantees that:
 * 1. Exchange rates are always within valid bounds and normalized (per 1 USD).
 * 2. Rates entered as 100$ rate (e.g. 156,000) or decimalized (e.g. 15.6) are normalized to 1560.
 * 3. Shareholder withdrawal & deposit USD equivalents are mathematically verified and cannot be distorted.
 * 4. Line item currencies are strictly synchronized with voucher currency for purchases and sales.
 * 5. Cash transactions (Account 9 "کڕینی نەقدی", cash customers, fully paid) NEVER produce phantom debt:
 *    debit === credit on cash account entries is enforced at the server layer.
 * 6. Ledger entries scale anomalies (e.g. 17,000 vs 10.90 from exchange-rate division) are caught and normalized.
 * 7. Incoming inventory transactions are guaranteed to inherit the correct voucher currency and price scale.
 */

export interface CurrencyRecord {
  id: number;
  code: string;
  rate?: number;
  exchangeRate?: number;
  isActive?: boolean;
}

export interface AccountRecord {
  id: number;
  name?: string | null;
  isShareholder?: boolean | null;
  isCash?: boolean | null;
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

  // If rate was 1 or tiny (placeholder), fallback to default IQD rate!
  if (normalized <= 1) {
    return defaultIqdRate;
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
export function sanitizeAndGuardVoucherData(
  data: any,
  currencies: CurrencyRecord[],
  account?: AccountRecord | null
): any {
  if (!data) return data;

  const iqdCurrency = currencies.find(c => c.code === "IQD" || c.id === 2);
  const defaultIqdRate = getCurrencyRate(iqdCurrency);

  // 1. Determine voucher currency
  let voucherCurrencyId = Number(data.currencyId || 1);
  const isIncomingStock = ["purchase", "purchase_return"].includes(data.type);
  const isStockInventory = ["warehouse_stock", "جەردی کۆگا"].includes(data.type);
  const isOutgoingStock = ["sales", "sales_return", "quotation", "نرخاندن", "warehouse_damage", "خەسارەی کۆگا", "material_issue", "سەرفی مواد"].includes(data.type);

  // 2. Line Items Currency & Scale Invariants
  if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
    if (isStockInventory) {
      // In warehouse stock inventory, lines can legitimately be multi-currency (e.g. USD items and IQD items).
      // Preserve explicit line currencies!
      for (const line of data.lines) {
        if (!line.currencyId) {
          line.currencyId = voucherCurrencyId;
        } else {
          line.currencyId = Number(line.currencyId);
        }
        const lQty = Number(line.qty || 0);
        const lPrice = Number(line.unitPrice || 0);
        const lDisc = Number(line.discountAmount || 0);
        line.lineTotal = Math.max(0, (lQty * lPrice) - lDisc);
      }
    } else if (isIncomingStock) {
      // For purchases and purchase returns, line currency MUST match voucher currency.
      // This prevents a USD purchase of $170 from having lines tagged as IQD (2),
      // which would destroy product moving average costs.
      for (const line of data.lines) {
        line.currencyId = voucherCurrencyId;
      }
    } else if (isOutgoingStock) {
      // For sales, sales_return, damage: lines can legitimately be multi-currency (e.g. USD appliance, IQD accessories).
      // NEVER overwrite the user's explicit line currency!
      for (const line of data.lines) {
        if (!line.currencyId) {
          line.currencyId = voucherCurrencyId;
        } else {
          line.currencyId = Number(line.currencyId);
        }
        const lQty = Number(line.qty || 0);
        const lPrice = Number(line.unitPrice || 0);
        const lDisc = Number(line.discountAmount || 0);
        line.lineTotal = Math.max(0, (lQty * lPrice) - lDisc);
      }
    } else {
      // For other voucher types: auto-sync if all lines are pure IQD or pure USD
      const allLinesIQD = data.lines.every((l: any) => l.currencyId === 2 || l.currencyId === 12);
      const allLinesUSD = data.lines.every((l: any) => l.currencyId === 1 || l.currencyId === 11);

      if (allLinesIQD) {
        data.currencyId = 2;
        voucherCurrencyId = 2;
        const sumIQD = data.lines.reduce((s: number, l: any) => s + (Number(l.lineTotal || (Number(l.qty || 0) * Number(l.unitPrice || 0))) || 0), 0);
        if (sumIQD > 5000 && Number(data.totalAmount) < 10000) {
          data.totalAmount = sumIQD;
          data.netAmount = sumIQD - Number(data.totalDiscount || 0);
        }
      } else if (allLinesUSD && Number(data.currencyId) !== 1) {
        data.currencyId = 1;
        voucherCurrencyId = 1;
      }
    }
  }

  // 3. Normalize voucher exchangeRate
  // Always preserve and normalize the voucher exchange rate to IQD (e.g. 1680)
  data.exchangeRate = normalizeExchangeRatePerDollar(data.exchangeRate, 2, currencies);

  // 4. Normalize paidAmounts exchangeRate
  if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
    for (const pa of data.paidAmounts) {
      const paCurId = Number(pa.currencyId);
      if (paCurId === 2 || (iqdCurrency && paCurId === iqdCurrency.id)) {
        pa.exchangeRate = normalizeExchangeRatePerDollar(pa.exchangeRate || data.exchangeRate, 2, currencies);
      } else if (paCurId === 1) {
        pa.exchangeRate = 1;
      }
    }
  }

  // 5. Cash Account & Fully-Paid Double-Entry Invariant
  // Detect if account is a cash account (has isCash flag or name contains نەقد / نقدی / کاش)
  const isCashAccount = account
    ? Boolean(
        account.isCash ||
        (account.name && (account.name.includes("نەقد") || account.name.includes("نقدی") || account.name.includes("کاش")))
      )
    : false;

  const rateForConversion = normalizeExchangeRatePerDollar(data.exchangeRate, 2, currencies);
  const totalPaidConvertedToVoucherCur = Array.isArray(data.paidAmounts)
    ? data.paidAmounts.reduce((sum: number, pa: any) => {
        const paCurId = Number(pa.currencyId);
        const pAmt = Number(pa.amount) || 0;
        if (paCurId === voucherCurrencyId) return sum + pAmt;
        if (voucherCurrencyId === 1 && paCurId === 2) return sum + (pAmt / rateForConversion);
        if (voucherCurrencyId === 2 && paCurId === 1) return sum + (pAmt * rateForConversion);
        return sum + pAmt;
      }, 0)
    : 0;

  const vNetAmount = Number(data.netAmount || 0);
  const diffInVoucherCur = Math.abs(totalPaidConvertedToVoucherCur - vNetAmount);
  const diffInUsd = voucherCurrencyId === 1 ? diffInVoucherCur : (rateForConversion > 0 ? diffInVoucherCur / rateForConversion : diffInVoucherCur);
  const diffInIqd = voucherCurrencyId === 2 ? diffInVoucherCur : diffInVoucherCur * rateForConversion;

  // Fully paid if difference is less than $5 AND less than 5000 IQD
  const isWithinCashTolerance = diffInUsd < 5.0 && diffInIqd < 5000;
  const isCashSettled = (isCashAccount || (totalPaidConvertedToVoucherCur >= (vNetAmount - 0.05)) || isWithinCashTolerance) && vNetAmount > 0;

  // 6. Normalize, Filter and Guard ledgerEntries
  if (data.ledgerEntries && Array.isArray(data.ledgerEntries)) {
    const lineCurIds = new Set((data.lines || []).map((l: any) => Number(l.currencyId || voucherCurrencyId)));
    const paidCurIds = new Set((data.paidAmounts || []).map((p: any) => Number(p.currencyId || voucherCurrencyId)));
    const allowedCurIds = new Set([voucherCurrencyId, ...lineCurIds, ...paidCurIds]);

    const sanitizedEntries = [];

    for (const le of data.ledgerEntries) {
      const leCurId = Number(le.currencyId || voucherCurrencyId);

      // CRITICAL: Reject phantom ledger entries whose currency is NOT in voucher, lines, or paid amounts!
      if (!allowedCurIds.has(leCurId)) {
        console.warn(`[voucherGuard] Stripped phantom ledgerEntry with currencyId ${leCurId} not related to voucher`);
        continue;
      }

      if (leCurId === 2 || (iqdCurrency && leCurId === iqdCurrency.id)) {
        le.exchangeRate = normalizeExchangeRatePerDollar(le.exchangeRate, 2, currencies);
      } else if (leCurId === 1) {
        le.exchangeRate = 1;
      }

      let debit = Number(le.debit || 0);
      let credit = Number(le.credit || 0);

      // A. Scale Anomaly Guard (e.g. debit: 10.90, credit: 17000)
      if (debit > 0 && credit > 0) {
        const max = Math.max(debit, credit);
        const min = Math.min(debit, credit);
        if (min > 0 && (max / min) > 200) {
          console.warn(`[voucherGuard] Caught scale anomaly in ledgerEntry: debit=${debit}, credit=${credit}. Auto-normalizing to ${max}`);
          debit = max;
          credit = max;
        }
      }

      // B. Cash Account / Fully Paid Invariant
      // Net balance on the cash account MUST BE ZERO: debit === credit
      if (isCashAccount || isCashSettled) {
        if (leCurId === voucherCurrencyId) {
          const trueAmt = Math.max(debit, credit, Number(data.netAmount || 0));
          debit = trueAmt;
          credit = trueAmt;
        } else {
          // If invoice is fully cash settled, but an entry exists for another currency:
          // it must NOT leave an unbalanced debt/credit on the customer!
          if (Math.abs(debit - credit) > 0.01) {
            console.warn(`[voucherGuard] Stripped unbalanced non-voucher currency entry on cash settled invoice: curId=${leCurId}`);
            continue;
          }
        }
      }

      le.debit = debit;
      le.credit = credit;
      le.currencyId = leCurId;
      sanitizedEntries.push(le);
    }

    data.ledgerEntries = sanitizedEntries;
  }

  // 7. Special Hard Protection for Shareholder Vouchers
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

  // 6. Guard Ledger Entries against USD scale corruption (e.g. IQD amounts accidentally tagged as USD)
  if (data.ledgerEntries && Array.isArray(data.ledgerEntries)) {
    const rate = normalizeExchangeRatePerDollar(data.exchangeRate, 2, currencies);
    for (const le of data.ledgerEntries) {
      const curId = Number(le.currencyId);
      if (curId === 1) { // USD
        if (le.debit > 50000) {
          console.warn(`[voucherGuard] Abnormally huge USD debit ${le.debit} detected on voucher. Normalizing with rate ${rate}`);
          le.debit = Number((le.debit / rate).toFixed(2));
          le.exchangeRate = rate;
        }
        if (le.credit > 50000) {
          console.warn(`[voucherGuard] Abnormally huge USD credit ${le.credit} detected on voucher. Normalizing with rate ${rate}`);
          le.credit = Number((le.credit / rate).toFixed(2));
          le.exchangeRate = rate;
        }
      }
    }
  }

  return data;
}

/**
 * Validates and guards incoming inventory transactions before database insertion.
 * Guarantees that:
 * 1. Incoming inventory currency strictly matches the purchase/stock voucher currency.
 * 2. Unit cost cannot suffer from extreme scale mismatch (e.g. IQD price entered in USD field).
 */
export function guardIncomingInventoryTransaction(
  invTx: {
    productId: number;
    warehouseId: number;
    qtyChange: number;
    unitCost: number;
    currencyId: number;
  },
  voucher: {
    type: string;
    currencyId: number;
    exchangeRate?: number;
  },
  currencies: CurrencyRecord[]
): {
  currencyId: number;
  unitCost: number;
} {
  // Only guard incoming transactions (qtyChange > 0)
  if (invTx.qtyChange <= 0) {
    return { currencyId: invTx.currencyId, unitCost: invTx.unitCost };
  }

  const isStockInventory = voucher.type === "warehouse_stock" || voucher.type === "جەردی کۆگا";
  const vCurId = Number(voucher.currencyId || 1);
  let resolvedCurId = isStockInventory ? (Number(invTx.currencyId) || vCurId) : vCurId;
  let resolvedCost = Number(invTx.unitCost || 0);

  const rate = normalizeExchangeRatePerDollar(voucher.exchangeRate, 2, currencies);

  // If incoming transaction is in IQD (currencyId === 2 or 12, or not USD with large amount):
  // Rule: All warehouse inventory is locked in USD at the voucher's exchange rate.
  const isIncomingIQD = resolvedCurId === 2 || resolvedCurId === 12 || (resolvedCurId !== 1 && resolvedCost > 15000);
  if (isIncomingIQD) {
    const costUsd = Number((resolvedCost / rate).toFixed(4));
    console.log(`[voucherGuard] Locking incoming IQD cost ${resolvedCost} to USD ${costUsd} at rate ${rate * 100}`);
    return {
      currencyId: 1, // USD
      unitCost: costUsd,
    };
  }

  // If voucher is USD (1), but unitCost > 15000 (typical accidental IQD amount like 250,000)
  if (resolvedCurId === 1 && resolvedCost > 15000) {
    console.warn(`[voucherGuard] Incoming USD unit cost ${resolvedCost} is abnormally large. Normalizing by rate ${rate}`);
    resolvedCost = Number((resolvedCost / rate).toFixed(4));
  }

  return {
    currencyId: resolvedCurId,
    unitCost: resolvedCost,
  };
}

import { currencies as mockCurrencies } from "../data/mockData";

export interface LedgerEntryPayload {
  currencyId: number;
  debit: number;
  credit: number;
  exchangeRate: number;
}

function getActiveCurrencies(customCurrencies?: { id: number; code: string }[]) {
  return customCurrencies || mockCurrencies;
}

function isUSD(id: number, customCurrencies?: { id: number; code: string }[]): boolean {
  if (id === 1 || id === 5 || id === 11) return true; // Support both DB ID (1) and Mock ID (5)
  const list = getActiveCurrencies(customCurrencies);
  const code = list.find(c => c.id === id)?.code;
  return code === "USD";
}

function isIQD(id: number, customCurrencies?: { id: number; code: string }[]): boolean {
  if (id === 2 || id === 6 || id === 12) return true; // Support both DB ID (2) and Mock ID (6)
  const list = getActiveCurrencies(customCurrencies);
  const code = list.find(c => c.id === id)?.code;
  return code === "IQD";
}

function getOtherCurrencyId(id: number, customCurrencies?: { id: number; code: string }[]): number {
  if (customCurrencies && customCurrencies.length > 0) {
    const isUsd = isUSD(id, customCurrencies);
    const other = customCurrencies.find(c => isUsd ? c.code === "IQD" : c.code === "USD");
    if (other) return other.id;
  }

  // Primary Database IDs: USD is 1, IQD is 2
  if (id === 1) return 2;
  if (id === 2) return 1;
  // Mock IDs fallback
  if (id === 5) return 6;
  if (id === 6) return 5;
  // Legacy / custom IDs fallback
  if (id === 11) return 12;
  if (id === 12) return 11;
  return id;
}

export function convertCurrency(
  amount: number,
  fromId: number,
  toId: number,
  rate: number,
  customCurrencies?: { id: number; code: string }[]
): number {
  if (fromId === toId) return amount;
  let effectiveRate = rate;
  if (effectiveRate <= 50) {
    // Safety guard: if rate is 1 or missing, NEVER divide/multiply by 1 between USD and IQD!
    const iqdCur = (customCurrencies || []).find(c => isIQD(c.id, customCurrencies));
    effectiveRate = (iqdCur && (iqdCur as any).rate > 50) ? (iqdCur as any).rate : 1500;
  }
  if (isIQD(fromId, customCurrencies) && isUSD(toId, customCurrencies)) return amount / effectiveRate; // IQD to USD
  if (isUSD(fromId, customCurrencies) && isIQD(toId, customCurrencies)) return amount * effectiveRate; // USD to IQD
  return amount;
}

export interface CalculateLedgerEntriesParams {
  type: string;
  netAmount: number;
  currencyId: number; // main voucher currency
  exchangeRate: number;
  paidAmounts: { currencyId: number; amount: number; exchangeRate?: number }[];
  extraPaymentHandling: "convert_to_other_currency" | "keep_as_same_currency_balance" | null;
  balanceBeforeByCurrency: Record<string, number>;
  currencies?: { id: number; code: string; symbol: string; name: string }[];
  itemsTotalsByCurrency?: Record<string, number>;
  isCashSettled?: boolean;
}

export function calculateLedgerEntries({
  type,
  netAmount,
  currencyId,
  exchangeRate,
  paidAmounts,
  extraPaymentHandling,
  balanceBeforeByCurrency,
  currencies,
  itemsTotalsByCurrency,
  isCashSettled,
}: CalculateLedgerEntriesParams) {
  // Normalize types
  const incomingTypes = ["sales", "money_in", "purchase_return", "people_debt_discount", "debt_discount", "داشکاندنم کردوە"];
  const outgoingTypes = ["purchase", "money_out", "sales_return", "my_debt_discount", "داشکاندنم بۆ کراوە"];
  const openingDebtTypes = ["people_debt", "my_debt", "قەرزم لای خەڵکە", "من قەرزارم"];

  const isIncoming = incomingTypes.includes(type);
  const isOutgoing = outgoingTypes.includes(type);
  const isOpening = openingDebtTypes.includes(type);

  const tempBalance = { ...balanceBeforeByCurrency };
  
  const ledgerEntries: LedgerEntryPayload[] = [];

  if (type === "shareholder_deposit") {
    const payments = paidAmounts.map(p => ({
      currencyId: p.currencyId,
      amount: p.amount,
      exchangeRate: p.exchangeRate || exchangeRate || 1
    })).filter(p => p.amount > 0);

    for (const payment of payments) {
      ledgerEntries.push({
        currencyId: payment.currencyId,
        debit: 0,
        credit: payment.amount,
        exchangeRate: payment.exchangeRate
      });
      tempBalance[String(payment.currencyId)] = (tempBalance[String(payment.currencyId)] || 0) - payment.amount;
    }

    return {
      ledgerEntries,
      balanceAfterByCurrency: tempBalance,
      excess: { exists: false, amount: 0, targetCurrencyId: currencyId, otherCurrencyId: getOtherCurrencyId(currencyId, currencies) }
    };
  }

  if (type === "shareholder_withdrawal") {
    const payments = paidAmounts.map(p => ({
      currencyId: p.currencyId,
      amount: p.amount,
      exchangeRate: p.exchangeRate || exchangeRate || 1
    })).filter(p => p.amount > 0);

    for (const payment of payments) {
      ledgerEntries.push({
        currencyId: payment.currencyId,
        debit: payment.amount,
        credit: 0,
        exchangeRate: payment.exchangeRate
      });
      tempBalance[String(payment.currencyId)] = (tempBalance[String(payment.currencyId)] || 0) + payment.amount;
    }

    return {
      ledgerEntries,
      balanceAfterByCurrency: tempBalance,
      excess: { exists: false, amount: 0, targetCurrencyId: currencyId, otherCurrencyId: getOtherCurrencyId(currencyId, currencies) }
    };
  }

  // 1. Transaction (invoice) balance impact (before payment)
  const hasItemsTotals = itemsTotalsByCurrency && Object.keys(itemsTotalsByCurrency).length > 0;

  if (type === "sales" || type === "purchase_return" || type === "people_debt" || type === "قەرزم لای خەڵکە" || type === "my_debt_discount" || type === "داشکاندنم بۆ کراوە") {
    // Debit effect: increases what they owe us
    if (hasItemsTotals && (type === "sales" || type === "purchase_return")) {
      for (const [cIdStr, cAmt] of Object.entries(itemsTotalsByCurrency!)) {
        const cId = Number(cIdStr);
        if (cAmt > 0.0001) {
          tempBalance[String(cId)] = (tempBalance[String(cId)] || 0) + cAmt;
          ledgerEntries.push({
            currencyId: cId,
            debit: cAmt,
            credit: 0,
            exchangeRate: isUSD(cId, currencies) ? 1 : exchangeRate,
          });
        }
      }
    } else {
      tempBalance[String(currencyId)] = (tempBalance[String(currencyId)] || 0) + netAmount;
      if (!isOpening && (type === "sales" || type === "purchase_return")) {
        ledgerEntries.push({ currencyId, debit: netAmount, credit: 0, exchangeRate });
      }
    }
  } else if (type === "purchase" || type === "sales_return" || type === "my_debt" || type === "من قەرزارم" || type === "people_debt_discount" || type === "daشکاندن لە قەرزم لای خەڵکە" || type === "debt_discount") {
    // Credit effect: increases what we owe them
    if (hasItemsTotals && (type === "purchase" || type === "sales_return")) {
      for (const [cIdStr, cAmt] of Object.entries(itemsTotalsByCurrency!)) {
        const cId = Number(cIdStr);
        if (cAmt > 0.0001) {
          tempBalance[String(cId)] = (tempBalance[String(cId)] || 0) - cAmt;
          ledgerEntries.push({
            currencyId: cId,
            debit: 0,
            credit: cAmt,
            exchangeRate: isUSD(cId, currencies) ? 1 : exchangeRate,
          });
        }
      }
    } else {
      tempBalance[String(currencyId)] = (tempBalance[String(currencyId)] || 0) - netAmount;
      if (!isOpening && (type === "purchase" || type === "sales_return")) {
        ledgerEntries.push({ currencyId, debit: 0, credit: netAmount, exchangeRate });
      }
    }
  }

  // If opening debt, we just record the invoice effect and return
  if (isOpening) {
    if (type === "people_debt" || type === "قەرزم لای خەڵکە") {
      ledgerEntries.push({ currencyId, debit: netAmount, credit: 0, exchangeRate });
    } else {
      ledgerEntries.push({ currencyId, debit: 0, credit: netAmount, exchangeRate });
    }
    return {
      ledgerEntries,
      balanceAfterByCurrency: tempBalance,
      excess: { exists: false, amount: 0, targetCurrencyId: currencyId, otherCurrencyId: getOtherCurrencyId(currencyId, currencies) }
    };
  }

  // 2. Prepare payments/discounts to be applied
  let payments = paidAmounts.map(p => ({
    currencyId: p.currencyId,
    amount: p.amount,
    exchangeRate: p.exchangeRate || exchangeRate || 1
  })).filter(p => p.amount > 0);

  // If it's a discount, treat it as a payment of netAmount in currencyId
  if (type === "people_debt_discount" || type === "daشکاندن لە قەرزم لای خەڵکە" || type === "debt_discount" || type === "my_debt_discount" || type === "داشکاندنم بۆ کراوە") {
    payments = [{ currencyId, amount: netAmount, exchangeRate }];
  }

  let excessExists = false;
  let excessAmount = 0;
  let excessTargetCurrencyId = currencyId;
  let excessOtherCurrencyId = getOtherCurrencyId(currencyId, currencies);

  for (const payment of payments) {
    const pCurId = payment.currencyId;
    const pAmount = payment.amount;
    const pRate = payment.exchangeRate;
    const otherCurId = getOtherCurrencyId(pCurId, currencies);

    if (isIncoming) {
      // Incoming reduces positive balance (credit)
      const currentDebt = tempBalance[String(pCurId)] || 0;
      
      if (currentDebt > 0.01) {
        if (pAmount <= currentDebt) {
          ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: pAmount, exchangeRate: pRate });
          tempBalance[String(pCurId)] -= pAmount;
        } else {
          const applied = currentDebt;
          ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: applied, exchangeRate: pRate });
          tempBalance[String(pCurId)] = 0;
          
          const rem = pAmount - applied;
          const otherBal = tempBalance[String(otherCurId)] || 0;
          
          if (otherBal < -0.01) {
            // Opposite balance exists
            if (extraPaymentHandling === "convert_to_other_currency") {
              const remInOther = convertCurrency(rem, pCurId, otherCurId, pRate, currencies);
              ledgerEntries.push({ currencyId: otherCurId, debit: 0, credit: remInOther, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
              tempBalance[String(otherCurId)] -= remInOther;
            } else if (extraPaymentHandling === "keep_as_same_currency_balance") {
              ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: rem, exchangeRate: pRate });
              tempBalance[String(pCurId)] -= rem;
            } else {
              excessExists = true;
              excessAmount = rem;
              excessTargetCurrencyId = pCurId;
              excessOtherCurrencyId = otherCurId;
              // Default preview: keep in paid currency
              ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: rem, exchangeRate: pRate });
              tempBalance[String(pCurId)] -= rem;
            }
          } else {
            // No opposite balance
            ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: rem, exchangeRate: pRate });
            tempBalance[String(pCurId)] -= rem;
          }
        }
      } else {
        // No debt in paid currency, check other currency debt
        const otherBal = tempBalance[String(otherCurId)] || 0;
        if (otherBal > 0.01) {
          const pAmountInOther = convertCurrency(pAmount, pCurId, otherCurId, pRate, currencies);
          if (pAmountInOther <= otherBal) {
            ledgerEntries.push({ currencyId: otherCurId, debit: 0, credit: pAmountInOther, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
            tempBalance[String(otherCurId)] -= pAmountInOther;
          } else {
            const appliedInOther = otherBal;
            ledgerEntries.push({ currencyId: otherCurId, debit: 0, credit: appliedInOther, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
            tempBalance[String(otherCurId)] = 0;
            
            const remInOther = pAmountInOther - appliedInOther;
            if (extraPaymentHandling === "convert_to_other_currency") {
              ledgerEntries.push({ currencyId: otherCurId, debit: 0, credit: remInOther, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
              tempBalance[String(otherCurId)] -= remInOther;
            } else if (extraPaymentHandling === "keep_as_same_currency_balance") {
              const rem = convertCurrency(remInOther, otherCurId, pCurId, pRate, currencies);
              ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: rem, exchangeRate: pRate });
              tempBalance[String(pCurId)] -= rem;
            } else {
              // Default preview: convert to other currency
              ledgerEntries.push({ currencyId: otherCurId, debit: 0, credit: remInOther, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
              tempBalance[String(otherCurId)] -= remInOther;
            }
          }
        } else {
          // No debt in either currency
          ledgerEntries.push({ currencyId: pCurId, debit: 0, credit: pAmount, exchangeRate: pRate });
          tempBalance[String(pCurId)] -= pAmount;
        }
      }
    } else {
      // Outgoing reduces negative balance (debit)
      const currentDebt = tempBalance[String(pCurId)] || 0;
      
      if (currentDebt < -0.01) {
        const absDebt = Math.abs(currentDebt);
        if (pAmount <= absDebt) {
          ledgerEntries.push({ currencyId: pCurId, debit: pAmount, credit: 0, exchangeRate: pRate });
          tempBalance[String(pCurId)] += pAmount;
        } else {
          const applied = absDebt;
          ledgerEntries.push({ currencyId: pCurId, debit: applied, credit: 0, exchangeRate: pRate });
          tempBalance[String(pCurId)] = 0;
          
          const rem = pAmount - applied;
          const otherBal = tempBalance[String(otherCurId)] || 0;
          
          if (otherBal > 0.01) {
            // Opposite balance exists
            if (extraPaymentHandling === "convert_to_other_currency") {
              const remInOther = convertCurrency(rem, pCurId, otherCurId, pRate, currencies);
              ledgerEntries.push({ currencyId: otherCurId, debit: remInOther, credit: 0, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
              tempBalance[String(otherCurId)] += remInOther;
            } else if (extraPaymentHandling === "keep_as_same_currency_balance") {
              ledgerEntries.push({ currencyId: pCurId, debit: rem, credit: 0, exchangeRate: pRate });
              tempBalance[String(pCurId)] += rem;
            } else {
              excessExists = true;
              excessAmount = rem;
              excessTargetCurrencyId = pCurId;
              excessOtherCurrencyId = otherCurId;
              // Default preview: keep in paid currency
              ledgerEntries.push({ currencyId: pCurId, debit: rem, credit: 0, exchangeRate: pRate });
              tempBalance[String(pCurId)] += rem;
            }
          } else {
            ledgerEntries.push({ currencyId: pCurId, debit: rem, credit: 0, exchangeRate: pRate });
            tempBalance[String(pCurId)] += rem;
          }
        }
      } else {
        // No debt in paid currency, check other currency debt
        const otherBal = tempBalance[String(otherCurId)] || 0;
        if (otherBal < -0.01) {
          const absOtherDebt = Math.abs(otherBal);
          const pAmountInOther = convertCurrency(pAmount, pCurId, otherCurId, pRate, currencies);
          if (pAmountInOther <= absOtherDebt) {
            ledgerEntries.push({ currencyId: otherCurId, debit: pAmountInOther, credit: 0, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
            tempBalance[String(otherCurId)] += pAmountInOther;
          } else {
            const appliedInOther = absOtherDebt;
            ledgerEntries.push({ currencyId: otherCurId, debit: appliedInOther, credit: 0, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
            tempBalance[String(otherCurId)] = 0;
            
            const remInOther = pAmountInOther - appliedInOther;
            if (extraPaymentHandling === "convert_to_other_currency") {
              ledgerEntries.push({ currencyId: otherCurId, debit: remInOther, credit: 0, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
              tempBalance[String(otherCurId)] += remInOther;
            } else if (extraPaymentHandling === "keep_as_same_currency_balance") {
              const rem = convertCurrency(remInOther, otherCurId, pCurId, pRate, currencies);
              ledgerEntries.push({ currencyId: pCurId, debit: rem, credit: 0, exchangeRate: pRate });
              tempBalance[String(pCurId)] += rem;
            } else {
              ledgerEntries.push({ currencyId: otherCurId, debit: remInOther, credit: 0, exchangeRate: isUSD(otherCurId, currencies) ? 1 : pRate });
              tempBalance[String(otherCurId)] += remInOther;
            }
          }
        } else {
          ledgerEntries.push({ currencyId: pCurId, debit: pAmount, credit: 0, exchangeRate: pRate });
          tempBalance[String(pCurId)] += pAmount;
        }
      }
    }
  }

  if (isCashSettled) {
    // When an invoice is fully settled in cash (within small tolerance < 5000 IQD and < $5),
    // ensure that customer balance is not left with residual micro-debt or micro-credit.
    for (const k of Object.keys(tempBalance)) {
      tempBalance[k] = balanceBeforeByCurrency[k] || 0;
    }
    // Remove any entries in currencies not present in items or payments
    const relevantCurIds = new Set([
      currencyId,
      ...paidAmounts.map(p => p.currencyId),
      ...(itemsTotalsByCurrency ? Object.keys(itemsTotalsByCurrency).map(Number) : [])
    ]);
    for (let i = ledgerEntries.length - 1; i >= 0; i--) {
      if (!relevantCurIds.has(ledgerEntries[i].currencyId)) {
        ledgerEntries.splice(i, 1);
      }
    }
    // Make sure debit and credit match on customer entries so no balance shift occurs
    const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
    const delta = totalDebit - totalCredit;
    if (Math.abs(delta) > 0.001) {
      ledgerEntries.push({
        currencyId,
        debit: delta < 0 ? Math.abs(delta) : 0,
        credit: delta > 0 ? delta : 0,
        exchangeRate: isUSD(currencyId, currencies) ? 1 : exchangeRate,
      });
    }
  }

  // Group ledger entries by currency to keep them clean
  const grouped: Record<number, LedgerEntryPayload> = {};
  for (const entry of ledgerEntries) {
    const key = entry.currencyId;
    if (!grouped[key]) {
      grouped[key] = { currencyId: key, debit: 0, credit: 0, exchangeRate: entry.exchangeRate };
    }
    grouped[key].debit += entry.debit;
    grouped[key].credit += entry.credit;
  }
  const cleanLedgerEntries = Object.values(grouped).filter(e => e.debit > 0 || e.credit > 0);

  return {
    ledgerEntries: cleanLedgerEntries,
    balanceAfterByCurrency: tempBalance,
    excess: {
      exists: excessExists,
      amount: excessAmount,
      targetCurrencyId: excessTargetCurrencyId,
      otherCurrencyId: excessOtherCurrencyId
    }
  };
}

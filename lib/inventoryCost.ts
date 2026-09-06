/**
 * Standard Inventory Cost & Currency Valuation
 * 
 * Rules:
 * 1. Whenever an item's prior stock was entered at a fixed leaf dollar rate (e.g. Voucher 31 @ $57 with fixed rate 135,000):
 *    - Convert prior cost into Dinars (IQD): cost * (fixedRate / 100).
 *    - Convert to the incoming voucher's currency & rate basis (e.g. daily market $: costIQD / voucherMarketRate).
 *    - Calculate perpetual weighted average with the new incoming batch.
 * 2. Whichever incoming voucher was newly entered, set the item's warehouse cost currency to that voucher's currency!
 *    - If new batch is in USD, cost is in USD.
 *    - If new batch is in IQD, cost is in IQD.
 * 3. Sales decrement quantity without changing the running unit cost.
 */

export interface InventoryTxItem {
  id: number;
  qtyChange: number;
  unitCost: number;
  currencyId?: number | null;
  date: Date | string;
  voucher?: {
    type?: string | null;
    exchangeRate?: number | null;
    exchangeRateType?: string | null;
    customExchangeRate?: number | null;
    account?: {
      id?: number;
      name?: string | null;
      exchangeRateType?: string | null;
      customExchangeRate?: number | null;
    } | null;
    versions?: Array<{
      version?: number;
      data?: string;
    }> | null;
  } | null;
}

export interface ProductCostResult {
  costPrice: number;
  costCurrencyId: number;
  exchangeRateType: string;
  customExchangeRate: number | null;
  stockOnHand: number;
}

export function parseTransactionVoucherMetadata(t: InventoryTxItem, defaultMarketRate: number = 1550) {
  let versionData: any = {};
  if (t.voucher?.versions && t.voucher.versions.length > 0) {
    const sortedV = [...t.voucher.versions].sort((a, b) => (a.version || 0) - (b.version || 0));
    try {
      versionData = JSON.parse(sortedV[sortedV.length - 1].data || "{}");
    } catch (e) {}
  }

  const acc = t.voucher?.account;
  const vRateType = t.voucher?.exchangeRateType || versionData.exchangeRateType || acc?.exchangeRateType;
  const vCustomRateRaw = t.voucher?.customExchangeRate || versionData.customExchangeRate || acc?.customExchangeRate;
  const vCustomRate = vCustomRateRaw
    ? (Number(vCustomRateRaw) > 10000 ? Number(vCustomRateRaw) : Number(vCustomRateRaw) * 100)
    : null;

  let incomingRateType = "DAILY_MARKET";
  let incomingCustomRate: number | null = null;

  if (t.voucher?.type === "warehouse_stock") {
    if (vRateType === "FIXED" || (vCustomRate && (vCustomRate === 135000 || vCustomRate < 145000))) {
      incomingRateType = "FIXED";
      incomingCustomRate = vCustomRate || 135000;
    }
  } else if (t.voucher?.type === "purchase" || t.voucher?.type === "purchase_return") {
    if (vRateType === "FIXED" && vCustomRate) {
      incomingRateType = "FIXED";
      incomingCustomRate = vCustomRate;
    }
  }

  // Determine active market exchange rate
  const rawRate = Number(t.voucher?.exchangeRate || defaultMarketRate);
  const voucherMarketRate = rawRate > 10000 ? rawRate / 100 : (rawRate > 100 ? rawRate : defaultMarketRate);

  const incomingCurId = t.currencyId || (t.unitCost > 1000 ? 2 : 1);

  return {
    incomingRateType,
    incomingCustomRate,
    voucherMarketRate,
    incomingCurId,
  };
}

export function calculateWeightedProductCost(
  transactions: InventoryTxItem[],
  isMultiBatch: boolean = false,
  defaultMarketRate: number = 1550
): ProductCostResult {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id
  );

  let runningOnHand = 0;
  let runningCost = 0;
  let currentCurrencyId = 1;
  let currentRateType = "DAILY_MARKET";
  let currentCustomRate: number | null = null;

  sorted.forEach((t) => {
    const { incomingRateType, incomingCustomRate, voucherMarketRate, incomingCurId } =
      parseTransactionVoucherMetadata(t, defaultMarketRate);

    if (t.qtyChange > 0 && t.unitCost > 0) {
      if (isMultiBatch || runningOnHand <= 0) {
        runningCost = t.unitCost;
        runningOnHand = t.qtyChange;
        currentCurrencyId = incomingCurId;
        currentRateType = incomingRateType;
        currentCustomRate = incomingCustomRate;
      } else {
        // Step 1: Convert existing stock runningCost to IQD
        let priorCostInIqd = runningCost;
        if (currentCurrencyId === 1) { // USD
          if (currentRateType === "FIXED" && currentCustomRate) {
            const fixedRatePerDollar = currentCustomRate / 100;
            priorCostInIqd = runningCost * fixedRatePerDollar;
          } else {
            priorCostInIqd = runningCost * voucherMarketRate;
          }
        }

        // Step 2: Convert existing stock IQD cost into incoming batch's currency
        let priorCostInTargetCurrency = priorCostInIqd;
        if (incomingCurId === 1) { // Target is USD
          if (incomingRateType === "FIXED" && incomingCustomRate) {
            const fixedRatePerDollar = incomingCustomRate / 100;
            priorCostInTargetCurrency = priorCostInIqd / fixedRatePerDollar;
          } else {
            priorCostInTargetCurrency = priorCostInIqd / voucherMarketRate;
          }
        }

        // Step 3: Perpetual weighted average in target currency
        const totalVal = (runningOnHand * priorCostInTargetCurrency) + (t.qtyChange * t.unitCost);
        runningOnHand += t.qtyChange;
        runningCost = totalVal / runningOnHand;

        // Step 4: Cost currency and rate type become those of the newer incoming voucher
        currentCurrencyId = incomingCurId;
        currentRateType = incomingRateType;
        currentCustomRate = incomingCustomRate;
      }
    } else if (t.qtyChange < 0) {
      runningOnHand += t.qtyChange;
    }
  });

  return {
    costPrice: runningCost,
    costCurrencyId: currentCurrencyId,
    exchangeRateType: currentRateType,
    customExchangeRate: currentCustomRate,
    stockOnHand: runningOnHand,
  };
}

/**
 * Returns a map of transaction ID -> running cost and currency at the moment that transaction occurred.
 * Crucial for historical sales profit calculations and material movement logs.
 */
export function calculateHistoricalTransactionCosts(
  transactions: InventoryTxItem[],
  isMultiBatch: boolean = false,
  defaultMarketRate: number = 1550
): Map<number, { cost: number; costCurrencyId: number; exchangeRateType: string; customExchangeRate: number | null }> {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id
  );

  const costMap = new Map<number, { cost: number; costCurrencyId: number; exchangeRateType: string; customExchangeRate: number | null }>();

  let runningOnHand = 0;
  let runningCost = 0;
  let currentCurrencyId = 1;
  let currentRateType = "DAILY_MARKET";
  let currentCustomRate: number | null = null;

  sorted.forEach((t) => {
    const { incomingRateType, incomingCustomRate, voucherMarketRate, incomingCurId } =
      parseTransactionVoucherMetadata(t, defaultMarketRate);

    if (t.qtyChange > 0 && t.unitCost > 0) {
      if (isMultiBatch || runningOnHand <= 0) {
        runningCost = t.unitCost;
        runningOnHand = t.qtyChange;
        currentCurrencyId = incomingCurId;
        currentRateType = incomingRateType;
        currentCustomRate = incomingCustomRate;
      } else {
        let priorCostInIqd = runningCost;
        if (currentCurrencyId === 1) {
          if (currentRateType === "FIXED" && currentCustomRate) {
            const fixedRatePerDollar = currentCustomRate / 100;
            priorCostInIqd = runningCost * fixedRatePerDollar;
          } else {
            priorCostInIqd = runningCost * voucherMarketRate;
          }
        }

        let priorCostInTargetCurrency = priorCostInIqd;
        if (incomingCurId === 1) {
          if (incomingRateType === "FIXED" && incomingCustomRate) {
            const fixedRatePerDollar = incomingCustomRate / 100;
            priorCostInTargetCurrency = priorCostInIqd / fixedRatePerDollar;
          } else {
            priorCostInTargetCurrency = priorCostInIqd / voucherMarketRate;
          }
        }

        const totalVal = (runningOnHand * priorCostInTargetCurrency) + (t.qtyChange * t.unitCost);
        runningOnHand += t.qtyChange;
        runningCost = totalVal / runningOnHand;

        currentCurrencyId = incomingCurId;
        currentRateType = incomingRateType;
        currentCustomRate = incomingCustomRate;
      }

      costMap.set(t.id, {
        cost: runningCost,
        costCurrencyId: currentCurrencyId,
        exchangeRateType: currentRateType,
        customExchangeRate: currentCustomRate,
      });
    } else if (t.qtyChange < 0) {
      // For sales / deductions, record the current running cost at that moment
      costMap.set(t.id, {
        cost: runningCost,
        costCurrencyId: currentCurrencyId,
        exchangeRateType: currentRateType,
        customExchangeRate: currentCustomRate,
      });
      runningOnHand += t.qtyChange;
    }
  });

  return costMap;
}

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
  unitPrice?: number;
  unitExpense?: number;
  productId?: number;
  product?: {
    id?: number;
    name?: string;
    isMultiBatch?: boolean;
  } | null;
  voucher?: {
    type?: string | null;
    currencyId?: number | null;
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
    expenses?: Array<{
      amount: number;
      currencyId: number;
    }> | null;
    lines?: Array<{
      productId: number;
      unitPrice: number;
      unitCost?: number | null;
      qty: number;
      currencyId?: number | null;
    }> | null;
  } | null;
}

export interface ProductCostResult {
  costPrice: number;
  purchasePrice: number;
  expensePerUnit: number;
  costCurrencyId: number;
  exchangeRateType: string;
  customExchangeRate: number | null;
  stockOnHand: number;
  rawPurchasePrice?: number;
  purchaseExchangeRate?: number | null;
  originCurrency?: string;
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
    if (vRateType === "FIXED" && vCustomRate) {
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

  let incomingCurId = t.currencyId || (t.voucher as any)?.currencyId || 1;

  // Invariant reconciliation: For incoming stock vouchers (purchase/warehouse_stock),
  // if voucher currencyId is defined, reconcile against tx.currencyId to prevent 1560x valuation collapse.
  const vType = t.voucher?.type;
  const vCurId = (t.voucher as any)?.currencyId;
  if (vCurId && (vType === "purchase" || vType === "warehouse_stock" || vType === "جەردی کۆگا")) {
    if (vCurId === 1 && incomingCurId === 2 && Number(t.unitCost || 0) < 500) {
      incomingCurId = 1;
    } else if (vCurId === 2 && incomingCurId === 1 && Number(t.unitCost || 0) > 1000) {
      incomingCurId = 2;
    }
  }

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
  let runningPurchasePrice = 0;
  let runningExpense = 0;
  let runningRawPurchasePrice = 0;
  let hasOriginIQD = false;
  let currentCurrencyId = 1;
  let currentRateType = "DAILY_MARKET";
  let currentCustomRate: number | null = null;

  sorted.forEach((t) => {
    const { incomingRateType, incomingCustomRate, voucherMarketRate, incomingCurId } =
      parseTransactionVoucherMetadata(t, defaultMarketRate);

    if (t.qtyChange > 0) {
      // 1. Determine incoming unit purchase price
      const txProductId = t.productId || t.product?.id;
      const matchingLine = t.voucher?.lines?.find((l: any) => txProductId && l.productId === txProductId);
      
      const lineCur = matchingLine?.currencyId || t.voucher?.currencyId;
      const isLineIQD = Boolean(matchingLine && (lineCur === 2 || lineCur === 12 || (lineCur !== 1 && matchingLine.unitPrice > 15000)));
      if (isLineIQD || incomingCurId === 2 || (incomingCurId !== 1 && t.unitCost && t.unitCost > 15000)) {
        hasOriginIQD = true;
      }

      let incomingPurchasePrice = 0;
      let incomingRawPrice = 0;

      if (matchingLine && matchingLine.unitPrice !== undefined && matchingLine.unitPrice !== null && !isNaN(Number(matchingLine.unitPrice)) && Number(matchingLine.unitPrice) > 0) {
        const lineP = Number(matchingLine.unitPrice);
        if (isLineIQD) {
          incomingRawPrice = lineP;
          incomingPurchasePrice = lineP / voucherMarketRate;
        } else {
          incomingPurchasePrice = lineP;
          incomingRawPrice = lineP;
        }
      } else if (t.unitPrice !== undefined && t.unitPrice !== null && !isNaN(Number(t.unitPrice)) && Number(t.unitPrice) > 0) {
        incomingPurchasePrice = Number(t.unitPrice);
        incomingRawPrice = isLineIQD ? incomingPurchasePrice : (incomingPurchasePrice * voucherMarketRate);
      } else if (t.unitCost !== undefined && t.unitCost !== null && !isNaN(Number(t.unitCost)) && Number(t.unitCost) > 0) {
        if (isLineIQD) {
          incomingRawPrice = Number(t.unitCost) > 15000 ? Number(t.unitCost) : Number(t.unitCost) * voucherMarketRate;
          incomingPurchasePrice = Number(t.unitCost) > 15000 ? Number(t.unitCost) / voucherMarketRate : Number(t.unitCost);
        } else {
          incomingPurchasePrice = Number(t.unitCost);
          incomingRawPrice = incomingPurchasePrice;
        }
      } else {
        incomingPurchasePrice = Number(t.unitCost || 0);
        incomingRawPrice = incomingPurchasePrice;
      }

      // 2. Determine incoming unit expense
      let incomingUnitExpense = 0;
      if (t.unitExpense !== undefined && t.unitExpense >= 0) {
        incomingUnitExpense = t.unitExpense;
      } else if (matchingLine && Number(matchingLine.unitCost || 0) > Number(matchingLine.unitPrice || 0)) {
        incomingUnitExpense = Number(matchingLine.unitCost) - Number(matchingLine.unitPrice);
      } else if (Number(t.unitCost || 0) > incomingPurchasePrice && incomingPurchasePrice > 0) {
        incomingUnitExpense = Number(t.unitCost) - incomingPurchasePrice;
      } else if (t.voucher?.expenses && t.voucher.expenses.length > 0) {
        const totalLinesQty = t.voucher.lines?.reduce((sum: number, l: any) => sum + Math.max(0, Number(l.qty || 0)), 0) || t.qtyChange;
        let totalExpInBatchCur = 0;
        const isBatchIQD = incomingCurId === 2;
        for (const exp of t.voucher.expenses) {
          const isExpIQD = exp.currencyId === 2 || Number(exp.currencyId) === 2 || Number(exp.currencyId) === 12;
          const amt = Number(exp.amount || 0);
          if (isBatchIQD) {
            totalExpInBatchCur += isExpIQD ? amt : (amt * voucherMarketRate);
          } else {
            totalExpInBatchCur += isExpIQD ? (amt / voucherMarketRate) : amt;
          }
        }
        incomingUnitExpense = totalLinesQty > 0 ? (totalExpInBatchCur / totalLinesQty) : 0;
      }

      const incomingTotalCost = incomingPurchasePrice + incomingUnitExpense;

      if (isMultiBatch || runningOnHand <= 0) {
        runningPurchasePrice = incomingPurchasePrice;
        runningRawPurchasePrice = incomingRawPrice;
        runningExpense = incomingUnitExpense;
        runningCost = incomingTotalCost;
        runningOnHand = t.qtyChange;
        currentCurrencyId = incomingCurId;
        currentRateType = incomingRateType;
        currentCustomRate = incomingCustomRate;
      } else {
        const isBothFixedUsd =
          currentRateType === "FIXED" &&
          incomingRateType === "FIXED" &&
          currentCurrencyId === 1 &&
          incomingCurId === 1 &&
          Boolean(currentCustomRate) &&
          Boolean(incomingCustomRate);

        if (isBothFixedUsd) {
          const newOnHand = runningOnHand + t.qtyChange;
          const newPurchasePrice = newOnHand > 0
            ? (((runningOnHand * runningPurchasePrice) + (t.qtyChange * incomingPurchasePrice)) / newOnHand)
            : 0;
          const newRawPrice = newOnHand > 0
            ? (((runningOnHand * runningRawPurchasePrice) + (t.qtyChange * incomingRawPrice)) / newOnHand)
            : 0;
          const newExpense = newOnHand > 0
            ? (((runningOnHand * runningExpense) + (t.qtyChange * incomingUnitExpense)) / newOnHand)
            : 0;
          const newCost = newPurchasePrice + newExpense;

          const totalIqdSpent =
            (runningOnHand * runningPurchasePrice * ((currentCustomRate || 135000) / 100)) +
            (t.qtyChange * incomingPurchasePrice * ((incomingCustomRate || 135000) / 100));
          const totalUsdSpent =
            (runningOnHand * runningPurchasePrice) +
            (t.qtyChange * incomingPurchasePrice);
          const blendedRatePer100 = totalUsdSpent > 0
            ? Math.round((totalIqdSpent / totalUsdSpent) * 100)
            : (incomingCustomRate || 135000);

          runningOnHand = newOnHand;
          runningPurchasePrice = newPurchasePrice;
          runningRawPurchasePrice = newRawPrice;
          runningExpense = newExpense;
          runningCost = newCost;
          currentCurrencyId = 1;
          currentRateType = "FIXED";
          currentCustomRate = blendedRatePer100;
        } else {
          let priorPriceInTargetCurrency = runningPurchasePrice;
          let priorExpenseInTargetCurrency = runningExpense;
          let priorCostInTargetCurrency = runningCost;

          // Perform rate/currency adjustment if:
          // 1. Currencies differ (e.g. USD vs IQD), OR
          // 2. Exchange rate types differ (e.g. FIXED leaf dollar 135,000 vs. DAILY_MARKET dollar)
          const needsRateAdjustment =
            currentCurrencyId !== incomingCurId ||
            currentRateType !== incomingRateType ||
            (currentRateType === "FIXED" && incomingRateType === "FIXED" && currentCustomRate !== incomingCustomRate);

          if (needsRateAdjustment) {
            // Step 1: Convert existing stock purchase price and expense to IQD
            let priorPriceInIqd = runningPurchasePrice;
            let priorExpenseInIqd = runningExpense;
            let priorCostInIqd = runningCost;

            if (currentCurrencyId === 1) { // USD -> IQD
              const multiplier = (currentRateType === "FIXED" && currentCustomRate)
                ? (currentCustomRate / 100)
                : voucherMarketRate;
              priorPriceInIqd = runningPurchasePrice * multiplier;
              priorExpenseInIqd = runningExpense * multiplier;
              priorCostInIqd = runningCost * multiplier;
            }

            // Step 2: Convert existing stock into incoming batch's currency
            if (incomingCurId === 1) { // IQD -> USD
              const divisor = (incomingRateType === "FIXED" && incomingCustomRate)
                ? (incomingCustomRate / 100)
                : voucherMarketRate;
              priorPriceInTargetCurrency = divisor > 0 ? (priorPriceInIqd / divisor) : priorPriceInIqd;
              priorExpenseInTargetCurrency = divisor > 0 ? (priorExpenseInIqd / divisor) : priorExpenseInIqd;
              priorCostInTargetCurrency = divisor > 0 ? (priorCostInIqd / divisor) : priorCostInIqd;
            } else {
              priorPriceInTargetCurrency = priorPriceInIqd;
              priorExpenseInTargetCurrency = priorExpenseInIqd;
              priorCostInTargetCurrency = priorCostInIqd;
            }
          }

          // Step 3: Perpetual weighted average in target currency for both purchase price and expense
          const newOnHand = runningOnHand + t.qtyChange;
          const newPurchasePrice = newOnHand > 0 ? (((runningOnHand * priorPriceInTargetCurrency) + (t.qtyChange * incomingPurchasePrice)) / newOnHand) : 0;
          const newRawPrice = newOnHand > 0 ? (((runningOnHand * runningRawPurchasePrice) + (t.qtyChange * incomingRawPrice)) / newOnHand) : 0;
          const newExpense = newOnHand > 0 ? (((runningOnHand * priorExpenseInTargetCurrency) + (t.qtyChange * incomingUnitExpense)) / newOnHand) : 0;
          const newCost = newPurchasePrice + newExpense;

          runningOnHand = newOnHand;
          runningPurchasePrice = newPurchasePrice;
          runningRawPurchasePrice = newRawPrice;
          runningExpense = newExpense;
          runningCost = newCost;

          // Step 4: Cost currency and rate type become those of the newer incoming voucher
          currentCurrencyId = incomingCurId;
          currentRateType = incomingRateType;
          currentCustomRate = incomingCustomRate;
        }
      }
    } else if (t.qtyChange < 0) {
      runningOnHand += t.qtyChange;
    }
  });

  const effectiveExchangeRate = (hasOriginIQD && runningPurchasePrice > 0 && runningRawPurchasePrice > 0)
    ? Math.round((runningRawPurchasePrice / runningPurchasePrice) * 100)
    : null;

  return {
    costPrice: runningCost,
    purchasePrice: runningPurchasePrice,
    rawPurchasePrice: hasOriginIQD ? runningRawPurchasePrice : undefined,
    purchaseExchangeRate: effectiveExchangeRate,
    originCurrency: hasOriginIQD ? "IQD" : "USD",
    expensePerUnit: runningExpense,
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

    if (t.qtyChange > 0) {
      // 1. Determine incoming unit purchase price
      const txProductId = t.productId || t.product?.id;
      const matchingLine = t.voucher?.lines?.find((l: any) => txProductId && l.productId === txProductId);
      
      let incomingPurchasePrice = 0;
      const lineCur = matchingLine?.currencyId || t.voucher?.currencyId;
      const isLineIQD = Boolean(matchingLine && (lineCur === 2 || lineCur === 12 || (lineCur !== 1 && matchingLine.unitPrice > 15000)));
      if (matchingLine && matchingLine.unitPrice !== undefined && matchingLine.unitPrice !== null && !isNaN(Number(matchingLine.unitPrice)) && Number(matchingLine.unitPrice) > 0) {
        const lineP = Number(matchingLine.unitPrice);
        incomingPurchasePrice = isLineIQD ? (lineP / voucherMarketRate) : lineP;
      } else if (t.unitPrice !== undefined && t.unitPrice !== null && !isNaN(Number(t.unitPrice)) && Number(t.unitPrice) > 0) {
        incomingPurchasePrice = Number(t.unitPrice);
      } else if (t.unitCost !== undefined && t.unitCost !== null && !isNaN(Number(t.unitCost)) && Number(t.unitCost) > 0) {
        if (isLineIQD) {
          incomingPurchasePrice = Number(t.unitCost) > 15000 ? (Number(t.unitCost) / voucherMarketRate) : Number(t.unitCost);
        } else {
          incomingPurchasePrice = Number(t.unitCost);
        }
      } else {
        incomingPurchasePrice = Number(t.unitCost || 0);
      }

      // 2. Determine incoming unit expense
      let incomingUnitExpense = 0;
      if (t.unitExpense !== undefined && t.unitExpense >= 0) {
        incomingUnitExpense = t.unitExpense;
      } else if (matchingLine && Number(matchingLine.unitCost || 0) > Number(matchingLine.unitPrice || 0)) {
        incomingUnitExpense = Number(matchingLine.unitCost) - Number(matchingLine.unitPrice);
      } else if (Number(t.unitCost || 0) > incomingPurchasePrice && incomingPurchasePrice > 0) {
        incomingUnitExpense = Number(t.unitCost) - incomingPurchasePrice;
      } else if (t.voucher?.expenses && t.voucher.expenses.length > 0) {
        const totalLinesQty = t.voucher.lines?.reduce((sum: number, l: any) => sum + Math.max(0, Number(l.qty || 0)), 0) || t.qtyChange;
        let totalExpInBatchCur = 0;
        const isBatchIQD = incomingCurId === 2;
        for (const exp of t.voucher.expenses) {
          const isExpIQD = exp.currencyId === 2 || Number(exp.currencyId) === 2 || Number(exp.currencyId) === 12;
          const amt = Number(exp.amount || 0);
          if (isBatchIQD) {
            totalExpInBatchCur += isExpIQD ? amt : (amt * voucherMarketRate);
          } else {
            totalExpInBatchCur += isExpIQD ? (amt / voucherMarketRate) : amt;
          }
        }
        incomingUnitExpense = totalLinesQty > 0 ? (totalExpInBatchCur / totalLinesQty) : 0;
      }

      const incomingTotalCost = incomingPurchasePrice + incomingUnitExpense;

      if (isMultiBatch || runningOnHand <= 0) {
        runningCost = incomingTotalCost;
        runningOnHand = t.qtyChange;
        currentCurrencyId = incomingCurId;
        currentRateType = incomingRateType;
        currentCustomRate = incomingCustomRate;
      } else {
        let priorCostInTargetCurrency = runningCost;

        const needsRateAdjustment =
          currentCurrencyId !== incomingCurId ||
          currentRateType !== incomingRateType ||
          (currentRateType === "FIXED" && incomingRateType === "FIXED" && currentCustomRate !== incomingCustomRate);

        if (needsRateAdjustment) {
          let priorCostInIqd = runningCost;
          if (currentCurrencyId === 1) {
            const multiplier = (currentRateType === "FIXED" && currentCustomRate)
              ? (currentCustomRate / 100)
              : voucherMarketRate;
            priorCostInIqd = runningCost * multiplier;
          }

          if (incomingCurId === 1) {
            const divisor = (incomingRateType === "FIXED" && incomingCustomRate)
              ? (incomingCustomRate / 100)
              : voucherMarketRate;
            priorCostInTargetCurrency = divisor > 0 ? (priorCostInIqd / divisor) : priorCostInIqd;
          } else {
            priorCostInTargetCurrency = priorCostInIqd;
          }
        }

        const totalVal = (runningOnHand * priorCostInTargetCurrency) + (t.qtyChange * incomingTotalCost);
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

/**
 * Automatically recalculates and syncs inventory transactions cost and currency
 * for affected products whenever a purchase / warehouse voucher is created or updated.
 */
export async function recalculateAndSyncProductCosts(
  productIds: number[],
  txOrPrisma?: any,
  defaultMarketRate: number = 1550
) {
  if (!productIds || productIds.length === 0) return;
  const client = txOrPrisma || (await import("./prisma")).prisma;

  const uniqueProductIds = Array.from(new Set(productIds.filter(id => Boolean(id) && !isNaN(Number(id)))));
  if (uniqueProductIds.length === 0) return;

  for (const productId of uniqueProductIds) {
    const transactions = await client.inventoryTransaction.findMany({
      where: {
        productId,
        voucher: { isDeleted: false },
      },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        qtyChange: true,
        unitCost: true,
        currencyId: true,
        date: true,
        product: {
          select: {
            id: true,
            name: true,
            isMultiBatch: true,
          }
        },
        voucher: {
          select: {
            type: true,
            currencyId: true,
            exchangeRate: true,
            account: {
              select: {
                id: true,
                name: true,
                exchangeRateType: true,
                customExchangeRate: true,
              }
            },
            versions: {
              select: {
                version: true,
                data: true,
              }
            },
            expenses: {
              select: {
                amount: true,
                currencyId: true,
              }
            },
            lines: {
              select: {
                productId: true,
                unitPrice: true,
                qty: true,
                currencyId: true,
              }
            }
          }
        }
      },
      orderBy: { date: "asc" }
    });

    if (transactions.length === 0) continue;

    // 1. Calculate historical transaction costs
    const isMultiBatch = transactions[0]?.product?.isMultiBatch || false;
    const costMap = calculateHistoricalTransactionCosts(transactions as any, isMultiBatch, defaultMarketRate);

    // 2. Update all outgoing transactions with their exact synchronized cost & currency
    for (const t of transactions) {
      if (t.qtyChange < 0) {
        const costInfo = costMap.get(t.id);
        if (costInfo && (t.unitCost !== costInfo.cost || t.currencyId !== costInfo.costCurrencyId)) {
          await client.inventoryTransaction.update({
            where: { id: t.id },
            data: {
              unitCost: costInfo.cost,
              currencyId: costInfo.costCurrencyId,
            }
          });
        }
      }
    }
  }
}


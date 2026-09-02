/**
 * Centralized Profit & COGS Calculator
 * Prevents root currency mismatch bugs and ensures 100% consistency across all reports.
 * Supports fixed-rate supplier products (where dollar cost has a custom IQD exchange rate).
 */

export interface ProductCostRecord {
  productId: number;
  costUSD: number;
  costNative: number;
  isIQD: boolean;
}

export interface ProductCostResult {
  productCostsUSD: Record<number, number>;       // Regular products: cost in USD
  fixedCostIQDMap: Record<number, number>;        // Fixed-rate products: cost in IQD
}

/**
 * Calculates weighted average purchase unit cost for all products from purchase transactions.
 * Regular products: cost stored in USD.
 * Fixed-rate products: cost stored in IQD (unitCost$ × fixedRate).
 */
export function calculateProductCostsMap(
  inventoryTransactions: any[],
  productsMap: Map<number, any>,
  marketRatePerDollar: number,
  productFixedRateMap?: Record<number, number>
): ProductCostResult {
  const stats: Record<number, { runningCostUSD: number; runningOnHandQty: number; latestCostUSD: number; isMultiBatch: boolean }> = {};
  const fixedStats: Record<number, { runningCostIQD: number; runningOnHandQty: number; latestCostIQD: number; isMultiBatch: boolean }> = {};

  inventoryTransactions.forEach((tx: any) => {
    const pId = tx.productId;
    const dbProd = productsMap.get(pId);
    const isMultiBatch = dbProd?.isMultiBatch || false;

    // Determine transaction exchange rate
    const vRate = tx.voucher?.exchangeRate && tx.voucher.exchangeRate > 100
      ? (tx.voucher.exchangeRate > 10000 ? tx.voucher.exchangeRate / 100 : tx.voucher.exchangeRate)
      : marketRatePerDollar;

    // Determine if cost is in IQD (IQD costs are in thousands > 500, USD costs are <= 500)
    const isCostIQD = tx.unitCost > 500;
    const fixedRate = productFixedRateMap?.[pId];

    if (tx.qtyChange > 0 && tx.unitCost > 0) {
      const qtyIn = tx.qtyChange;

      // Fixed-rate product (cost in USD but with fixed IQD rate)
      if (fixedRate && !isCostIQD) {
        if (!fixedStats[pId]) {
          fixedStats[pId] = { runningCostIQD: 0, runningOnHandQty: 0, latestCostIQD: 0, isMultiBatch };
        }
        const costIQD = tx.unitCost * fixedRate;
        fixedStats[pId].latestCostIQD = costIQD;

        if (isMultiBatch) {
          fixedStats[pId].runningCostIQD = costIQD;
          fixedStats[pId].runningOnHandQty += qtyIn;
        } else {
          const currentOnHand = fixedStats[pId].runningOnHandQty || 0;
          if (currentOnHand <= 0) {
            fixedStats[pId].runningCostIQD = costIQD;
            fixedStats[pId].runningOnHandQty = qtyIn;
          } else {
            const totalVal = (currentOnHand * fixedStats[pId].runningCostIQD) + (qtyIn * costIQD);
            const newOnHand = currentOnHand + qtyIn;
            fixedStats[pId].runningOnHandQty = newOnHand;
            fixedStats[pId].runningCostIQD = totalVal / newOnHand;
          }
        }
      } else {
        // Regular product
        if (!stats[pId]) {
          stats[pId] = { runningCostUSD: 0, runningOnHandQty: 0, latestCostUSD: 0, isMultiBatch };
        }
        const effectiveCostUSD = isCostIQD ? (tx.unitCost / (vRate || 1520)) : tx.unitCost;
        stats[pId].latestCostUSD = effectiveCostUSD;

        if (isMultiBatch) {
          stats[pId].runningCostUSD = effectiveCostUSD;
          stats[pId].runningOnHandQty += qtyIn;
        } else {
          const currentOnHand = stats[pId].runningOnHandQty || 0;
          if (currentOnHand <= 0) {
            stats[pId].runningCostUSD = effectiveCostUSD;
            stats[pId].runningOnHandQty = qtyIn;
          } else {
            const totalVal = (currentOnHand * stats[pId].runningCostUSD) + (qtyIn * effectiveCostUSD);
            const newOnHand = currentOnHand + qtyIn;
            stats[pId].runningOnHandQty = newOnHand;
            stats[pId].runningCostUSD = totalVal / newOnHand;
          }
        }
      }
    } else if (tx.qtyChange < 0) {
      if (fixedStats[pId]) {
        fixedStats[pId].runningOnHandQty += tx.qtyChange;
      }
      if (stats[pId]) {
        stats[pId].runningOnHandQty += tx.qtyChange;
      }
    }
  });

  const productCostsUSD: Record<number, number> = {};
  for (const [pIdStr, s] of Object.entries(stats)) {
    const pId = Number(pIdStr);
    productCostsUSD[pId] = s.isMultiBatch ? s.latestCostUSD : s.runningCostUSD;
  }

  const fixedCostIQDMap: Record<number, number> = {};
  for (const [pIdStr, s] of Object.entries(fixedStats)) {
    const pId = Number(pIdStr);
    fixedCostIQDMap[pId] = s.isMultiBatch ? s.latestCostIQD : s.runningCostIQD;
  }

  // Fallback for products with no purchase transactions
  productsMap.forEach((p, pId) => {
    if (productCostsUSD[pId] === undefined && fixedCostIQDMap[pId] === undefined) {
      const rawCost = p.costPrice || 0;
      const isCostIQD = rawCost > 500;
      productCostsUSD[pId] = isCostIQD ? (rawCost / marketRatePerDollar) : rawCost;
    }
  });

  return { productCostsUSD, fixedCostIQDMap };
}

/**
 * Calculates COGS (Cost of Goods Sold) in USD for a single sale or sales return voucher.
 * For fixed-rate products, converts IQD cost to USD at the sale voucher's daily rate.
 */
export function getVoucherCOGSInUSD(
  voucher: any,
  productCostsUSD: Record<number, number>,
  productsMap: Map<number, any>,
  marketRatePerDollar: number,
  fixedCostIQDMap?: Record<number, number>
): number {
  if (voucher.type !== "sales" && voucher.type !== "sales_return") return 0;

  const saleRate = voucher.exchangeRate && voucher.exchangeRate > 100
    ? (voucher.exchangeRate > 10000 ? voucher.exchangeRate / 100 : voucher.exchangeRate)
    : marketRatePerDollar;

  const getCostUSD = (productId: number, rawCost?: number, _rawCurId?: number): number => {
    // Check fixed-rate IQD cost first
    const fixedIQD = fixedCostIQDMap?.[productId];
    if (fixedIQD !== undefined && fixedIQD > 0) {
      return fixedIQD / saleRate;
    }

    let costUSD = productCostsUSD[productId];
    if (costUSD === undefined || costUSD === null || costUSD === 0) {
      if (rawCost && rawCost > 0) {
        const isCostIQD = rawCost > 500;
        costUSD = isCostIQD ? (rawCost / saleRate) : rawCost;
      }
    }
    return costUSD || 0;
  };

  // If voucher has inventory transactions, compute from transactions
  if (voucher.inventoryTransactions && voucher.inventoryTransactions.length > 0) {
    return voucher.inventoryTransactions.reduce((sum: number, tx: any) => {
      const cost = getCostUSD(tx.productId, tx.unitCost, tx.currencyId);
      return sum + Math.abs(tx.qtyChange) * cost;
    }, 0);
  }

  // Fallback to voucher lines
  return (voucher.lines || []).reduce((sum: number, line: any) => {
    const cost = getCostUSD(line.productId);
    return sum + line.qty * cost;
  }, 0);
}

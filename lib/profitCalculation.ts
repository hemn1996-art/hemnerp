/**
 * Unified Single Source of Truth for Profit, Sales, and COGS calculations.
 * Used by:
 * - /api/reports/profit (Profit Report API)
 * - app/reports/profit (Profit Report Page)
 * - app/reports/invoices (Invoices Report Page & KPI cards)
 * - app/reports/profit-distribution & balance-sheet
 */

export interface CurrencyItem {
  id: number;
  code: string;
  rate: number;
  isBaseCurrency?: boolean;
}

export interface InventoryTxItem {
  id: number;
  productId: number;
  qtyChange: number;
  unitCost: number;
  currencyId?: number | null;
  warehouseId?: number | null;
  date?: string | Date;
  product?: {
    isMultiBatch?: boolean;
  } | null;
  voucher?: {
    id?: number;
    type?: string;
    currencyId?: number | null;
    exchangeRate?: number | null;
    accountId?: number | null;
    account?: {
      exchangeRateType?: string | null;
      customExchangeRate?: number | null;
    } | null;
    versions?: Array<{
      version?: number;
      data?: string;
    }> | null;
  } | null;
}

export interface ProductCostMaps {
  productCostsUSD: Record<number, number>;
  fixedCostIQDMap: Record<number, number>;
  productCostCurrencyMap: Record<number, number>;
  productFixedRates: Record<number, number>;
}

export interface VoucherProfitResult {
  salesUSD: number;
  cogsUSD: number;
  profitUSD: number;
  profitInVoucherCurrency: number;
  profitCurrencyId: number;
}

/**
 * Robustly normalizes exchange rate for IQD/USD operations.
 * Handles:
 * - 152000 -> 1520 (Iraqi dinars per 100 dollars)
 * - 1520 -> 1520 (Iraqi dinars per dollar)
 * - 15.2 -> 1520 (tens of thousands representation)
 * - <= 100 or invalid -> falls back to marketRatePerDollar (never treats 1 as 100!)
 */
export function normalizeExchangeRate(rate: any, marketRatePerDollar: number = 1520): number {
  if (!rate || isNaN(Number(rate))) return marketRatePerDollar;
  let r = Number(rate);
  if (r <= 0) return marketRatePerDollar;
  if (r > 10000) return r / 100;
  if (r >= 1000 && r <= 3000) return r;
  if (r >= 10 && r < 100) return r * 100;
  // If r < 10 (e.g. 1.0 default for USD or uninitialized), return market rate
  return marketRatePerDollar;
}

/**
 * Builds unified product cost maps from inventory transactions.
 * Transactions are consistently sorted by date ascending, then ID ascending.
 */
export function buildProductCostMaps(
  transactions: InventoryTxItem[],
  dbProducts: Array<{ id: number; costPrice?: number | null; costCurrencyId?: number | null; isMultiBatch?: boolean }>,
  currencies: CurrencyItem[]
): ProductCostMaps {
  const usdCur = currencies.find((c) => c.code === "USD");
  const usdId = usdCur ? usdCur.id : 1;
  const iqdCur = currencies.find((c) => c.code === "IQD" || c.id === 2);
  const iqdId = iqdCur ? iqdCur.id : 2;
  const rawIqdRate = iqdCur?.rate || 1520;
  const marketRatePerDollar = rawIqdRate > 10000 ? rawIqdRate / 100 : (rawIqdRate > 100 ? rawIqdRate : 1520);

  // 1. Build fixed-rate map from purchase / stock vouchers
  const productFixedRates: Record<number, number> = {};
  transactions.forEach((t) => {
    if (t.qtyChange > 0 && t.unitCost > 0) {
      const sellerAcc = t.voucher?.account;
      let rateType = sellerAcc?.exchangeRateType;
      let customRate = sellerAcc?.customExchangeRate;

      const versions = t.voucher?.versions;
      if (versions && versions.length > 0) {
        const sorted = [...versions].sort((a, b) => (a.version || 0) - (b.version || 0));
        try {
          const vData = JSON.parse(sorted[sorted.length - 1].data || "{}");
          if (vData.exchangeRateType) rateType = vData.exchangeRateType;
          if (vData.customExchangeRate) customRate = vData.customExchangeRate;
        } catch (e) {}
      }

      const isFixed = rateType === "FIXED";
      if (isFixed && customRate) {
        productFixedRates[t.productId] = customRate > 10000 ? customRate / 100 : (customRate < 10 ? customRate * 100 : customRate);
      }
    }
  });

  // 2. Sort transactions deterministically by date asc, then id asc
  const sortedTxs = [...transactions].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });

  const productPurchaseStats: Record<number, { runningCostUSD: number; runningOnHandQty: number; latestCostUSD: number; isMultiBatch: boolean }> = {};
  const fixedPurchaseStats: Record<number, { runningCostIQD: number; runningOnHandQty: number; latestCostIQD: number; isMultiBatch: boolean }> = {};
  const productCostCurrencyMap: Record<number, number> = {};

  sortedTxs.forEach((t) => {
    const pId = t.productId;
    const prod = dbProducts.find((p) => p.id === pId);
    const isMultiBatch = prod?.isMultiBatch || t.product?.isMultiBatch || false;
    const txCurId = t.currencyId ?? t.voucher?.currencyId ?? usdId;
    const isCostIQD = txCurId === iqdId || txCurId === 2 || txCurId === 12;
    const fixedRate = productFixedRates[pId];

    const vRate = normalizeExchangeRate(t.voucher?.exchangeRate, marketRatePerDollar);

    if (t.qtyChange > 0 && t.unitCost > 0) {
      const qtyIn = t.qtyChange;
      productCostCurrencyMap[pId] = txCurId;

      if (fixedRate && !isCostIQD) {
        // Fixed-rate product: cost tracked in IQD
        if (!fixedPurchaseStats[pId]) {
          fixedPurchaseStats[pId] = { runningCostIQD: 0, runningOnHandQty: 0, latestCostIQD: 0, isMultiBatch };
        }
        const costIQD = t.unitCost * fixedRate;
        fixedPurchaseStats[pId].latestCostIQD = costIQD;

        if (isMultiBatch) {
          fixedPurchaseStats[pId].runningCostIQD = costIQD;
          fixedPurchaseStats[pId].runningOnHandQty += qtyIn;
        } else {
          const currentOnHand = fixedPurchaseStats[pId].runningOnHandQty || 0;
          if (currentOnHand <= 0) {
            fixedPurchaseStats[pId].runningCostIQD = costIQD;
            fixedPurchaseStats[pId].runningOnHandQty = qtyIn;
          } else {
            const totalVal = (currentOnHand * fixedPurchaseStats[pId].runningCostIQD) + (qtyIn * costIQD);
            const newOnHand = currentOnHand + qtyIn;
            fixedPurchaseStats[pId].runningOnHandQty = newOnHand;
            fixedPurchaseStats[pId].runningCostIQD = totalVal / newOnHand;
          }
        }
      } else {
        // Regular product: cost in USD
        if (!productPurchaseStats[pId]) {
          productPurchaseStats[pId] = { runningCostUSD: 0, runningOnHandQty: 0, latestCostUSD: 0, isMultiBatch };
        }
        const effectiveUnitCostUsd = isCostIQD ? (t.unitCost / vRate) : t.unitCost;
        productPurchaseStats[pId].latestCostUSD = effectiveUnitCostUsd;

        if (isMultiBatch) {
          productPurchaseStats[pId].runningCostUSD = effectiveUnitCostUsd;
          productPurchaseStats[pId].runningOnHandQty += qtyIn;
        } else {
          const currentOnHand = productPurchaseStats[pId].runningOnHandQty || 0;
          if (currentOnHand <= 0) {
            productPurchaseStats[pId].runningCostUSD = effectiveUnitCostUsd;
            productPurchaseStats[pId].runningOnHandQty = qtyIn;
          } else {
            const totalVal = (currentOnHand * productPurchaseStats[pId].runningCostUSD) + (qtyIn * effectiveUnitCostUsd);
            const newOnHand = currentOnHand + qtyIn;
            productPurchaseStats[pId].runningOnHandQty = newOnHand;
            productPurchaseStats[pId].runningCostUSD = totalVal / newOnHand;
          }
        }
      }
    } else if (t.qtyChange < 0) {
      if (fixedPurchaseStats[pId]) fixedPurchaseStats[pId].runningOnHandQty += t.qtyChange;
      if (productPurchaseStats[pId]) productPurchaseStats[pId].runningOnHandQty += t.qtyChange;
    }
  });

  const productCostsUSD: Record<number, number> = {};
  for (const [pId, stats] of Object.entries(productPurchaseStats)) {
    productCostsUSD[Number(pId)] = stats.isMultiBatch ? stats.latestCostUSD : stats.runningCostUSD;
  }
  const fixedCostIQDMap: Record<number, number> = {};
  for (const [pId, stats] of Object.entries(fixedPurchaseStats)) {
    fixedCostIQDMap[Number(pId)] = stats.isMultiBatch ? stats.latestCostIQD : stats.runningCostIQD;
  }

  // Fallback for products without incoming inventory transactions
  dbProducts.forEach((p) => {
    if (productCostsUSD[p.id] === undefined && fixedCostIQDMap[p.id] === undefined) {
      const rawCost = p.costPrice || 0;
      const isCostIQD = productCostCurrencyMap[p.id] === iqdId || p.costCurrencyId === iqdId || p.costCurrencyId === 2 || p.costCurrencyId === 12;
      productCostsUSD[p.id] = isCostIQD ? (rawCost / marketRatePerDollar) : rawCost;
    }
  });

  return {
    productCostsUSD,
    fixedCostIQDMap,
    productCostCurrencyMap,
    productFixedRates,
  };
}

/**
 * Resolves unit cost in USD for a product within a specific voucher context.
 */
export function getProductUnitCostUSD(
  voucher: { exchangeRate?: number | null },
  productId: number,
  costMaps: ProductCostMaps,
  currencies: CurrencyItem[],
  rawTxCost?: number,
  rawCurId?: number
): number {
  const usdCur = currencies.find((c) => c.code === "USD");
  const usdId = usdCur ? usdCur.id : 1;
  const iqdCur = currencies.find((c) => c.code === "IQD" || c.id === 2);
  const iqdId = iqdCur ? iqdCur.id : 2;
  const rawIqdRate = iqdCur?.rate || 1520;
  const marketRatePerDollar = rawIqdRate > 10000 ? rawIqdRate / 100 : (rawIqdRate > 100 ? rawIqdRate : 1520);

  const saleRate = normalizeExchangeRate(voucher.exchangeRate, marketRatePerDollar);

  const originCurId = costMaps.productCostCurrencyMap[productId] || rawCurId || usdId;
  const isCostIQD = originCurId === iqdId || originCurId === 2 || originCurId === 12;

  // 1. Fixed-rate product
  const fixedRate = costMaps.productFixedRates[productId];
  if (fixedRate && fixedRate > 0) {
    if (rawTxCost && rawTxCost > 0) {
      const costIQD = isCostIQD ? rawTxCost : (rawTxCost * fixedRate);
      return costIQD / saleRate;
    }
    const fixedIQD = costMaps.fixedCostIQDMap[productId];
    if (fixedIQD !== undefined && fixedIQD > 0) {
      return fixedIQD / saleRate;
    }
  }

  // 2. Transaction recorded cost
  if (rawTxCost && rawTxCost > 0) {
    return isCostIQD ? (rawTxCost / saleRate) : rawTxCost;
  }

  // 3. Running cost from cost maps
  return costMaps.productCostsUSD[productId] || 0;
}

/**
 * Calculates unified profit, sales, and COGS for a voucher.
 * Guarantees that:
 * - Sales and COGS are computed identically across all reports.
 * - Net profit in USD is exact.
 * - Profit in the voucher's own currency matches the voucher currency type.
 */
export function calculateVoucherProfit(
  voucher: any,
  costMaps: ProductCostMaps,
  currencies: CurrencyItem[],
  options?: {
    productIds?: number[] | null;
    categories?: string[] | null;
    brands?: string[] | null;
    warehouseIds?: number[] | null;
  }
): VoucherProfitResult {
  const usdCur = currencies.find((c) => c.code === "USD");
  const usdId = usdCur ? usdCur.id : 1;
  const iqdCur = currencies.find((c) => c.code === "IQD" || c.id === 2);
  const iqdId = iqdCur ? iqdCur.id : 2;
  const rawIqdRate = iqdCur?.rate || 1520;
  const marketRatePerDollar = rawIqdRate > 10000 ? rawIqdRate / 100 : (rawIqdRate > 100 ? rawIqdRate : 1520);

  const vCurId = voucher.currencyId || usdId;
  const isVoucherIQD = vCurId === iqdId || vCurId === 2 || vCurId === 12;
  const vRate = normalizeExchangeRate(voucher.exchangeRate, marketRatePerDollar);

  const fallback: VoucherProfitResult = {
    salesUSD: 0,
    cogsUSD: 0,
    profitUSD: 0,
    profitInVoucherCurrency: 0,
    profitCurrencyId: vCurId,
  };

  if (voucher.type !== "sales" && voucher.type !== "sales_return") {
    return fallback;
  }

  // 1. Calculate Sales in USD
  let salesUSD = 0;
  const hasLineFilters = options?.productIds || options?.categories || options?.brands || options?.warehouseIds;

  if (hasLineFilters) {
    let matchedLineTotalInVoucherCur = 0;
    const discountFactor = voucher.totalAmount > 0 ? (voucher.netAmount / voucher.totalAmount) : 1;

    (voucher.lines || []).forEach((line: any) => {
      const prod = line.product;
      const pId = line.productId;
      if (options?.productIds && !options.productIds.includes(pId)) return;
      if (options?.categories && (!prod?.category || !options.categories.includes(prod.category))) return;
      if (options?.brands && (!prod?.brand || !options.brands.includes(prod.brand))) return;

      if (options?.warehouseIds) {
        const hasTxInWh = voucher.inventoryTransactions?.some((tx: any) => tx.productId === pId && options.warehouseIds!.includes(tx.warehouseId));
        if (!hasTxInWh) return;
      }

      matchedLineTotalInVoucherCur += Number(line.lineTotal || 0) * discountFactor;
    });

    salesUSD = isVoucherIQD ? (matchedLineTotalInVoucherCur / vRate) : matchedLineTotalInVoucherCur;
  } else {
    // Standard voucher netAmount conversion to USD
    const rawNet = Number(voucher.netAmount || 0);
    salesUSD = isVoucherIQD ? (rawNet / vRate) : rawNet;
  }

  // 2. Calculate COGS in USD
  let cogsUSD = 0;
  if (voucher.inventoryTransactions && voucher.inventoryTransactions.length > 0) {
    voucher.inventoryTransactions.forEach((tx: any) => {
      if (options?.warehouseIds && !options.warehouseIds.includes(tx.warehouseId)) return;
      if (options?.productIds && !options.productIds.includes(tx.productId)) return;

      const unitCostUSD = getProductUnitCostUSD(voucher, tx.productId, costMaps, currencies, tx.unitCost, tx.currencyId);
      cogsUSD += Math.abs(Number(tx.qtyChange || 0)) * unitCostUSD;
    });
  } else if (voucher.lines && voucher.lines.length > 0) {
    voucher.lines.forEach((line: any) => {
      if (options?.productIds && !options.productIds.includes(line.productId)) return;
      const unitCostUSD = getProductUnitCostUSD(voucher, line.productId, costMaps, currencies, line.unitCost, line.currencyId);
      cogsUSD += Number(line.qty || 0) * unitCostUSD;
    });
  }

  // 3. Profit in USD (sales_return reverses the sign)
  const isReturn = voucher.type === "sales_return";
  const profitUSD = isReturn ? -(salesUSD - cogsUSD) : (salesUSD - cogsUSD);
  const effectiveSalesUSD = isReturn ? -salesUSD : salesUSD;
  const effectiveCogsUSD = isReturn ? -cogsUSD : cogsUSD;

  // 4. Profit in voucher's own currency
  const profitInVoucherCurrency = isVoucherIQD ? (profitUSD * vRate) : profitUSD;

  return {
    salesUSD: effectiveSalesUSD,
    cogsUSD: effectiveCogsUSD,
    profitUSD,
    profitInVoucherCurrency,
    profitCurrencyId: vCurId,
  };
}

/**
 * Extracts and maps inventory transactions from voucher records in memory.
 * Enables the client (Invoices Report) to build cost maps using the exact same logic.
 */
export function extractInventoryTransactionsFromVouchers(vouchers: any[]): InventoryTxItem[] {
  const txs: InventoryTxItem[] = [];
  (vouchers || []).forEach((v) => {
    if (v.isDeleted) return;
    (v.inventoryTransactions || []).forEach((t: any) => {
      txs.push({
        id: t.id || 0,
        productId: t.productId,
        qtyChange: Number(t.qtyChange || 0),
        unitCost: Number(t.unitCost || 0),
        currencyId: t.currencyId ?? v.currencyId ?? 1,
        warehouseId: t.warehouseId,
        date: t.date || v.date,
        voucher: {
          id: v.id,
          type: v.type,
          currencyId: v.currencyId,
          exchangeRate: v.exchangeRate,
          accountId: v.accountId,
          account: v.account,
          versions: v.versions,
        },
      });
    });
  });
  return txs;
}


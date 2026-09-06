import { calculateWeightedProductCost } from "./inventoryCost";

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
 * Uses standard inventory costing: converts fixed-rate dollar stock to Dinars and then to market dollars
 * when new market purchases arrive, setting cost currency to the latest incoming voucher.
 */
export function calculateProductCostsMap(
  inventoryTransactions: any[],
  productsMap: Map<number, any>,
  marketRatePerDollar: number,
  _productFixedRateMap?: Record<number, number>
): ProductCostResult {
  const txsByProduct = new Map<number, any[]>();
  inventoryTransactions.forEach((tx: any) => {
    const pId = tx.productId;
    if (!txsByProduct.has(pId)) {
      txsByProduct.set(pId, []);
    }
    txsByProduct.get(pId)!.push(tx);
  });

  const productCostsUSD: Record<number, number> = {};
  const fixedCostIQDMap: Record<number, number> = {};

  txsByProduct.forEach((txs, pId) => {
    const dbProd = productsMap.get(pId);
    const isMultiBatch = dbProd?.isMultiBatch || false;
    const costInfo = calculateWeightedProductCost(txs, isMultiBatch, marketRatePerDollar);

    if (costInfo.costCurrencyId === 2) {
      // Cost is in IQD
      fixedCostIQDMap[pId] = costInfo.costPrice;
    } else {
      // Cost is in USD
      if (costInfo.exchangeRateType === "FIXED" && costInfo.customExchangeRate) {
        // Still fixed rate USD -> convert to IQD using fixed rate so reports handle it accurately
        const fixedRatePerDollar = costInfo.customExchangeRate / 100;
        fixedCostIQDMap[pId] = costInfo.costPrice * fixedRatePerDollar;
      } else {
        productCostsUSD[pId] = costInfo.costPrice;
      }
    }
  });

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

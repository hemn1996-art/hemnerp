import { prisma } from "./prisma";
import { calculateWeightedProductCost } from "./inventoryCost";

export async function getCalculatedWarehouseValueInUsd(dateFilter?: Date): Promise<number> {
  const where: any = { 
    voucher: { isDeleted: false },
    product: { isExpense: false }
  };
  if (dateFilter) {
    where.date = { lte: dateFilter };
  }

  const [transactions, dbCurrencies] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      select: {
        productId: true,
        warehouseId: true,
        qtyChange: true,
        unitCost: true,
        currencyId: true,
        product: { select: { isMultiBatch: true, isExpense: true } },
        voucher: {
          select: {
            type: true,
            exchangeRate: true,
            account: { select: { id: true, name: true, exchangeRateType: true, customExchangeRate: true } },
            versions: { select: { version: true, data: true } },
            lines: {
              select: {
                productId: true,
                unitPrice: true,
                currencyId: true,
              }
            }
          }
        }
      },
      orderBy: { date: "asc" }
    }),
    prisma.currency.findMany({ where: { isActive: true } })
  ]);

  const iqdCur = dbCurrencies.find(c => c.code === "IQD" || c.id === 2 || c.id === 12);
  const rawRate = iqdCur?.rate || 1520;
  const marketRatePerDollar = rawRate > 10000 ? rawRate / 100 : (rawRate > 100 ? rawRate : 1520);

  const productCostMap = new Map<number, any>();
  const txsByProduct = new Map<number, any[]>();
  const stockByProduct = new Map<number, number>();

  transactions.forEach(t => {
    if (!txsByProduct.has(t.productId)) txsByProduct.set(t.productId, []);
    txsByProduct.get(t.productId)!.push(t);
    stockByProduct.set(t.productId, (stockByProduct.get(t.productId) || 0) + t.qtyChange);
  });

  txsByProduct.forEach((txs, pId) => {
    const isMultiBatch = txs[0]?.product?.isMultiBatch || false;
    productCostMap.set(pId, calculateWeightedProductCost(txs as any, isMultiBatch, marketRatePerDollar));
  });

  let totalWarehouseValueInUsd = 0;
  stockByProduct.forEach((qty, pId) => {
    if (qty > 0) {
      const costInfo = productCostMap.get(pId);
      if (costInfo && costInfo.costPrice > 0) {
        let unitCostUsd = costInfo.costPrice;
        const isCostIQD = costInfo.costCurrencyId === 2 || costInfo.costCurrencyId === 12;
        const isFixed = costInfo.exchangeRateType === "FIXED" && costInfo.customExchangeRate;

        // If cost currency is IQD, convert to USD at current market rate
        if (isCostIQD) {
          unitCostUsd = costInfo.costPrice / marketRatePerDollar;
        } else if (isFixed) {
          // If USD cost is entered under a FIXED leaf dollar contract rate (e.g. 135,000 IQD per 100$),
          // convert to IQD at contract rate, then convert to USD at current market rate
          const fixedRate = costInfo.customExchangeRate > 10000
            ? costInfo.customExchangeRate / 100
            : costInfo.customExchangeRate;
          const costIqd = costInfo.costPrice * fixedRate;
          unitCostUsd = costIqd / marketRatePerDollar;
        }
        // If regular USD, it is already in USD (no conversion needed)
        totalWarehouseValueInUsd += qty * unitCostUsd;
      } else {
        // Fallback to recorded transaction unitCost if costInfo is 0
        const txs = txsByProduct.get(pId);
        const txWithCost = txs?.find((t: any) => t.unitCost && t.unitCost > 0);
        if (txWithCost) {
          const isIQD = txWithCost.currencyId === 2 || txWithCost.currencyId === 12 || (txWithCost.currencyId !== 1 && txWithCost.unitCost > 15000);
          const isFixed = txWithCost.voucher?.account?.exchangeRateType === "FIXED";
          const customRate = txWithCost.voucher?.account?.customExchangeRate;
          let unitCostUsd = txWithCost.unitCost;
          if (isIQD) {
            unitCostUsd = txWithCost.unitCost / marketRatePerDollar;
          } else if (isFixed && customRate) {
            const fixedRate = customRate > 10000 ? customRate / 100 : customRate;
            unitCostUsd = (txWithCost.unitCost * fixedRate) / marketRatePerDollar;
          }
          totalWarehouseValueInUsd += qty * unitCostUsd;
        }
      }
    }
  });

  return totalWarehouseValueInUsd;
}

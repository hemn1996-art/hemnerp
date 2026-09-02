import { prisma } from "./prisma";

export async function getCalculatedWarehouseValueInUsd(dateFilter?: Date): Promise<number> {
  const where: any = { voucher: { isDeleted: false } };
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
        product: { select: { isMultiBatch: true } },
        voucher: {
          select: {
            type: true,
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

  const stockMap: Record<string, {
    productId: number;
    qty: number;
    totalPurchaseValueUsd: number;
    totalPurchaseQty: number;
    fallbackCostUsd: number;
  }> = {};

  transactions.forEach(t => {
    const key = `${t.productId}-${t.warehouseId}`;
    if (!stockMap[key]) {
      stockMap[key] = {
        productId: t.productId,
        qty: 0,
        totalPurchaseValueUsd: 0,
        totalPurchaseQty: 0,
        fallbackCostUsd: 0,
      };
    }

    stockMap[key].qty += t.qtyChange;

    const line = t.voucher?.lines?.find((l: any) => l.productId === t.productId);
    let rawPrice = (line && line.unitPrice > 0) ? line.unitPrice : (t.unitCost || 0);
    let voucherCurId = (line as any)?.currencyId || (t.voucher as any)?.currencyId || 1;

    // Determine currency from the stored currencyId (backfilled from voucher)
    const txCurId = (t as any).currencyId ?? voucherCurId;
    const isIQD = txCurId === iqdCur?.id;
    const vRate = (t.voucher as any)?.exchangeRate && (t.voucher as any).exchangeRate > 100
      ? ((t.voucher as any).exchangeRate > 10000 ? (t.voucher as any).exchangeRate / 100 : (t.voucher as any).exchangeRate)
      : marketRatePerDollar;
    let originalPriceUsd = isIQD ? (rawPrice / vRate) : rawPrice;

    let versionData: any = {};
    if (t.voucher?.versions && t.voucher.versions.length > 0) {
      const sortedV = [...t.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
      const latestV = sortedV[sortedV.length - 1];
      try { versionData = JSON.parse(latestV.data); } catch(e){}
    }

    if (t.qtyChange > 0 && rawPrice > 0) {
      let effectiveUnitCostUsd = originalPriceUsd;

      stockMap[key].totalPurchaseValueUsd += (t.qtyChange * effectiveUnitCostUsd);
      stockMap[key].totalPurchaseQty += t.qtyChange;
      if (stockMap[key].fallbackCostUsd === 0) {
        stockMap[key].fallbackCostUsd = effectiveUnitCostUsd;
      }
    }
  });

  // Secondary fallback for zero costs
  Object.values(stockMap).forEach((item) => {
    if (item.totalPurchaseQty === 0 && item.fallbackCostUsd === 0) {
      const txWithCost = transactions.find(
        (t: any) => t.productId === item.productId && t.unitCost && t.unitCost > 0
      );
      if (txWithCost) {
        const rawPrice = txWithCost.unitCost;
        const isIQD = (txWithCost as any).currencyId === iqdCur?.id;
        item.fallbackCostUsd = isIQD ? (rawPrice / marketRatePerDollar) : rawPrice;
      }
    }
  });

  let totalWarehouseValueInUsd = 0;
  Object.values(stockMap).forEach(item => {
    if (item.qty > 0) {
      const costUsd = item.totalPurchaseQty > 0
        ? (item.totalPurchaseValueUsd / item.totalPurchaseQty)
        : item.fallbackCostUsd;
      
      totalWarehouseValueInUsd += item.qty * costUsd;
    }
  });

  return totalWarehouseValueInUsd;
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asOfDateParam = searchParams.get("asOfDate");
    
    let dateFilter = {};
    if (asOfDateParam) {
      const end = new Date(asOfDateParam);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { lte: end } };
    }

    const [transactions, dbCurrencies] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: {
          ...dateFilter,
          product: { isExpense: false },
          voucher: { isDeleted: false }
        },
        select: {
          productId: true,
          warehouseId: true,
          qtyChange: true,
          unitCost: true,
          currencyId: true,
          product: { select: { name: true, code: true, category: true, brand: true, isMultiBatch: true } },
          warehouse: { select: { name: true } },
          voucher: {
            select: {
              type: true,
              date: true,
              account: { select: { id: true, name: true, exchangeRateType: true, customExchangeRate: true } },
              versions: { select: { version: true, data: true } },
              lines: {
                select: {
                  productId: true,
                  unitPrice: true,
                  discountAmount: true,
                  qty: true
                }
              }
            },
          },
        },
        orderBy: { date: "asc" }
      }),
      prisma.currency.findMany({ where: { isActive: true } })
    ]);

    const iqdCur = dbCurrencies.find(c => c.code === "IQD" || c.id === 2 || c.id === 12);
    const rawRate = iqdCur?.rate || 1520;
    const marketRatePerDollar = rawRate > 10000 ? rawRate / 100 : (rawRate > 100 ? rawRate : 1520);

    const stockMap: Record<string, any> = {};

    transactions.forEach(t => {
      const key = `${t.productId}-${t.warehouseId}`;
      if (!stockMap[key]) {
        stockMap[key] = {
          productId: t.productId,
          productName: t.product?.name || "نەزانراو",
          productCode: t.product?.code || "-",
          category: t.product?.category || "-",
          brand: t.product?.brand || "-",
          sellPrice: 0,
          warehouseId: t.warehouseId,
          warehouseName: t.warehouse?.name || "نەزانراو",
          quantity: 0,
          purchasePrice: 0,
          expense: 0,
          cost: 0,
          sellerName: "-",
          sellerId: null as number | null,
          exchangeRateType: "DAILY_MARKET",
          customExchangeRate: 132000,
          purchaseDate: "-",
          totalPurchaseValue: 0,
          totalPurchaseQty: 0,
          totalExpenseValue: 0,
          isMultiBatch: t.product?.isMultiBatch || false
        };
      }

      stockMap[key].quantity += t.qtyChange;

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

      const sellerAcc = t.voucher?.account;
      let rateTypeForProduct = (t.voucher as any)?.exchangeRateType || versionData.exchangeRateType || sellerAcc?.exchangeRateType || "DAILY_MARKET";
      let customRateForProduct = (t.voucher as any)?.customExchangeRate || versionData.customExchangeRate || sellerAcc?.customExchangeRate || 132000;

      if (rateTypeForProduct === "FIXED") {
        stockMap[key].exchangeRateType = "FIXED";
        stockMap[key].customExchangeRate = customRateForProduct;
      }

      if (t.qtyChange > 0 && rawPrice > 0) {
        let effectiveUnitCostUsd = originalPriceUsd;

        // Only convert IQD items using fixed rate. USD items already ARE in USD — no conversion needed.
        if (isIQD && rateTypeForProduct === "FIXED") {
          const fixedRatePerDollar = customRateForProduct / 100;
          effectiveUnitCostUsd = rawPrice / fixedRatePerDollar;
        } else if (!isIQD && rateTypeForProduct === "FIXED") {
          // USD item with FIXED rate account → price stays in USD as entered, no adjustment
          effectiveUnitCostUsd = originalPriceUsd;
        }

        const unitExpense = 0;
        const qtyIn = t.qtyChange;
        const unitCostUsdIn = effectiveUnitCostUsd + unitExpense;
        const unitRawCostIn = isIQD ? rawPrice : originalPriceUsd;

        if (stockMap[key].isMultiBatch) {
          stockMap[key].runningCostUsd = unitCostUsdIn;
          stockMap[key].runningRawCost = unitRawCostIn;
          stockMap[key].runningOnHandQty = (stockMap[key].runningOnHandQty || 0) + qtyIn;
        } else {
          // Perpetual Moving Average Cost: averages incoming batch with currently available on-hand stock
          const currentOnHand = stockMap[key].runningOnHandQty || 0;
          if (currentOnHand <= 0) {
            stockMap[key].runningCostUsd = unitCostUsdIn;
            stockMap[key].runningRawCost = unitRawCostIn;
            stockMap[key].runningOnHandQty = qtyIn;
          } else {
            const totalValUsd = (currentOnHand * (stockMap[key].runningCostUsd || 0)) + (qtyIn * unitCostUsdIn);
            const totalValRaw = (currentOnHand * (stockMap[key].runningRawCost || 0)) + (qtyIn * unitRawCostIn);
            const newOnHand = currentOnHand + qtyIn;
            stockMap[key].runningOnHandQty = newOnHand;
            stockMap[key].runningCostUsd = totalValUsd / newOnHand;
            stockMap[key].runningRawCost = totalValRaw / newOnHand;
          }
        }

        stockMap[key].totalPurchaseValue += (t.qtyChange * effectiveUnitCostUsd);
        stockMap[key].totalPurchaseValueRaw = (stockMap[key].totalPurchaseValueRaw || 0) + (t.qtyChange * (isIQD ? rawPrice : originalPriceUsd));
        stockMap[key].totalPurchaseQty += t.qtyChange;
        stockMap[key].totalExpenseValue += (t.qtyChange * unitExpense);
        
        stockMap[key].exchangeRateType = rateTypeForProduct;
        stockMap[key].customExchangeRate = customRateForProduct;
        stockMap[key].isIQD = isIQD;
        stockMap[key].currencyCode = isIQD ? "IQD" : "USD";
        stockMap[key].currencySymbol = isIQD ? "دینار" : "$";
        stockMap[key].latestRawPrice = isIQD ? rawPrice : originalPriceUsd;
        stockMap[key].latestCostUsd = effectiveUnitCostUsd + unitExpense;

        stockMap[key].rawPurchasePrice = stockMap[key].runningRawCost;
        stockMap[key].rawCost = stockMap[key].runningRawCost;
        stockMap[key].purchasePrice = isIQD ? stockMap[key].runningRawCost : stockMap[key].runningCostUsd;
        stockMap[key].cost = isIQD ? stockMap[key].runningRawCost : stockMap[key].runningCostUsd;
        stockMap[key].costUsd = stockMap[key].runningCostUsd;
        stockMap[key].purchasePriceUsd = stockMap[key].runningCostUsd;
        stockMap[key].expense = unitExpense;

        if (t.voucher?.account?.name) {
          stockMap[key].sellerName = t.voucher.account.name;
          stockMap[key].sellerId = t.voucher.account.id;
        }
        if (t.voucher?.date) {
          stockMap[key].purchaseDate = t.voucher.date;
        }
      } else if (t.qtyChange < 0) {
        // Outflow (sale / transfer out) reduces on-hand quantity without changing unit cost
        stockMap[key].runningOnHandQty = (stockMap[key].runningOnHandQty || 0) + t.qtyChange;
      }
    });

    // Secondary fallback: if cost is still 0, check if any transaction for this product had unitCost > 0
    Object.values(stockMap).forEach((item: any) => {
      if (!item.cost || item.cost === 0) {
        const txWithCost = transactions.find(
          (t: any) => t.productId === item.productId && t.unitCost && t.unitCost > 0
        );
        if (txWithCost) {
          item.purchasePrice = txWithCost.unitCost;
          item.cost = txWithCost.unitCost;
          item.costUsd = item.isIQD ? (txWithCost.unitCost / marketRatePerDollar) : txWithCost.unitCost;
          item.purchasePriceUsd = item.costUsd;
          item.rawCost = txWithCost.unitCost;
          item.rawPurchasePrice = txWithCost.unitCost;
        }
      }

      // If any transaction on this product came from a FIXED rate voucher, propagate FIXED rate to item
      const txFixed = transactions.find((t: any) => {
        if (t.productId !== item.productId) return false;
        let vData: any = {};
        if (t.voucher?.versions && t.voucher.versions.length > 0) {
          const sortedV = [...t.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
          const latestV = sortedV[sortedV.length - 1];
          try { vData = JSON.parse(latestV.data); } catch(e){}
        }
        return (t.voucher as any)?.exchangeRateType === "FIXED" || vData.exchangeRateType === "FIXED" || t.voucher?.account?.exchangeRateType === "FIXED";
      });

      if (txFixed) {
        let vData: any = {};
        if (txFixed.voucher?.versions && txFixed.voucher.versions.length > 0) {
          const sortedV = [...txFixed.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
          const latestV = sortedV[sortedV.length - 1];
          try { vData = JSON.parse(latestV.data); } catch(e){}
        }
        item.exchangeRateType = "FIXED";
        item.customExchangeRate = (txFixed.voucher as any)?.customExchangeRate || vData.customExchangeRate || txFixed.voucher?.account?.customExchangeRate || 132000;
      }
    });

    const result = Object.values(stockMap).filter((item: any) => item.quantity !== 0);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching stock snapshot:", error?.message || error);
    return NextResponse.json({ 
      error: "کێشەیەک ڕوویدا لە هێنانی ڕوونمایی کۆگا", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

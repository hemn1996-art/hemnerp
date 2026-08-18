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
    const toDate = searchParams.get("toDate") || searchParams.get("date");
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");
    const sellerName = searchParams.get("sellerName");

    // Build database filters
    const where: any = {};

    if (toDate && toDate.trim() !== "") {
      const end = new Date(toDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        where.date = { lte: end };
      }
    }

    if (warehouseId && warehouseId !== "all" && warehouseId !== "") {
      where.warehouseId = parseInt(warehouseId);
    }

    if (productId && productId !== "all" && productId !== "") {
      where.productId = parseInt(productId);
    }

    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const code = searchParams.get("code");
    const rateType = searchParams.get("rateType");

    const [transactions, dbCurrencies] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        select: {
          productId: true,
          warehouseId: true,
          qtyChange: true,
          unitCost: true,
          product: { select: { name: true, code: true, category: true, brand: true, isMultiBatch: true, salePrices: true } },
          warehouse: { select: { name: true } },
          voucher: {
            select: {
              type: true,
              date: true,
              account: { select: { id: true, name: true } },
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
          salePrices: t.product?.salePrices ? JSON.parse(t.product.salePrices) : [],
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
      
      const isIQD = voucherCurId === iqdCur?.id || rawPrice > 1000;
      let originalPriceUsd = isIQD ? (rawPrice / marketRatePerDollar) : rawPrice;

      let versionData: any = {};
      if (t.voucher?.versions && t.voucher.versions.length > 0) {
        const sortedV = [...t.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
        const latestV = sortedV[sortedV.length - 1];
        try { versionData = JSON.parse(latestV.data); } catch(e){}
      }

      const sellerAcc = t.voucher?.account;
      let rateTypeForProduct = (t.voucher as any)?.exchangeRateType || versionData.exchangeRateType || (sellerAcc as any)?.exchangeRateType || "DAILY_MARKET";
      let customRateForProduct = (t.voucher as any)?.customExchangeRate || versionData.customExchangeRate || (sellerAcc as any)?.customExchangeRate || 132000;

      if (rateTypeForProduct === "FIXED") {
        stockMap[key].exchangeRateType = "FIXED";
        stockMap[key].customExchangeRate = customRateForProduct;
      }

      if (t.qtyChange > 0 && rawPrice > 0) {
        let effectiveUnitCostUsd = originalPriceUsd;

        if (rateTypeForProduct === "FIXED") {
          const fixedRatePerDollar = customRateForProduct / 100;
          effectiveUnitCostUsd = (originalPriceUsd * fixedRatePerDollar) / marketRatePerDollar;
        }

        const unitExpense = 0;

        stockMap[key].totalPurchaseValue += (t.qtyChange * effectiveUnitCostUsd);
        stockMap[key].totalPurchaseQty += t.qtyChange;
        stockMap[key].totalExpenseValue += (t.qtyChange * unitExpense);
        
        stockMap[key].exchangeRateType = rateTypeForProduct;
        stockMap[key].customExchangeRate = customRateForProduct;
        stockMap[key].isIQD = isIQD;
        stockMap[key].currencyCode = isIQD ? "IQD" : "USD";
        stockMap[key].currencySymbol = isIQD ? "دینار" : "$";
        stockMap[key].rawPurchasePrice = isIQD ? rawPrice : originalPriceUsd;
        stockMap[key].rawCost = isIQD ? rawPrice : effectiveUnitCostUsd;

        if (stockMap[key].isMultiBatch) {
          stockMap[key].purchasePrice = isIQD ? rawPrice : originalPriceUsd;
          stockMap[key].cost = isIQD ? rawPrice : effectiveUnitCostUsd;
          stockMap[key].expense = unitExpense;
        } else {
          const avgCostUsd = stockMap[key].totalPurchaseQty > 0 ? (stockMap[key].totalPurchaseValue / stockMap[key].totalPurchaseQty) : effectiveUnitCostUsd;
          const avgExpense = 0;
          
          stockMap[key].purchasePrice = isIQD ? rawPrice : originalPriceUsd;
          stockMap[key].cost = isIQD ? (avgCostUsd * marketRatePerDollar) : avgCostUsd;
          stockMap[key].costUsd = avgCostUsd;
          stockMap[key].purchasePriceUsd = originalPriceUsd;
          stockMap[key].expense = avgExpense;
        }
        if (t.voucher?.account?.name) {
          stockMap[key].sellerName = t.voucher.account.name;
          stockMap[key].sellerId = t.voucher.account.id;
        }
        if (t.voucher?.date) {
          stockMap[key].purchaseDate = t.voucher.date;
        }
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
        return (t.voucher as any)?.exchangeRateType === "FIXED" || vData.exchangeRateType === "FIXED" || (t.voucher?.account as any)?.exchangeRateType === "FIXED";
      });

      if (txFixed) {
        let vData: any = {};
        if (txFixed.voucher?.versions && txFixed.voucher.versions.length > 0) {
          const sortedV = [...txFixed.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
          const latestV = sortedV[sortedV.length - 1];
          try { vData = JSON.parse(latestV.data); } catch(e){}
        }
        item.exchangeRateType = "FIXED";
        item.customExchangeRate = (txFixed.voucher as any)?.customExchangeRate || vData.customExchangeRate || (txFixed.voucher?.account as any)?.customExchangeRate || 132000;
      }
    });

    const status = searchParams.get("status") || "available";

    if (status === "all" || status === "out_of_stock") {
      const allProducts = await prisma.product.findMany({ 
        select: { id: true, name: true, code: true, category: true, brand: true, isMultiBatch: true, salePrices: true } 
      });
      allProducts.forEach(p => {
        const key = `${p.id}-default`;
        if (!stockMap[key]) {
          stockMap[key] = {
            productId: p.id,
            productName: p.name,
            productCode: p.code || "-",
            category: p.category || "-",
            brand: p.brand || "-",
            sellPrice: 0,
            salePrices: p.salePrices ? JSON.parse(p.salePrices) : [],
            warehouseId: 0,
            warehouseName: "-",
            quantity: 0,
            purchasePrice: 0,
            expense: 0,
            cost: 0,
            sellerName: "-",
            sellerId: null,
            exchangeRateType: "DAILY_MARKET",
            customExchangeRate: 132000,
            purchaseDate: "-",
            totalPurchaseValue: 0,
            totalPurchaseQty: 0,
            totalExpenseValue: 0,
            isMultiBatch: p.isMultiBatch || false
          };
        }
      });
    }

    let result = Object.values(stockMap);

    if (status === "available") {
      result = result.filter((item: any) => item.quantity > 0);
    } else if (status === "out_of_stock") {
      result = result.filter((item: any) => item.quantity === 0);
    }

    // Apply filters (support multi-select comma-separated values)
    if (sellerName && sellerName !== "all" && sellerName !== "") {
      const list = sellerName.split(",").filter(Boolean);
      if (list.length > 0) {
        result = result.filter((item: any) => list.includes(item.sellerName));
      }
    }

    if (rateType && rateType !== "all") {
      result = result.filter((item: any) => item.exchangeRateType === rateType);
    }

    const currencyFilterParam = searchParams.get("currency");
    if (currencyFilterParam && currencyFilterParam !== "all") {
      if (currencyFilterParam === "iqd") {
        result = result.filter((item: any) => item.isIQD || item.currencyCode === "IQD");
      } else if (currencyFilterParam === "usd") {
        result = result.filter((item: any) => !item.isIQD && item.currencyCode !== "IQD");
      }
    }

    if (category && category !== "all" && category !== "") {
      const list = category.split(",").filter(Boolean);
      if (list.length > 0) {
        result = result.filter((item: any) => list.includes(item.category));
      }
    }

    if (brand && brand !== "all" && brand !== "") {
      const list = brand.split(",").filter(Boolean);
      if (list.length > 0) {
        result = result.filter((item: any) => list.includes(item.brand));
      }
    }

    if (warehouseId && warehouseId !== "all" && warehouseId !== "") {
      const list = warehouseId.split(",").map(Number).filter(n => !isNaN(n));
      if (list.length > 0) {
        result = result.filter((item: any) => list.includes(Number(item.warehouseId)));
      }
    }

    if (productId && productId !== "all" && productId !== "") {
      const list = productId.split(",").map(Number).filter(n => !isNaN(n));
      if (list.length > 0) {
        result = result.filter((item: any) => list.includes(Number(item.productId)));
      }
    }

    if (code && code !== "") {
      result = result.filter((item: any) => item.productCode?.toLowerCase().includes(code.toLowerCase()));
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching stock report:", error?.message || error);
    return NextResponse.json({ 
      error: "کێشەیەک ڕوویدا لە هێنانی ڕاپۆرتی کۆگا", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const productId = Number(data.productId);
    const warehouseId = Number(data.warehouseId);
    const cost = Number(data.cost);

    if (isNaN(productId) || isNaN(warehouseId) || isNaN(cost)) {
      return NextResponse.json(
        { error: "داتای نادروست نێردراوە" },
        { status: 400 }
      );
    }

    // Find all incoming transactions for this product and warehouse
    const txs = await prisma.inventoryTransaction.findMany({
      where: {
        productId,
        warehouseId,
        qtyChange: { gt: 0 }
      },
      select: { id: true }
    });

    if (txs.length > 0) {
      await prisma.inventoryTransaction.updateMany({
        where: {
          id: { in: txs.map(t => t.id) }
        },
        data: {
          unitCost: cost
        }
      });
    } else {
      // If no incoming transactions, try to find any transaction to update
      const latestTx = await prisma.inventoryTransaction.findFirst({
        where: {
          productId,
          warehouseId
        },
        orderBy: {
          id: "desc"
        },
        select: { id: true }
      });

      if (latestTx) {
        await prisma.inventoryTransaction.update({
          where: { id: latestTx.id },
          data: { unitCost: cost }
        });
      } else {
        return NextResponse.json(
          { error: "هیچ مامەڵەیەک نەدۆزرایەوە بۆ ئەم کاڵایە لەم کۆگایەدا" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating stock cost:", error);
    return NextResponse.json(
      { error: "Failed to update stock cost", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

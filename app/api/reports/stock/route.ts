import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { calculateWeightedProductCost } from "../../../../lib/inventoryCost";

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

    // Helper to parse comma-separated number values into Prisma-compatible filters
    const parseNumberArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        const list = val.split(",").map(id => parseInt(id)).filter(id => !isNaN(id));
        return list.length > 0 ? { in: list } : undefined;
      }
      const parsed = parseInt(val);
      return isNaN(parsed) ? undefined : parsed;
    };

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
      const parsed = parseNumberArray(warehouseId);
      if (parsed) where.warehouseId = parsed;
    }

    if (productId && productId !== "all" && productId !== "") {
      const parsed = parseNumberArray(productId);
      if (parsed) where.productId = parsed;
    }

    // Exclude expense items (only commercial inventory belongs in stock reports)
    where.product = { ...(where.product || {}), isExpense: false };
    where.voucher = { isDeleted: false };

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
          currencyId: true,
          product: { select: { name: true, code: true, category: true, brand: true, isMultiBatch: true, salePrices: true } },
          warehouse: { select: { name: true } },
          voucher: {
            select: {
              type: true,
              date: true,
              exchangeRate: true,
              account: { select: { id: true, name: true, exchangeRateType: true, customExchangeRate: true } },
              versions: { select: { version: true, data: true } },
              expenses: { select: { amount: true, currencyId: true } },
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
      
      // Determine currency from the stored currencyId (backfilled from voucher)
      const txCurId = (t as any).currencyId ?? voucherCurId;
      const isIQD = txCurId === iqdCur?.id;
      const vRate = (t.voucher as any)?.exchangeRate && (t.voucher as any).exchangeRate > 100
        ? ((t.voucher as any).exchangeRate > 10000 ? (t.voucher as any).exchangeRate / 100 : (t.voucher as any).exchangeRate)
        : marketRatePerDollar;

      // Ensure price is normalized:
      let originalPriceUsd = isIQD ? (rawPrice / vRate) : rawPrice;

      // Extract versionData for fixedRate/customRate
      let versionData: any = {};
      if (t.voucher?.versions && t.voucher.versions.length > 0) {
        const sortedV = [...t.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
        try {
          versionData = JSON.parse(sortedV[sortedV.length - 1].data || "{}");
        } catch (e) {}
      }

      const sellerAcc = t.voucher?.account;
      let rateTypeForProduct = (t.voucher as any)?.exchangeRateType || versionData.exchangeRateType || sellerAcc?.exchangeRateType || "DAILY_MARKET";
      let customRateForProduct = (t.voucher as any)?.customExchangeRate || versionData.customExchangeRate || sellerAcc?.customExchangeRate || 132000;

      if (t.qtyChange > 0 && rawPrice > 0) {
        let effectiveUnitCostUsd = originalPriceUsd;

        // If FIXED exchange rate account:
        if (isIQD && rateTypeForProduct === "FIXED") {
          const fixedRatePerDollar = customRateForProduct > 10000 ? customRateForProduct / 100 : customRateForProduct;
          effectiveUnitCostUsd = rawPrice / fixedRatePerDollar;
        } else if (!isIQD && rateTypeForProduct === "FIXED") {
          // USD item with FIXED rate contract (e.g. 135,000 IQD per 100$)
          // Effective value at daily market dollar = (rawPrice * fixedRatePerDollar) / marketRatePerDollar
          const fixedRatePerDollar = customRateForProduct > 10000 ? customRateForProduct / 100 : customRateForProduct;
          effectiveUnitCostUsd = (rawPrice * fixedRatePerDollar) / marketRatePerDollar;
        }

        // Calculate incoming unit expense
        let unitExpenseRaw = 0;
        if (Number(t.unitCost || 0) > rawPrice && rawPrice > 0) {
          unitExpenseRaw = Number(t.unitCost) - rawPrice;
        } else if (t.voucher?.expenses && t.voucher.expenses.length > 0) {
          const totalLinesQty = t.voucher.lines?.reduce((sum: number, l: any) => sum + Math.max(0, Number(l.qty || 0)), 0) || t.qtyChange;
          let totalExpInBatchCur = 0;
          for (const exp of t.voucher.expenses) {
            const isExpIQD = exp.currencyId === 2 || Number(exp.currencyId) === 2 || Number(exp.currencyId) === 12;
            const amt = Number(exp.amount || 0);
            if (isIQD) {
              totalExpInBatchCur += isExpIQD ? amt : (amt * vRate);
            } else {
              totalExpInBatchCur += isExpIQD ? (amt / vRate) : amt;
            }
          }
          unitExpenseRaw = totalLinesQty > 0 ? (totalExpInBatchCur / totalLinesQty) : 0;
        }
        const unitExpenseUsd = isIQD ? (unitExpenseRaw / vRate) : unitExpenseRaw;

        const qtyIn = t.qtyChange;
        const incomingRawPurchasePrice = isIQD ? rawPrice : originalPriceUsd;
        const incomingPurchasePriceUsd = effectiveUnitCostUsd;

        if (stockMap[key].isMultiBatch) {
          stockMap[key].runningRawPurchasePrice = incomingRawPurchasePrice;
          stockMap[key].runningPurchasePriceUsd = incomingPurchasePriceUsd;
          stockMap[key].runningRawExpense = unitExpenseRaw;
          stockMap[key].runningExpenseUsd = unitExpenseUsd;
          stockMap[key].runningRawCost = incomingRawPurchasePrice + unitExpenseRaw;
          stockMap[key].runningCostUsd = incomingPurchasePriceUsd + unitExpenseUsd;
          stockMap[key].runningOnHandQty = (stockMap[key].runningOnHandQty || 0) + qtyIn;
        } else {
          // Perpetual Moving Average Cost: averages incoming batch with currently available on-hand stock
          const currentOnHand = stockMap[key].runningOnHandQty || 0;
          if (currentOnHand <= 0) {
            stockMap[key].runningRawPurchasePrice = incomingRawPurchasePrice;
            stockMap[key].runningPurchasePriceUsd = incomingPurchasePriceUsd;
            stockMap[key].runningRawExpense = unitExpenseRaw;
            stockMap[key].runningExpenseUsd = unitExpenseUsd;
            stockMap[key].runningRawCost = incomingRawPurchasePrice + unitExpenseRaw;
            stockMap[key].runningCostUsd = incomingPurchasePriceUsd + unitExpenseUsd;
            stockMap[key].runningOnHandQty = qtyIn;
          } else {
            const newOnHand = currentOnHand + qtyIn;
            const newRawPurchasePrice = ((currentOnHand * (stockMap[key].runningRawPurchasePrice || 0)) + (qtyIn * incomingRawPurchasePrice)) / newOnHand;
            const newPurchasePriceUsd = ((currentOnHand * (stockMap[key].runningPurchasePriceUsd || 0)) + (qtyIn * incomingPurchasePriceUsd)) / newOnHand;
            const newRawExpense = ((currentOnHand * (stockMap[key].runningRawExpense || 0)) + (qtyIn * unitExpenseRaw)) / newOnHand;
            const newExpenseUsd = ((currentOnHand * (stockMap[key].runningExpenseUsd || 0)) + (qtyIn * unitExpenseUsd)) / newOnHand;

            stockMap[key].runningOnHandQty = newOnHand;
            stockMap[key].runningRawPurchasePrice = newRawPurchasePrice;
            stockMap[key].runningPurchasePriceUsd = newPurchasePriceUsd;
            stockMap[key].runningRawExpense = newRawExpense;
            stockMap[key].runningExpenseUsd = newExpenseUsd;
            stockMap[key].runningRawCost = newRawPurchasePrice + newRawExpense;
            stockMap[key].runningCostUsd = newPurchasePriceUsd + newExpenseUsd;
          }
        }

        stockMap[key].totalPurchaseValue += (t.qtyChange * effectiveUnitCostUsd);
        stockMap[key].totalPurchaseValueRaw = (stockMap[key].totalPurchaseValueRaw || 0) + (t.qtyChange * (isIQD ? rawPrice : originalPriceUsd));
        stockMap[key].totalPurchaseQty += t.qtyChange;
        stockMap[key].totalExpenseValue += (t.qtyChange * unitExpenseUsd);
        
        stockMap[key].exchangeRateType = rateTypeForProduct;
        stockMap[key].customExchangeRate = customRateForProduct;
        stockMap[key].isIQD = isIQD;
        stockMap[key].currencyCode = isIQD ? "IQD" : "USD";
        stockMap[key].currencySymbol = isIQD ? "دینار" : "$";
        stockMap[key].latestRawPrice = isIQD ? rawPrice : originalPriceUsd;
        stockMap[key].latestCostUsd = effectiveUnitCostUsd + unitExpenseUsd;

        stockMap[key].rawPurchasePrice = stockMap[key].runningRawPurchasePrice;
        stockMap[key].purchasePrice = isIQD ? stockMap[key].runningRawPurchasePrice : stockMap[key].runningPurchasePriceUsd;
        stockMap[key].purchasePriceUsd = stockMap[key].runningPurchasePriceUsd;

        stockMap[key].rawExpense = stockMap[key].runningRawExpense;
        stockMap[key].expense = isIQD ? stockMap[key].runningRawExpense : stockMap[key].runningExpenseUsd;
        stockMap[key].expenseUsd = stockMap[key].runningExpenseUsd;

        stockMap[key].rawCost = stockMap[key].runningRawCost;
        stockMap[key].cost = isIQD ? stockMap[key].runningRawCost : stockMap[key].runningCostUsd;
        stockMap[key].costUsd = stockMap[key].runningCostUsd;

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

    // Calculate standardized perpetual weighted average cost and rate type per product
    const productCostMap = new Map<number, any>();
    const txsByProduct = new Map<number, any[]>();
    transactions.forEach(t => {
      if (!txsByProduct.has(t.productId)) txsByProduct.set(t.productId, []);
      txsByProduct.get(t.productId)!.push(t);
    });
    txsByProduct.forEach((txs, pId) => {
      const isMultiBatch = txs[0]?.product?.isMultiBatch || false;
      productCostMap.set(pId, calculateWeightedProductCost(txs as any, isMultiBatch, marketRatePerDollar));
    });

    Object.values(stockMap).forEach((item: any) => {
      const costInfo = productCostMap.get(item.productId);
      if (costInfo && costInfo.costPrice > 0) {
        const isCostIQD = costInfo.costCurrencyId === 2;
        const isFixed = costInfo.exchangeRateType === "FIXED" && costInfo.customExchangeRate;
        const fixedRate = isFixed ? (costInfo.customExchangeRate > 10000 ? costInfo.customExchangeRate / 100 : costInfo.customExchangeRate) : null;

        const convertToUsd = (val: number) => {
          if (isCostIQD) return val / marketRatePerDollar;
          if (isFixed && fixedRate) return (val * fixedRate) / marketRatePerDollar;
          return val;
        };

        const purchasePriceRaw = costInfo.purchasePrice || costInfo.costPrice;
        const expenseRaw = costInfo.expensePerUnit || 0;
        const costRaw = costInfo.costPrice;

        const purchasePriceUsd = convertToUsd(purchasePriceRaw);
        const expenseUsd = convertToUsd(expenseRaw);
        const costUsd = convertToUsd(costRaw);

        item.purchasePrice = isCostIQD ? purchasePriceRaw : purchasePriceUsd;
        item.purchasePriceUsd = purchasePriceUsd;
        item.rawPurchasePrice = purchasePriceRaw;

        item.expense = isCostIQD ? expenseRaw : expenseUsd;
        item.expenseUsd = expenseUsd;
        item.rawExpense = expenseRaw;

        item.cost = isCostIQD ? costRaw : costUsd;
        item.costUsd = costUsd;
        item.rawCost = costRaw;

        item.isIQD = isCostIQD;
        item.currencyCode = isCostIQD ? "IQD" : "USD";
        item.currencySymbol = isCostIQD ? "دینار" : "$";
        item.exchangeRateType = costInfo.exchangeRateType;
        item.customExchangeRate = costInfo.customExchangeRate;
      } else if (!item.cost || item.cost === 0) {
        const txWithCost = transactions.find(
          (t: any) => t.productId === item.productId && t.unitCost && t.unitCost > 0
        );
        if (txWithCost) {
          const isIQD = item.isIQD;
          const isFixed = item.exchangeRateType === "FIXED" && item.customExchangeRate;
          let costUsd = txWithCost.unitCost;
          if (isIQD) {
            costUsd = txWithCost.unitCost / marketRatePerDollar;
          } else if (isFixed) {
            const fixedRate = item.customExchangeRate > 10000 ? item.customExchangeRate / 100 : item.customExchangeRate;
            costUsd = (txWithCost.unitCost * fixedRate) / marketRatePerDollar;
          }
          item.purchasePrice = txWithCost.unitCost;
          item.expense = 0;
          item.rawExpense = 0;
          item.expenseUsd = 0;
          item.cost = txWithCost.unitCost;
          item.costUsd = costUsd;
          item.purchasePriceUsd = costUsd;
          item.rawCost = txWithCost.unitCost;
          item.rawPurchasePrice = txWithCost.unitCost;
        }
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
    const currentUser = await getCurrentUser();
    const data = await request.json();
    const productId = Number(data.productId);
    const warehouseId = Number(data.warehouseId);
    const cost = Number(data.cost);
    const reason = data.reason ? String(data.reason).trim() : "";

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
        qtyChange: { gt: 0 },
        voucher: { isDeleted: false }
      },
      include: {
        voucher: {
          include: { versions: { select: { version: true } } }
        }
      }
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

      // Record reason and version on the latest incoming voucher
      const latestTx = txs[txs.length - 1];
      if (latestTx?.voucherId) {
        if (reason) {
          await prisma.voucher.update({
            where: { id: latestTx.voucherId },
            data: { internalNote: reason }
          });
        }
        const currentVersions = latestTx.voucher?.versions || [];
        const nextVersion = currentVersions.length > 0
          ? Math.max(...currentVersions.map(v => v.version)) + 1
          : 1;

        await prisma.voucherVersion.create({
          data: {
            voucherId: latestTx.voucherId,
            version: nextVersion,
            employeeName: currentUser?.name || "سیستەم",
            data: JSON.stringify({
              action: "cost_update",
              oldCost: latestTx.unitCost,
              newCost: cost,
              reason: reason || "دەستکاری دەستی کۆست",
              updatedAt: new Date().toISOString()
            })
          }
        });
      }
    } else {
      // If no incoming transactions, try to find any transaction to update
      const latestTx = await prisma.inventoryTransaction.findFirst({
        where: {
          productId,
          warehouseId,
          voucher: { isDeleted: false }
        },
        orderBy: {
          id: "desc"
        },
        include: {
          voucher: {
            include: { versions: { select: { version: true } } }
          }
        }
      });

      if (latestTx) {
        await prisma.inventoryTransaction.update({
          where: { id: latestTx.id },
          data: { unitCost: cost }
        });

        if (latestTx.voucherId) {
          if (reason) {
            await prisma.voucher.update({
              where: { id: latestTx.voucherId },
              data: { internalNote: reason }
            });
          }
          const currentVersions = latestTx.voucher?.versions || [];
          const nextVersion = currentVersions.length > 0
            ? Math.max(...currentVersions.map(v => v.version)) + 1
            : 1;

          await prisma.voucherVersion.create({
            data: {
              voucherId: latestTx.voucherId,
              version: nextVersion,
              employeeName: currentUser?.name || "سیستەم",
              data: JSON.stringify({
                action: "cost_update",
                oldCost: latestTx.unitCost,
                newCost: cost,
                reason: reason || "دەستکاری دەستی کۆست",
                updatedAt: new Date().toISOString()
              })
            }
          });
        }
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

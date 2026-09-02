import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { getCalculatedWarehouseValueInUsd } from "../../../../lib/stockValue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // Parse filters as comma-separated lists
    const parseCommaSeparatedNumbers = (val: string | null): number[] | null => {
      if (!val || val === "all") return null;
      return val.split(",").map(v => Number(v.trim())).filter(n => !isNaN(n));
    };

    const parseCommaSeparatedStrings = (val: string | null): string[] | null => {
      if (!val || val === "all") return null;
      return val.split(",").map(v => v.trim()).filter(Boolean);
    };

    const accountIds = parseCommaSeparatedNumbers(searchParams.get("accountId"));
    const accountTypeIds = parseCommaSeparatedNumbers(searchParams.get("accountTypeId"));
    const brands = parseCommaSeparatedStrings(searchParams.get("brand"));
    const categories = parseCommaSeparatedStrings(searchParams.get("category"));
    const productIds = parseCommaSeparatedNumbers(searchParams.get("productId"));
    const warehouseIds = parseCommaSeparatedNumbers(searchParams.get("warehouseId"));
    const createdBys = parseCommaSeparatedStrings(searchParams.get("createdBy"));

    const dateFilter: any = {};
    if (startDate) {
      const [y, m, d] = startDate.split('-');
      dateFilter.gte = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    }
    if (endDate) {
      const [y, m, d] = endDate.split('-');
      dateFilter.lte = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
    }

    const whereClause: any = {
      isDeleted: false,
      type: {
        in: [
          "sales",
          "sales_return",
          "my_debt_discount",
          "people_debt_discount",
          "داشکاندنم بۆ کراوە",
          "داشکاندنم کردوە",
          "expense",
          "gift",
          "warehouse_damage",
          "خەسارەی کۆگا",
          "material_issue",
          "سەرفی مواد",
          "warehouse_stock",
          "جەردی کۆگا",
          "money_in",
          "money_out"
        ]
      }
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter;
    }

    const [vouchers, currencies, ledgerAggs, cashboxBalances, inventoryTrans, dbProducts, dbAccounts] = await Promise.all([
      prisma.voucher.findMany({
        where: whereClause,
        select: {
          type: true,
          netAmount: true,
          totalAmount: true,
          totalDiscount: true,
          currencyId: true,
          exchangeRate: true,
          accountId: true,
          employeeName: true,
          account: {
            select: { accountTypeId: true }
          },
          inventoryTransactions: {
            select: { qtyChange: true, unitCost: true, warehouseId: true, productId: true },
          },
          lines: {
            select: { productId: true, qty: true, lineTotal: true, currencyId: true },
          },
        },
      }),
      prisma.currency.findMany({ where: { isActive: true } }),
      prisma.ledgerEntry.groupBy({
        by: ["accountId", "currencyId"],
        where: { voucher: { isDeleted: false } },
        _sum: { debit: true, credit: true }
      }),
      prisma.cashboxBalance.findMany({
        include: { cashbox: true }
      }),
      prisma.inventoryTransaction.findMany({
        where: {
          ...(endDate ? { date: { lte: dateFilter.lte } } : {}),
          voucher: { isDeleted: false },
        },
        select: {
          productId: true,
          qtyChange: true,
          unitCost: true,
          warehouseId: true,
          currencyId: true,
          product: { select: { isMultiBatch: true } },
          voucher: {
            select: {
              currencyId: true,
              exchangeRate: true,
              account: { select: { exchangeRateType: true, customExchangeRate: true } },
              versions: { select: { version: true, data: true } }
            }
          }
        }
      }),
      prisma.product.findMany(),
      prisma.account.findMany()
    ]);

    const usdCurrency = currencies.find(c => c.code === "USD");
    const usdId = usdCurrency ? usdCurrency.id : 1;

    const iqdCur = currencies.find(c => c.code === "IQD" || c.id === 2);
    const iqdId = iqdCur?.id || 2;
    const rawRate = iqdCur?.rate || 1520;
    const marketRatePerDollar = rawRate > 10000 ? rawRate / 100 : (rawRate > 100 ? rawRate : 1520);

    const displayCurrencyId = Number(searchParams.get("currencyId") || usdId);
    const targetCurrency = currencies.find(c => c.id === displayCurrencyId);
    const targetRate = targetCurrency ? targetCurrency.rate : 1.0;

    const convertToTarget = (amount: number, fromCurrencyId: number) => {
      const fromCur = currencies.find(c => c.id === fromCurrencyId);
      const fromRate = fromCur ? fromCur.rate : 1.0;
      const usdAmount = amount / fromRate;
      return usdAmount * targetRate;
    };

    const convertVoucherToTarget = (amount: number, voucherCurId: number, exchangeRate: number) => {
      if (voucherCurId === usdId) return amount * targetRate;
      let rate = exchangeRate || 1500;
      if (rate > 10000) rate = rate / 100; // 155000 -> 1550
      if (rate < 10) rate = rate * 100;    // 15.5 -> 1550
      const usdAmount = amount / rate;
      return usdAmount * targetRate;
    };

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    const accountMap = new Map(dbAccounts.map(a => [a.id, a]));

    const matchesProductFilters = (prodId: number) => {
      const prod = productMap.get(prodId);
      if (productIds && !productIds.includes(prodId)) return false;
      if (categories && (!prod || !prod.category || !categories.includes(prod.category))) return false;
      if (brands && (!prod || !prod.brand || !brands.includes(prod.brand))) return false;
      return true;
    };

    let totalSales = 0;
    let totalCOGS = 0;
    let totalMyDebtDiscount = 0;
    let totalPeopleDebtDiscount = 0;
    let totalExpenses = 0;
    let totalGifts = 0;
    let totalLosses = 0;

    // Build fixed-rate map from purchase transactions
    const productFixedRates: Record<number, number> = {};
    inventoryTrans.forEach((t: any) => {
      if (t.qtyChange > 0 && t.unitCost > 0) {
        const sellerAcc = (t.voucher as any)?.account;
        let rateType = sellerAcc?.exchangeRateType;
        let customRate = sellerAcc?.customExchangeRate;

        // Also check version data for overrides
        const versions = (t.voucher as any)?.versions;
        if (versions && versions.length > 0) {
          const sorted = [...versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
          try {
            const vData = JSON.parse(sorted[sorted.length - 1].data);
            if (vData.exchangeRateType) rateType = vData.exchangeRateType;
            if (vData.customExchangeRate) customRate = vData.customExchangeRate;
          } catch(e) {}
        }

        if (rateType === "FIXED" && customRate) {
          productFixedRates[t.productId] = customRate > 10000 ? customRate / 100 : customRate;
        }
      }
    });

    const productPurchaseStats: Record<number, { runningCostUSD: number, runningOnHandQty: number, latestCost: number, isMultiBatch: boolean }> = {};
    // Fixed-rate products: cost tracked in IQD
    const fixedPurchaseStats: Record<number, { runningCostIQD: number, runningOnHandQty: number, latestCost: number, isMultiBatch: boolean }> = {};

    inventoryTrans.forEach((t: any) => {
      const matchesWarehouse = !warehouseIds || warehouseIds.includes(t.warehouseId);
      const matchesProduct = matchesProductFilters(t.productId);
      if (!matchesWarehouse || !matchesProduct) return;

      const pId = t.productId;
      const isMultiBatch = t.product?.isMultiBatch || false;
      const isCostIQD = t.unitCost > 500;
      const fixedRate = productFixedRates[pId];

      const vRate = (t.voucher as any)?.exchangeRate && (t.voucher as any).exchangeRate > 100
        ? ((t.voucher as any).exchangeRate > 10000 ? (t.voucher as any).exchangeRate / 100 : (t.voucher as any).exchangeRate)
        : marketRatePerDollar;

      if (t.qtyChange > 0 && t.unitCost > 0) {
        const qtyIn = t.qtyChange;

        // Fixed-rate product (cost in USD but with fixed IQD rate)
        if (fixedRate && !isCostIQD) {
          if (!fixedPurchaseStats[pId]) {
            fixedPurchaseStats[pId] = { runningCostIQD: 0, runningOnHandQty: 0, latestCost: 0, isMultiBatch };
          }
          const costIQD = t.unitCost * fixedRate;
          fixedPurchaseStats[pId].latestCost = costIQD;

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
          // Regular product
          if (!productPurchaseStats[pId]) {
            productPurchaseStats[pId] = { runningCostUSD: 0, runningOnHandQty: 0, latestCost: 0, isMultiBatch };
          }
          const effectiveUnitCostUsd = isCostIQD ? (t.unitCost / vRate) : t.unitCost;
          productPurchaseStats[pId].latestCost = effectiveUnitCostUsd;

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
        if (fixedPurchaseStats[pId]) {
          fixedPurchaseStats[pId].runningOnHandQty += t.qtyChange;
        }
        if (productPurchaseStats[pId]) {
          productPurchaseStats[pId].runningOnHandQty += t.qtyChange;
        }
      }
    });

    const productCosts: Record<number, number> = {};
    for (const [pId, stats] of Object.entries(productPurchaseStats)) {
      productCosts[Number(pId)] = stats.isMultiBatch ? stats.latestCost : stats.runningCostUSD;
    }

    // Fixed-rate products: cost stored in IQD
    const fixedCostIQD: Record<number, number> = {};
    for (const [pId, stats] of Object.entries(fixedPurchaseStats)) {
      fixedCostIQD[Number(pId)] = stats.isMultiBatch ? stats.latestCost : stats.runningCostIQD;
    }

    dbProducts.forEach((p: any) => {
      if (productCosts[p.id] === undefined) {
        const rawCost = p.costPrice || 0;
        const isCostIQD = rawCost > 500;
        productCosts[p.id] = isCostIQD ? (rawCost / marketRatePerDollar) : rawCost;
      }
    });

    vouchers.forEach((v: any) => {
      // Apply voucher-level filters
      if (createdBys && !createdBys.includes(v.employeeName)) return;
      if (accountIds && !accountIds.includes(v.accountId)) return;
      if (accountTypeIds && (!v.account || !accountTypeIds.includes(v.account.accountTypeId))) return;

      const amount = convertVoucherToTarget(v.netAmount, v.currencyId || usdId, v.exchangeRate);

      const getItemCostUsdForVoucher = (productId: number, rawCost?: number, rawCurId?: number) => {
        // Check if product has fixed-rate IQD cost
        const fixedIQD = fixedCostIQD[productId];
        if (fixedIQD !== undefined && fixedIQD > 0) {
          // Convert IQD cost to USD at market rate
          return fixedIQD / marketRatePerDollar;
        }

        let cost = productCosts[productId];
        if (cost === undefined || cost === null || cost === 0) {
          if (rawCost && rawCost > 0) {
            const isIQD = rawCost > 500;
            const vRate = (v.exchangeRate && v.exchangeRate > 100)
              ? (v.exchangeRate > 10000 ? v.exchangeRate / 100 : v.exchangeRate)
              : marketRatePerDollar;
            cost = isIQD ? (rawCost / vRate) : rawCost;
          }
        }
        return cost || 0;
      };

      if (v.type === "sales") {
        let voucherSalesAmount = 0;
        let cogs = 0;
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;

        if (hasProductFilter || hasWarehouseFilter) {
          const discountFactor = v.totalAmount > 0 ? (v.netAmount / v.totalAmount) : 1;
          
          if (v.lines) {
            v.lines.forEach((line: any) => {
              if (matchesProductFilters(line.productId)) {
                if (hasWarehouseFilter) {
                  const hasTxInWarehouse = v.inventoryTransactions?.some((tx: any) => tx.productId === line.productId && warehouseIds!.includes(tx.warehouseId));
                  if (!hasTxInWarehouse) return;
                }
                voucherSalesAmount += line.lineTotal * discountFactor;
              }
            });
          }

          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              if (matchesProductFilters(tx.productId)) {
                if (!hasWarehouseFilter || warehouseIds!.includes(tx.warehouseId)) {
                  const costUsd = getItemCostUsdForVoucher(tx.productId, tx.unitCost, tx.currencyId);
                  cogs += Math.abs(tx.qtyChange) * costUsd;
                }
              }
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              if (matchesProductFilters(line.productId)) {
                if (hasWarehouseFilter) {
                  const hasTxInWarehouse = v.inventoryTransactions?.some((tx: any) => tx.productId === line.productId && warehouseIds!.includes(tx.warehouseId));
                  if (!hasTxInWarehouse) return;
                }
                const costUsd = getItemCostUsdForVoucher(line.productId);
                cogs += line.qty * costUsd;
              }
            });
          }
          
          totalSales += convertVoucherToTarget(voucherSalesAmount, v.currencyId || usdId, v.exchangeRate);
          totalCOGS += convertToTarget(cogs, usdId);
        } else {
          totalSales += amount;
          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              const costUsd = getItemCostUsdForVoucher(tx.productId, tx.unitCost, tx.currencyId);
              cogs += Math.abs(tx.qtyChange) * costUsd;
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              const costUsd = getItemCostUsdForVoucher(line.productId);
              cogs += line.qty * costUsd;
            });
          }
          totalCOGS += convertToTarget(cogs, usdId);
        }
      } else if (v.type === "sales_return") {
        let voucherSalesAmount = 0;
        let cogs = 0;
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;

        if (hasProductFilter || hasWarehouseFilter) {
          const discountFactor = v.totalAmount > 0 ? (v.netAmount / v.totalAmount) : 1;
          
          if (v.lines) {
            v.lines.forEach((line: any) => {
              if (matchesProductFilters(line.productId)) {
                if (hasWarehouseFilter) {
                  const hasTxInWarehouse = v.inventoryTransactions?.some((tx: any) => tx.productId === line.productId && warehouseIds!.includes(tx.warehouseId));
                  if (!hasTxInWarehouse) return;
                }
                voucherSalesAmount += line.lineTotal * discountFactor;
              }
            });
          }

          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              if (matchesProductFilters(tx.productId)) {
                if (!hasWarehouseFilter || warehouseIds!.includes(tx.warehouseId)) {
                  const costUsd = getItemCostUsdForVoucher(tx.productId, tx.unitCost, tx.currencyId);
                  cogs += Math.abs(tx.qtyChange) * costUsd;
                }
              }
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              if (matchesProductFilters(line.productId)) {
                if (hasWarehouseFilter) {
                  const hasTxInWarehouse = v.inventoryTransactions?.some((tx: any) => tx.productId === line.productId && warehouseIds!.includes(tx.warehouseId));
                  if (!hasTxInWarehouse) return;
                }
                const costUsd = getItemCostUsdForVoucher(line.productId);
                cogs += line.qty * costUsd;
              }
            });
          }
          
          totalSales -= convertVoucherToTarget(voucherSalesAmount, v.currencyId || usdId, v.exchangeRate);
          totalCOGS -= convertToTarget(cogs, usdId);
        } else {
          totalSales -= amount;
          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              const costUsd = getItemCostUsdForVoucher(tx.productId, tx.unitCost, tx.currencyId);
              cogs += Math.abs(tx.qtyChange) * costUsd;
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              const costUsd = getItemCostUsdForVoucher(line.productId);
              cogs += line.qty * costUsd;
            });
          }
          totalCOGS -= convertToTarget(cogs, usdId);
        }
      } else if (v.type === "my_debt_discount" || v.type === "داشکاندنم بۆ کراوە") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        if (!hasProductFilter && !hasWarehouseFilter) {
          totalMyDebtDiscount += amount;
        }
      } else if (v.type === "people_debt_discount" || v.type === "داشکاندنم کردوە") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        if (!hasProductFilter && !hasWarehouseFilter) {
          totalPeopleDebtDiscount += amount;
        }
      } else if (v.type === "money_in") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        if (!hasProductFilter && !hasWarehouseFilter) {
          totalPeopleDebtDiscount += convertVoucherToTarget(v.totalDiscount || 0, v.currencyId || usdId, v.exchangeRate);
        }
      } else if (v.type === "money_out") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        if (!hasProductFilter && !hasWarehouseFilter) {
          totalMyDebtDiscount += convertVoucherToTarget(v.totalDiscount || 0, v.currencyId || usdId, v.exchangeRate);
        }
      } else if (v.type === "expense") {
        if (productIds !== null || categories !== null || brands !== null) {
          let matchedAmount = 0;
          if (v.lines) {
            const discountFactor = v.totalAmount > 0 ? (v.netAmount / v.totalAmount) : 1;
            v.lines.forEach((line: any) => {
              if (matchesProductFilters(line.productId)) {
                matchedAmount += line.lineTotal * discountFactor;
              }
            });
          }
          totalExpenses += convertVoucherToTarget(matchedAmount, v.currencyId || usdId, v.exchangeRate);
        } else {
          totalExpenses += amount;
        }
      } else if (v.type === "gift") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        if (!hasProductFilter) {
          totalGifts += amount;
        }
      } else if (v.type === "warehouse_damage" || v.type === "خەسارەی کۆگا" || v.type === "material_issue" || v.type === "سەرفی مواد") {
        let losses = 0;
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        
        if (hasProductFilter || hasWarehouseFilter) {
          if (v.inventoryTransactions) {
            v.inventoryTransactions.forEach((tx: any) => {
              if (matchesProductFilters(tx.productId)) {
                if (!hasWarehouseFilter || warehouseIds!.includes(tx.warehouseId)) {
                  losses += Math.abs(tx.qtyChange) * tx.unitCost;
                }
              }
            });
          }
          totalLosses += convertVoucherToTarget(losses, v.currencyId || usdId, v.exchangeRate);
        } else {
          totalLosses += amount;
        }
      }
    });

    const salesProfit = totalSales - totalCOGS;
    const finalProfit = salesProfit + totalMyDebtDiscount - totalExpenses - totalGifts - totalPeopleDebtDiscount - totalLosses;

    let totalCash = 0;
    let totalBank = 0;
    cashboxBalances.forEach((b: any) => {
      const amount = convertToTarget(b.amount, b.currencyId);
      if (b.cashbox.type === "bank") {
        totalBank += amount;
      } else {
        totalCash += amount;
      }
    });

    const shareholderAccounts = await prisma.account.findMany({
      where: { isShareholder: true },
      select: { id: true }
    });
    const shareholderIds = new Set(shareholderAccounts.map(a => a.id));

    const accountNetBalances: Record<number, number> = {};
    ledgerAggs.forEach((agg: any) => {
      const acc = accountMap.get(agg.accountId);
      if (!acc) return;
      if (acc.isShareholder) return; // Exclude shareholder accounts

      // Apply account filters
      if (accountIds && !accountIds.includes(agg.accountId)) return;
      if (accountTypeIds && !accountTypeIds.includes(acc.accountTypeId)) return;

      const cur = currencies.find(c => c.id === agg.currencyId);
      const rate = cur ? cur.rate : 1.0;
      const amount = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      const usdAmount = amount / rate;
      accountNetBalances[agg.accountId] = (accountNetBalances[agg.accountId] || 0) + usdAmount;
    });

    let totalReceivables = 0;
    let totalPayables = 0;
    Object.values(accountNetBalances).forEach(usdBal => {
      if (usdBal > 0.01) {
        totalReceivables += usdBal * targetRate;
      } else if (usdBal < -0.01) {
        totalPayables += Math.abs(usdBal) * targetRate;
      }
    });

    const totalWarehouseValueInUsd = await getCalculatedWarehouseValueInUsd(endDate ? dateFilter.lte : undefined);
    const totalWarehouseValue = totalWarehouseValueInUsd * targetRate;

    return NextResponse.json({
      sales: totalSales,
      cogs: totalCOGS,
      salesProfit,
      myDebtDiscount: totalMyDebtDiscount,
      expenses: totalExpenses,
      gifts: totalGifts,
      peopleDebtDiscount: totalPeopleDebtDiscount,
      losses: totalLosses,
      finalProfit,
      receivables: totalReceivables,
      payables: totalPayables,
      cash: totalCash,
      bank: totalBank,
      warehouseValue: totalWarehouseValue,
      currencyCode: targetCurrency?.code || "USD",
      currencySymbol: targetCurrency?.symbol || "$",
    });
  } catch (error) {
    console.error("Error generating profit report:", error);
    return NextResponse.json(
      { error: "Failed to generate profit report" },
      { status: 500 }
    );
  }
}

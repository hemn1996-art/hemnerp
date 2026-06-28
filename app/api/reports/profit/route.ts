import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
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
      type: {
        in: [
          "sales",
          "sales_return",
          "my_debt_discount",
          "people_debt_discount",
          "داشکاندن لە قەرزی من",
          "داشکاندن لە قەرزی خەڵک",
          "expense",
          "gift",
          "warehouse_damage",
          "خەسارەی کۆگا",
          "material_issue",
          "سەرفی مواد",
          "warehouse_stock",
          "جەردی کۆگا",
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
        _sum: { debit: true, credit: true }
      }),
      prisma.cashboxBalance.findMany({
        include: { cashbox: true }
      }),
      prisma.inventoryTransaction.findMany({
        where: endDate ? { date: { lte: dateFilter.lte } } : undefined,
        select: { productId: true, qtyChange: true, unitCost: true, warehouseId: true, product: { select: { isMultiBatch: true } } }
      }),
      prisma.product.findMany(),
      prisma.account.findMany()
    ]);

    const usdCurrency = currencies.find(c => c.code === "USD");
    const usdId = usdCurrency ? usdCurrency.id : 1;

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
      const rate = voucherCurId === usdId ? 1.0 : exchangeRate || 1500;
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

    // Calculate the cost for every product
    const productPurchaseStats: Record<number, { totalValue: number, totalQty: number, latestCost: number, isMultiBatch: boolean }> = {};
    inventoryTrans.forEach((t: any) => {
      const matchesWarehouse = !warehouseIds || warehouseIds.includes(t.warehouseId);
      const matchesProduct = matchesProductFilters(t.productId);
      
      if (matchesWarehouse && matchesProduct && t.qtyChange > 0 && t.unitCost > 0) {
        if (!productPurchaseStats[t.productId]) {
          productPurchaseStats[t.productId] = { totalValue: 0, totalQty: 0, latestCost: 0, isMultiBatch: t.product?.isMultiBatch || false };
        }
        productPurchaseStats[t.productId].totalValue += (t.qtyChange * t.unitCost);
        productPurchaseStats[t.productId].totalQty += t.qtyChange;
        productPurchaseStats[t.productId].latestCost = t.unitCost;
      }
    });

    const productCosts: Record<number, number> = {};
    for (const [pId, stats] of Object.entries(productPurchaseStats)) {
      if (stats.isMultiBatch) {
        productCosts[Number(pId)] = stats.latestCost;
      } else {
        productCosts[Number(pId)] = stats.totalQty > 0 ? (stats.totalValue / stats.totalQty) : 0;
      }
    }

    vouchers.forEach((v: any) => {
      // Apply voucher-level filters
      if (createdBys && !createdBys.includes(v.employeeName)) return;
      if (accountIds && !accountIds.includes(v.accountId)) return;
      if (accountTypeIds && (!v.account || !accountTypeIds.includes(v.account.accountTypeId))) return;

      const amount = convertVoucherToTarget(v.netAmount, v.currencyId || usdId, v.exchangeRate);

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
                  cogs += Math.abs(tx.qtyChange) * tx.unitCost;
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
                const cost = productCosts[line.productId] || 0;
                cogs += line.qty * cost;
              }
            });
          }
          
          totalSales += convertVoucherToTarget(voucherSalesAmount, v.currencyId || usdId, v.exchangeRate);
          totalCOGS += convertToTarget(cogs, usdId);
        } else {
          totalSales += amount;
          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              cogs += Math.abs(tx.qtyChange) * tx.unitCost;
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              const cost = productCosts[line.productId] || 0;
              cogs += line.qty * cost;
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
                  cogs += Math.abs(tx.qtyChange) * tx.unitCost;
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
                const cost = productCosts[line.productId] || 0;
                cogs += line.qty * cost;
              }
            });
          }
          
          totalSales -= convertVoucherToTarget(voucherSalesAmount, v.currencyId || usdId, v.exchangeRate);
          totalCOGS -= convertToTarget(cogs, usdId);
        } else {
          totalSales -= amount;
          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              cogs += Math.abs(tx.qtyChange) * tx.unitCost;
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              const cost = productCosts[line.productId] || 0;
              cogs += line.qty * cost;
            });
          }
          totalCOGS -= convertToTarget(cogs, usdId);
        }
      } else if (v.type === "my_debt_discount" || v.type === "داشکاندن لە قەرزی من") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        if (!hasProductFilter && !hasWarehouseFilter) {
          totalMyDebtDiscount += amount;
        }
      } else if (v.type === "people_debt_discount" || v.type === "داشکاندن لە قەرزی خەڵک") {
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;
        if (!hasProductFilter && !hasWarehouseFilter) {
          totalPeopleDebtDiscount += amount;
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
          totalLosses += convertToTarget(losses, usdId);
        } else {
          totalLosses += amount;
        }
      } else if (v.type === "warehouse_stock" || v.type === "جەردی کۆگا") {
        let adjustmentValue = 0;
        const hasProductFilter = productIds !== null || categories !== null || brands !== null;
        const hasWarehouseFilter = warehouseIds !== null;

        if (hasProductFilter || hasWarehouseFilter) {
          if (v.inventoryTransactions) {
            v.inventoryTransactions.forEach((tx: any) => {
              if (matchesProductFilters(tx.productId)) {
                if (!hasWarehouseFilter || warehouseIds!.includes(tx.warehouseId)) {
                  adjustmentValue -= tx.qtyChange * tx.unitCost;
                }
              }
            });
          }
          totalLosses += convertToTarget(adjustmentValue, usdId);
        } else {
          if (v.inventoryTransactions && v.inventoryTransactions.length > 0) {
            v.inventoryTransactions.forEach((tx: any) => {
              adjustmentValue -= tx.qtyChange * tx.unitCost;
            });
          } else if (v.lines) {
            v.lines.forEach((line: any) => {
              const cost = productCosts[line.productId] || 0;
              adjustmentValue -= line.qty * cost;
            });
          }
          totalLosses += convertToTarget(adjustmentValue, usdId);
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

    const productStock: Record<number, number> = {};
    inventoryTrans.forEach(t => {
      const matchesWarehouse = !warehouseIds || warehouseIds.includes(t.warehouseId);
      const matchesProduct = matchesProductFilters(t.productId);
      if (matchesWarehouse && matchesProduct) {
        productStock[t.productId] = (productStock[t.productId] || 0) + t.qtyChange * t.unitCost;
      }
    });
    const totalWarehouseValueInUsd = Object.values(productStock).reduce((s, v) => s + v, 0);
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

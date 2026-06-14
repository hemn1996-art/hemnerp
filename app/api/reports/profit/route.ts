import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
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
          "expense",
          "gift",
          "warehouse_damage",
          "خەسارەی کۆگا",
        ]
      }
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter;
    }

    const [vouchers, currencies, ledgerAggs, cashboxBalances, inventoryTrans] = await Promise.all([
      prisma.voucher.findMany({
        where: whereClause,
        select: {
          type: true,
          netAmount: true,
          currencyId: true,
          exchangeRate: true,
          inventoryTransactions: {
            select: { qtyChange: true, unitCost: true },
          },
          lines: {
            select: { productId: true, qty: true },
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
        select: { productId: true, qtyChange: true, unitCost: true }
      })
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

    let totalSales = 0;
    let totalCOGS = 0;
    let totalMyDebtDiscount = 0;
    let totalPeopleDebtDiscount = 0;
    let totalExpenses = 0;
    let totalGifts = 0;
    let totalLosses = 0;

    // Calculate the latest purchase cost for every product
    const productCosts: Record<number, number> = {};
    inventoryTrans.forEach((t) => {
      if (t.qtyChange > 0 && t.unitCost > 0) {
        productCosts[t.productId] = t.unitCost;
      }
    });

    vouchers.forEach((v: any) => {
      const amount = convertVoucherToTarget(v.netAmount, v.currencyId || usdId, v.exchangeRate);

      if (v.type === "sales") {
        totalSales += amount;
        let cogs = 0;
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
      } else if (v.type === "sales_return") {
        totalSales -= amount;
        let cogs = 0;
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
      } else if (v.type === "my_debt_discount") {
        totalMyDebtDiscount += amount;
      } else if (v.type === "people_debt_discount") {
        totalPeopleDebtDiscount += amount;
      } else if (v.type === "expense") {
        totalExpenses += amount;
      } else if (v.type === "gift") {
        totalGifts += amount;
      } else if (v.type === "warehouse_damage" || v.type === "خەسارەی کۆگا") {
        totalLosses += amount;
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

    const accountNetBalances: Record<number, number> = {};
    ledgerAggs.forEach((agg: any) => {
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
      productStock[t.productId] = (productStock[t.productId] || 0) + t.qtyChange * t.unitCost;
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

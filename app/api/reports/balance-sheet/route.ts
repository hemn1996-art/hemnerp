import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get("asOfDate") || new Date().toISOString().split("T")[0];
    const currencyId = searchParams.get("currencyId");

    const dateFilter = new Date(asOfDate);
    dateFilter.setHours(23, 59, 59, 999);

    const currencyWhere = currencyId && currencyId !== "all" ? { currencyId: parseInt(currencyId) } : {};

    // Run ALL database queries in parallel for maximum speed
    const [cashboxBalances, inventoryTrans, ledgerAggs, salesVouchers, purchaseVouchers] = await Promise.all([
      // 1. Cash balances
      prisma.cashboxBalance.findMany({
        where: currencyWhere,
        select: { amount: true },
      }),
      // 2. Inventory transactions
      prisma.inventoryTransaction.findMany({
        where: { date: { lte: dateFilter } },
        select: { productId: true, qtyChange: true, unitCost: true },
      }),
      // 3. Ledger aggregation by account (server-side)
      prisma.ledgerEntry.groupBy({
        by: ["accountId"],
        where: {
          date: { lte: dateFilter },
          ...(currencyId && currencyId !== "all" ? { currencyId: parseInt(currencyId) } : {}),
        },
        _sum: { debit: true, credit: true },
      }),
      // 4. Sales vouchers
      prisma.voucher.findMany({
        where: {
          type: { in: ["sales", "sales_return"] },
          date: { lte: dateFilter },
          ...(currencyId && currencyId !== "all" ? { currencyId: parseInt(currencyId) } : {}),
        },
        select: { type: true, netAmount: true },
      }),
      // 5. Purchase vouchers
      prisma.voucher.findMany({
        where: {
          type: { in: ["purchase", "purchase_return"] },
          date: { lte: dateFilter },
          ...(currencyId && currencyId !== "all" ? { currencyId: parseInt(currencyId) } : {}),
        },
        select: { type: true, netAmount: true },
      }),
    ]);

    // Calculate totals
    const totalCash = cashboxBalances.reduce((s, b) => s + b.amount, 0);

    // Inventory value
    const productStock: Record<number, number> = {};
    inventoryTrans.forEach(t => {
      productStock[t.productId] = (productStock[t.productId] || 0) + t.qtyChange * t.unitCost;
    });
    const warehouseValue = Object.values(productStock).reduce((s, v) => s + v, 0);

    // Accounts receivable / payable from aggregated ledger
    let accountsReceivable = 0;
    let accountsPayable = 0;
    for (const agg of ledgerAggs) {
      const balance = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      if (balance > 0) accountsReceivable += balance;
      else if (balance < 0) accountsPayable += Math.abs(balance);
    }

    const totalAssets = totalCash + warehouseValue + accountsReceivable;

    // Profit calculation
    const salesTotal = salesVouchers.reduce((s, v) => {
      return v.type === "sales" ? s + v.netAmount : s - v.netAmount;
    }, 0);

    const purchaseTotal = purchaseVouchers.reduce((s, v) => {
      return v.type === "purchase" ? s + v.netAmount : s - v.netAmount;
    }, 0);

    const annualProfit = salesTotal - purchaseTotal;
    const currentLiabilities = accountsPayable;
    const capital = totalAssets - annualProfit - currentLiabilities;
    const withdrawals = 0;
    const totalLiabilitiesEquity = currentLiabilities + capital + annualProfit + withdrawals;

    return NextResponse.json({
      asOfDate,
      assets: {
        currentAssets: totalCash,
        cash: totalCash,
        warehouseValue,
        accountsReceivable,
        otherAssets: 0,
        allInventory: 0,
        total: totalAssets,
      },
      liabilitiesEquity: {
        currentLiabilities,
        myDebts: accountsPayable,
        capital,
        annualProfit,
        withdrawals,
        total: totalLiabilitiesEquity,
      }
    });
  } catch (error) {
    console.error("Error fetching balance sheet:", error);
    return NextResponse.json({ error: "Failed to fetch balance sheet" }, { status: 500 });
  }
}

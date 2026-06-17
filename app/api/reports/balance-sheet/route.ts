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

    // Run database queries in parallel
    const [cashboxBalances, inventoryTrans, ledgerAggs, vouchers, currencies] = await Promise.all([
      // 1. Cash balances
      prisma.cashboxBalance.findMany({
        select: { amount: true, currencyId: true },
      }),
      // 2. Inventory transactions
      prisma.inventoryTransaction.findMany({
        where: { date: { lte: dateFilter } },
        select: { productId: true, qtyChange: true, unitCost: true },
      }),
      // 3. Ledger entry aggregations by account and currency
      prisma.ledgerEntry.groupBy({
        by: ["accountId", "currencyId"],
        where: {
          date: { lte: dateFilter },
        },
        _sum: { debit: true, credit: true },
      }),
      // 4. All relevant vouchers for profit calculation
      prisma.voucher.findMany({
        where: {
          date: { lte: dateFilter },
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
        },
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
      // 5. Active Currencies
      prisma.currency.findMany({ where: { isActive: true } }),
    ]);

    const usdCurrency = currencies.find((c: any) => c.code === "USD");
    const usdId = usdCurrency ? usdCurrency.id : 1;

    // Define target currency for the report
    let targetCurrency = currencies.find((c: any) => c.code === "IQD"); // Default to IQD / Dinar for consolidated view
    if (currencyId && currencyId !== "all") {
      const parsedId = parseInt(currencyId);
      const matched = currencies.find((c: any) => c.id === parsedId);
      if (matched) targetCurrency = matched;
    }
    
    if (!targetCurrency) {
      targetCurrency = currencies[0] || { id: 1, rate: 1.0, symbol: "$", code: "USD", name: "دۆلار" };
    }

    const targetRate = targetCurrency.rate;

    const convertToTarget = (amount: number, fromCurrencyId: number) => {
      const fromCur = currencies.find((c: any) => c.id === fromCurrencyId);
      const fromRate = fromCur ? fromCur.rate : 1.0;
      const usdAmount = amount / fromRate;
      return usdAmount * targetRate;
    };

    const convertVoucherToTarget = (amount: number, voucherCurId: number, exchangeRate: number) => {
      const rate = voucherCurId === usdId ? 1.0 : exchangeRate || 1500;
      const usdAmount = amount / rate;
      return usdAmount * targetRate;
    };

    // 1. Total Cash
    const totalCash = cashboxBalances.reduce((sum, b) => {
      return sum + convertToTarget(b.amount, b.currencyId);
    }, 0);

    // 2. Warehouse Value
    const productStock: Record<number, number> = {};
    inventoryTrans.forEach(t => {
      productStock[t.productId] = (productStock[t.productId] || 0) + t.qtyChange * t.unitCost;
    });
    const totalWarehouseValueInUsd = Object.values(productStock).reduce((s, v) => s + v, 0);
    const warehouseValue = totalWarehouseValueInUsd * targetRate;

    // 3. Accounts receivable / payable
    let totalShareholderDeposits = 0;
    let totalShareholderWithdrawals = 0;
    const shareholderAccounts = await prisma.account.findMany({
      where: { isShareholder: true },
      select: { id: true }
    });
    const shareholderIds = new Set(shareholderAccounts.map(a => a.id));

    const accountNetBalances: Record<number, number> = {};
    const shareholderBalances: Record<number, number> = {};

    ledgerAggs.forEach((agg) => {
      const netRaw = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      const netConverted = convertToTarget(netRaw, agg.currencyId);
      if (shareholderIds.has(agg.accountId)) {
        shareholderBalances[agg.accountId] = (shareholderBalances[agg.accountId] || 0) + netConverted;
        const creditConverted = convertToTarget(agg._sum.credit || 0, agg.currencyId);
        const debitConverted = convertToTarget(agg._sum.debit || 0, agg.currencyId);
        totalShareholderDeposits += creditConverted;
        totalShareholderWithdrawals += debitConverted;
      } else {
        accountNetBalances[agg.accountId] = (accountNetBalances[agg.accountId] || 0) + netConverted;
      }
    });

    let accountsReceivable = 0;
    let accountsPayable = 0;
    Object.values(accountNetBalances).forEach(balance => {
      if (balance > 0.01) {
        accountsReceivable += balance;
      } else if (balance < -0.01) {
        accountsPayable += Math.abs(balance);
      }
    });

    Object.values(shareholderBalances).forEach(balance => {
      if (balance > 0.01) {
        totalShareholderWithdrawals += balance;
      }
    });

    const totalAssets = totalCash + warehouseValue + accountsReceivable;

    // 4. Net Profit calculation (matching final profit in profit report)
    const productCosts: Record<number, number> = {};
    inventoryTrans.forEach((t) => {
      if (t.qtyChange > 0 && t.unitCost > 0) {
        productCosts[t.productId] = t.unitCost;
      }
    });

    let totalSales = 0;
    let totalCOGS = 0;
    let totalMyDebtDiscount = 0;
    let totalPeopleDebtDiscount = 0;
    let totalExpenses = 0;
    let totalGifts = 0;
    let totalLosses = 0;

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
    const annualProfit = salesProfit + totalMyDebtDiscount - totalExpenses - totalGifts - totalPeopleDebtDiscount - totalLosses;

    const currentLiabilities = accountsPayable;
    const withdrawals = 0;
    const capital = totalShareholderDeposits - totalShareholderWithdrawals;
    const startingCapital = 0;
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
        startingCapital,
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

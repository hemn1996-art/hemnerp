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

    const [cashboxBalances, futureVouchers, inventoryTrans, ledgerAggs, vouchers, currencies] = await Promise.all([
      // 1. Current Cashbox Balances
      prisma.cashboxBalance.findMany(),
      // 2. Future Cash Vouchers (vouchers after dateFilter)
      prisma.voucher.findMany({
        where: {
          date: { gt: dateFilter },
          isDeleted: false,
        },
        select: {
          type: true,
          cashboxId: true,
          fromCashboxId: true,
          toCashboxId: true,
          paidAmounts: {
            select: { amount: true, currencyId: true }
          }
        }
      }),
      // 2. Inventory transactions
      prisma.inventoryTransaction.findMany({
        where: { date: { lte: dateFilter } },
        select: {
          productId: true,
          qtyChange: true,
          unitCost: true,
          date: true,
          voucher: { select: { type: true } },
        },
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
              "داشکاندن لە قەرزی من",
              "داشکاندن لە قەرزی خەڵک",
              "expense",
              "gift",
              "warehouse_damage",
              "خەسارەی کۆگا",
              "profit_distribution",
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

    // Retrieve custom exchangeRate if provided
    const queryRate = searchParams.get("exchangeRate");
    let customIQDRate: number | null = null;
    if (queryRate) {
      const parsed = parseFloat(queryRate);
      if (parsed > 0) {
        customIQDRate = parsed > 10000 ? parsed / 100 : parsed;
      }
    }

    // Find the last voucher rate for IQD on or before the dateFilter to return as the default rate
    const lastVoucher = await prisma.voucher.findFirst({
      where: {
        date: { lte: dateFilter },
        exchangeRate: { gt: 1 },
        isDeleted: false,
      },
      orderBy: { date: 'desc' },
      select: { exchangeRate: true },
    });
    
    const dbIQD = currencies.find((c: any) => c.code === "IQD");
    const fallbackRate = dbIQD ? dbIQD.rate : 1535;
    const defaultRate = lastVoucher ? lastVoucher.exchangeRate : fallbackRate;
    let normalizedDefaultRate = defaultRate;
    if (normalizedDefaultRate > 10000) normalizedDefaultRate = normalizedDefaultRate / 100;
    if (normalizedDefaultRate < 10) normalizedDefaultRate = normalizedDefaultRate * 100;

    // Define target currency for the report
    let targetCurrency = currencies.find((c: any) => c.code === "USD"); // Default to USD for consolidated view
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
      let fromRate = fromCur ? fromCur.rate : 1.0;
      if (fromCur && fromCur.code === "IQD" && customIQDRate !== null) {
        fromRate = customIQDRate;
      }
      const usdAmount = amount / fromRate;
      return usdAmount * targetRate;
    };

    const convertVoucherToTarget = (amount: number, voucherCurId: number, exchangeRate: number) => {
      if (voucherCurId === usdId) return amount * targetRate;
      const fromCur = currencies.find((c: any) => c.id === voucherCurId);
      let rate = exchangeRate || 1500;
      if (fromCur && fromCur.code === "IQD" && customIQDRate !== null) {
        rate = exchangeRate || customIQDRate;
      }
      if (rate > 10000) rate = rate / 100; // 155000 -> 1550
      if (rate < 10) rate = rate * 100;    // 15.5 -> 1550
      const usdAmount = amount / rate;
      return usdAmount * targetRate;
    };

    // 1. Total Cash from CashboxBalance table (reverted by future vouchers if viewing a past date)
    const cashBalances: Record<number, number> = {};

    // Initialize with current cashbox balances
    cashboxBalances.forEach((cb) => {
      cashBalances[cb.currencyId] = (cashBalances[cb.currencyId] || 0) + cb.amount;
    });

    // Subtract future voucher movements (vouchers dated after dateFilter)
    futureVouchers.forEach((v: any) => {
      if (v.type === "cashbox_transfer") {
        v.paidAmounts.forEach((pa: any) => {
          if (v.fromCashboxId) {
            cashBalances[pa.currencyId] = (cashBalances[pa.currencyId] || 0) + pa.amount;
          }
          if (v.toCashboxId) {
            cashBalances[pa.currencyId] = (cashBalances[pa.currencyId] || 0) - pa.amount;
          }
        });
      } else {
        const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange"].includes(v.type);
        const sign = isIncoming ? 1 : -1;
        v.paidAmounts.forEach((pa: any) => {
          const change = pa.amount * sign;
          if (v.cashboxId) {
            cashBalances[pa.currencyId] = (cashBalances[pa.currencyId] || 0) - change;
          }
        });
      }
    });

    const totalCash = Object.entries(cashBalances).reduce((sum, [curIdStr, amount]) => {
      return sum + convertToTarget(amount, Number(curIdStr));
    }, 0);

    // 2. Warehouse Value
    const productStats: Record<number, {
      totalPurchaseValue: number;
      totalPurchaseQty: number;
      currentQty: number;
      fallbackCost: number;
    }> = {};

    // Sort transactions by date ascending to match Stock Report fallback logic
    const sortedTrans = [...inventoryTrans].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    sortedTrans.forEach(t => {
      const pId = t.productId;
      if (!productStats[pId]) {
        productStats[pId] = {
          totalPurchaseValue: 0,
          totalPurchaseQty: 0,
          currentQty: 0,
          fallbackCost: 0
        };
      }
      
      const stats = productStats[pId];
      stats.currentQty += t.qtyChange;

      if (t.qtyChange > 0 && t.voucher?.type === "purchase") {
        stats.totalPurchaseValue += (t.qtyChange * t.unitCost);
        stats.totalPurchaseQty += t.qtyChange;
      }

      if (t.unitCost > 0 && stats.fallbackCost === 0) {
        stats.fallbackCost = t.unitCost;
      }
    });

    let totalWarehouseValueInUsd = 0;
    Object.values(productStats).forEach(stats => {
      let cost = 0;
      if (stats.totalPurchaseQty > 0) {
        cost = stats.totalPurchaseValue / stats.totalPurchaseQty;
      } else {
        cost = stats.fallbackCost;
      }
      
      const val = stats.currentQty * cost;
      if (val > 0) {
        totalWarehouseValueInUsd += val;
      }
    });
    const warehouseValue = totalWarehouseValueInUsd * targetRate;

    // 3. Accounts receivable / payable
    let totalShareholderDeposits = 0;
    let totalShareholderWithdrawals = 0;
    const shareholderAccounts = await prisma.account.findMany({
      where: { isShareholder: true },
      select: { id: true, name: true, phone: true, sharePercentage: true, isActive: true }
    });
    const shareholderIds = new Set(shareholderAccounts.map(a => a.id));

    const accountNetBalances: Record<number, number> = {};
    const shareholderBalances: Record<number, number> = {};
    const shareholderBalancesUSD: Record<number, number> = {};

    ledgerAggs.forEach((agg) => {
      const netRaw = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      const netConverted = convertToTarget(netRaw, agg.currencyId);
      
      const fromCur = currencies.find((c: any) => c.id === agg.currencyId);
      const fromRate = fromCur ? fromCur.rate : 1.0;
      const usdAmount = netRaw / fromRate;

      if (shareholderIds.has(agg.accountId)) {
        shareholderBalances[agg.accountId] = (shareholderBalances[agg.accountId] || 0) + netConverted;
        shareholderBalancesUSD[agg.accountId] = (shareholderBalancesUSD[agg.accountId] || 0) + usdAmount;
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

    const activeAssetsSum = await prisma.fixedAsset.aggregate({
      where: { isActive: true },
      _sum: { currentValue: true }
    });
    const fixedAssetsValue = activeAssetsSum._sum.currentValue || 0;

    const totalAssets = totalCash + warehouseValue + accountsReceivable + fixedAssetsValue;

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
    let totalDistributedProfit = 0;

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
      } else if (v.type === "my_debt_discount" || v.type === "داشکاندن لە قەرزی من") {
        totalMyDebtDiscount += amount;
      } else if (v.type === "people_debt_discount" || v.type === "داشکاندن لە قەرزی خەڵک") {
        totalPeopleDebtDiscount += amount;
      } else if (v.type === "expense") {
        totalExpenses += amount;
      } else if (v.type === "gift") {
        totalGifts += amount;
      } else if (v.type === "warehouse_damage" || v.type === "خەسارەی کۆگا") {
        totalLosses += amount;
      } else if (v.type === "profit_distribution") {
        totalDistributedProfit += amount;
      }
    });

    const salesProfit = totalSales - totalCOGS;
    const currentLiabilities = accountsPayable;
    const capital = totalShareholderDeposits - totalShareholderWithdrawals;
    const annualProfit = totalCash + warehouseValue + accountsReceivable + fixedAssetsValue - accountsPayable - capital;
    const withdrawals = 0;
    const startingCapital = 0;
    const totalLiabilitiesEquity = currentLiabilities + capital + annualProfit + withdrawals;

    const shareholderIdsList = shareholderAccounts.map(a => a.id);
    const [ledgerCounts, voucherCounts] = await Promise.all([
      prisma.ledgerEntry.groupBy({
        by: ["accountId"],
        where: { accountId: { in: shareholderIdsList } },
        _count: { id: true }
      }),
      prisma.voucher.groupBy({
        by: ["accountId"],
        where: { accountId: { in: shareholderIdsList } },
        _count: { id: true }
      })
    ]);

    const ledgerCountsMap = new Map(ledgerCounts.map(c => [c.accountId, c._count.id]));
    const voucherCountsMap = new Map(voucherCounts.map(c => [c.accountId, c._count.id]));

    const shareholders = shareholderAccounts.map(a => {
      const balance = shareholderBalances[a.id] || 0;
      const balanceUSD = shareholderBalancesUSD[a.id] || 0;
      const hasLedger = (ledgerCountsMap.get(a.id) || 0) > 0;
      const hasVoucher = (voucherCountsMap.get(a.id) || 0) > 0;
      const canDelete = !hasLedger && !hasVoucher;

      return {
        id: a.id,
        name: a.name,
        phone: a.phone || "",
        sharePercentage: a.sharePercentage || 0,
        isActive: a.isActive,
        balance: -balance, // credit - debit
        balanceUSD: -balanceUSD, // credit - debit in USD
        canDelete
      };
    });

    return NextResponse.json({
      asOfDate,
      exchangeRate: normalizedDefaultRate * 100,
      currencySymbol: targetCurrency?.symbol || "$",
      currencyCode: targetCurrency?.code || "USD",
      shareholders,
      assets: {
        currentAssets: totalCash,
        cash: totalCash,
        warehouseValue,
        accountsReceivable,
        otherAssets: fixedAssetsValue,
        allInventory: fixedAssetsValue,
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

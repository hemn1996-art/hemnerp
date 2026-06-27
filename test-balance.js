const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const asOfDate = new Date().toISOString().split("T")[0];
    const dateFilter = new Date(asOfDate);
    dateFilter.setHours(23, 59, 59, 999);

    const [cashboxBalances, inventoryTrans, ledgerAggs, vouchers, currencies] = await Promise.all([
      prisma.cashboxBalance.findMany({
        select: { amount: true, currencyId: true },
      }),
      prisma.inventoryTransaction.findMany({
        where: { date: { lte: dateFilter } },
        select: {
          productId: true,
          qtyChange: true,
          unitCost: true,
          voucher: { select: { type: true } },
        },
      }),
      prisma.ledgerEntry.groupBy({
        by: ["accountId", "currencyId"],
        where: {
          date: { lte: dateFilter },
        },
        _sum: { debit: true, credit: true },
      }),
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
      prisma.currency.findMany({ where: { isActive: true } }),
    ]);

    console.log("Success fetching DB");
    
    // Check next code
    const usdCurrency = currencies.find((c) => c.code === "USD");
    const usdId = usdCurrency ? usdCurrency.id : 1;

    let targetCurrency = currencies.find((c) => c.code === "USD"); 
    
    if (!targetCurrency) {
      targetCurrency = currencies[0] || { id: 1, rate: 1.0, symbol: "$", code: "USD", name: "دۆلار" };
    }

    const targetRate = targetCurrency.rate;

    const convertToTarget = (amount, fromCurrencyId) => {
      const fromCur = currencies.find((c) => c.id === fromCurrencyId);
      const fromRate = fromCur ? fromCur.rate : 1.0;
      const usdAmount = amount / fromRate;
      return usdAmount * targetRate;
    };
    
    let totalCash = 0;
    cashboxBalances.forEach(cb => {
      totalCash += convertToTarget(cb.amount, cb.currencyId);
    });

    console.log("Total cash:", totalCash);
    
    let warehouseValue = 0;
    const warehouseItems = {};
    inventoryTrans.forEach(t => {
      if (!warehouseItems[t.productId]) {
        warehouseItems[t.productId] = { qty: 0, cost: 0 };
      }
      warehouseItems[t.productId].qty += t.qtyChange;
      if (t.qtyChange > 0 && t.voucher?.type === "purchase") {
        warehouseItems[t.productId].cost = t.unitCost;
      } else if (t.qtyChange > 0 && t.voucher?.type !== "purchase" && warehouseItems[t.productId].cost === 0) {
        warehouseItems[t.productId].cost = t.unitCost;
      }
    });

    Object.values(warehouseItems).forEach(item => {
      if (item.qty > 0) {
        warehouseValue += convertToTarget(item.qty * item.cost, usdId);
      }
    });

    console.log("Warehouse value:", warehouseValue);

  } catch (err) {
    console.error("Crash:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

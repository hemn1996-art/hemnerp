require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== COMPARING ALL REPORTS ===");
  
  // 1. Let's check Debts Report breakdown
  const accounts = await prisma.account.findMany({
    where: { isActive: true, isShareholder: false },
    select: {
      id: true,
      name: true,
      exchangeRateType: true,
      customExchangeRate: true
    }
  });

  const currencies = await prisma.currency.findMany({ where: { isActive: true } });
  const usdCur = currencies.find(c => c.code === "USD");
  const iqdCur = currencies.find(c => c.code === "IQD");
  const marketRate = (iqdCur.rate > 10000 ? iqdCur.rate / 100 : iqdCur.rate);

  const balanceAggs = await prisma.ledgerEntry.groupBy({
    by: ["accountId", "currencyId"],
    _sum: { debit: true, credit: true }
  });

  const balanceMap = new Map();
  balanceAggs.forEach(agg => {
    if (!balanceMap.has(agg.accountId)) balanceMap.set(agg.accountId, {});
    const curMap = balanceMap.get(agg.accountId);
    curMap[agg.currencyId] = (agg._sum.debit || 0) - (agg._sum.credit || 0);
  });

  let myDebtDailyUsd = 0;
  let myDebtFixedUsd = 0;
  let myDebtIqd = 0;
  let myDebtMarketTotal = 0;
  let myDebtRawTotalUsd = 0;

  let peopleDebtDailyUsd = 0;
  let peopleDebtFixedUsd = 0;
  let peopleDebtIqd = 0;
  let peopleDebtMarketTotal = 0;

  accounts.forEach(acc => {
    const curBals = balanceMap.get(acc.id) || {};
    const usdBal = curBals[usdCur.id] || 0;
    const iqdBal = curBals[iqdCur.id] || 0;

    let effUsd = 0;
    if (acc.exchangeRateType === "FIXED") {
      const contractRate = (acc.customExchangeRate > 10000 ? acc.customExchangeRate / 100 : acc.customExchangeRate) || 1350;
      effUsd = (usdBal * contractRate) / marketRate + (iqdBal / marketRate);
    } else {
      effUsd = usdBal + (iqdBal / marketRate);
    }

    if (effUsd < -0.01) {
      // My debt (Payable)
      if (acc.exchangeRateType === "FIXED") {
        myDebtFixedUsd += Math.abs(usdBal);
      } else {
        myDebtDailyUsd += Math.abs(usdBal);
      }
      myDebtIqd += Math.abs(iqdBal);
      myDebtMarketTotal += Math.abs(effUsd);
      myDebtRawTotalUsd += Math.abs(usdBal) + (Math.abs(iqdBal) / marketRate);
    } else if (effUsd > 0.01) {
      // People debt (Receivable)
      if (acc.exchangeRateType === "FIXED") {
        peopleDebtFixedUsd += usdBal;
      } else {
        peopleDebtDailyUsd += usdBal;
      }
      peopleDebtIqd += iqdBal;
      peopleDebtMarketTotal += effUsd;
    }
  });

  console.log("--- DEBT REPORT PILLS & TOTALS ---");
  console.log(`دۆلاری ڕۆژ: $ ${myDebtDailyUsd.toFixed(2)}`);
  console.log(`دۆلاری جێگیر: $ ${myDebtFixedUsd.toFixed(2)}`);
  console.log(`دینار: ${myDebtIqd.toLocaleString("en-US")} دینار`);
  console.log(`کۆی گشتی قەرز بە دۆلاری ڕۆژ (Effective): $ ${myDebtMarketTotal.toFixed(2)}`);
  console.log(`کۆی گشتی ئەگەر دۆلاری جێگیر وەک دۆلاری ئاسایی دابنرێت (Face Value): $ ${myDebtRawTotalUsd.toFixed(2)}`);

  console.log("\n--- RECEIVABLES (قەرزم لای خەڵکە) ---");
  console.log(`دۆلاری ڕۆژ: $ ${peopleDebtDailyUsd.toFixed(2)}`);
  console.log(`دینار: ${peopleDebtIqd.toLocaleString("en-US")} دینار`);
  console.log(`کۆی گشتی: $ ${peopleDebtMarketTotal.toFixed(2)}`);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});

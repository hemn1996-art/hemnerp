const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool, { pgbouncer: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Locating entities in the database...");
  
  // Find accounts
  const customsAcc = await prisma.account.findFirst({ where: { name: { contains: "گومرک" } } });
  const transAcc = await prisma.account.findFirst({ where: { name: { contains: "گواستنەوە" } } });
  const supplierAcc = await prisma.account.findFirst({ where: { accountType: { name: { in: ["دابینکەر", "کڕیار و دابینکەر"] } } } });
  const mainCashbox = await prisma.cashbox.findFirst({ where: { name: { contains: "سەرەکی" } } });
  
  // Find products
  const p1 = await prisma.product.findFirst({ where: { name: { contains: "موبەریدی" } } });
  const p2 = await prisma.product.findFirst({ where: { name: { contains: "ئاسایی" } } });
  const usd = await prisma.currency.findFirst({ where: { code: "USD" } });
  const iqd = await prisma.currency.findFirst({ where: { code: "IQD" } });

  console.log("Entities found:");
  console.log("- customsAcc:", customsAcc?.id, customsAcc?.name);
  console.log("- transAcc:", transAcc?.id, transAcc?.name);
  console.log("- supplierAcc:", supplierAcc?.id, supplierAcc?.name);
  console.log("- mainCashbox:", mainCashbox?.id, mainCashbox?.name);
  console.log("- p1:", p1?.id, p1?.name);
  console.log("- p2:", p2?.id, p2?.name);
  console.log("- usd:", usd?.id);
  console.log("- iqd:", iqd?.id);

  if (!customsAcc || !transAcc || !supplierAcc || !mainCashbox || !p1 || !p2 || !usd || !iqd) {
    console.error("Missing required seed data in database to perform the exact test!");
    return;
  }

  // Construct payload mimicking Frontend PurchasePage
  const payload = {
    type: "purchase",
    referenceNo: "TEST-" + Date.now().toString().slice(-4),
    date: new Date().toISOString(),
    accountId: supplierAcc.id,
    cashboxId: mainCashbox.id,
    currencyId: usd.id,
    exchangeRate: 1500,
    totalAmount: 18800,
    totalDiscount: 0,
    netAmount: 18800,
    internalNote: "Test internal note",
    printNote: "Test print note",
    employeeName: "Test Employee",
    lines: [
      {
        productId: p1.id,
        qty: 80,
        unitPrice: 100,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 8000,
        note: "",
        warehouseId: 1
      },
      {
        productId: p2.id,
        qty: 90,
        unitPrice: 120,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 10800,
        note: "",
        warehouseId: 1
      }
    ],
    expenses: [
      {
        amount: 3000,
        currencyId: usd.id,
        accountId: customsAcc.id,
        note: "گومرک",
        addToAccountDebt: true
      },
      {
        amount: 2000000,
        currencyId: iqd.id,
        accountId: transAcc.id,
        note: "نەقڵ",
        addToAccountDebt: true
      }
    ],
    paidAmounts: [] // 0 paid
  };

  console.log("\nTrying database transaction...");
  try {
    const voucher = await prisma.$transaction(async (tx) => {
      const createdVoucher = await tx.voucher.create({
        data: {
          type: payload.type,
          referenceNo: payload.referenceNo,
          date: payload.date ? new Date(payload.date) : new Date(),
          accountId: payload.accountId ? Number(payload.accountId) : null,
          cashboxId: payload.cashboxId ? Number(payload.cashboxId) : null,
          currencyId: payload.currencyId ? Number(payload.currencyId) : null,
          exchangeRate: payload.exchangeRate ? Number(payload.exchangeRate) : 1,
          totalAmount: payload.totalAmount ? Number(payload.totalAmount) : 0,
          totalDiscount: payload.totalDiscount ? Number(payload.totalDiscount) : 0,
          netAmount: payload.netAmount ? Number(payload.netAmount) : 0,
          internalNote: payload.internalNote,
          printNote: payload.printNote,
          isSaved: true,
          employeeName: payload.employeeName,
        },
      });

      if (payload.lines && Array.isArray(payload.lines)) {
        for (const line of payload.lines) {
          await tx.voucherLine.create({
            data: {
              voucherId: createdVoucher.id,
              productId: Number(line.productId),
              qty: Number(line.qty),
              unitPrice: Number(line.unitPrice),
              discountPercent: Number(line.discountPercent || 0),
              discountAmount: Number(line.discountAmount || 0),
              lineTotal: Number(line.lineTotal),
              note: line.note,
            },
          });
        }
      }

      if (payload.expenses && Array.isArray(payload.expenses)) {
        for (const exp of payload.expenses) {
          console.log(`Adding expense: ${exp.amount} for account: ${exp.accountId}`);
          await tx.voucherExpense.create({
            data: {
              voucherId: createdVoucher.id,
              amount: Number(exp.amount),
              currencyId: Number(exp.currencyId),
              accountId: exp.accountId ? Number(exp.accountId) : null,
              note: exp.note,
              addToAccountDebt: exp.addToAccountDebt ?? false,
            },
          });

          if (exp.addToAccountDebt && exp.accountId) {
            console.log(`Creating ledger entry for expense account: ${exp.accountId}`);
            await tx.ledgerEntry.create({
              data: {
                voucherId: createdVoucher.id,
                accountId: Number(exp.accountId),
                currencyId: Number(exp.currencyId),
                debit: 0,
                credit: Number(exp.amount),
                exchangeRate: Number(payload.exchangeRate || 1),
                date: createdVoucher.date,
              },
            });
          }
        }
      }

      return createdVoucher;
    });

    console.log("Success! Created voucher:", voucher.id);
  } catch (err) {
    console.error("FAIL: Error caught during database transaction:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(e => { console.error("Outer Error:", e); process.exit(1); });

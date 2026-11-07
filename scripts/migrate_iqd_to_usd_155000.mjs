import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate(dryRun = true) {
  console.log(`=== RUNNING MIGRATION (DRY RUN: ${dryRun}) ===`);
  const TARGET_RATE = 1550; // 155,000 IQD per 100$

  // 1. Find all warehouse_stock vouchers that have IQD lines or currencyId === 2
  const stockVouchers = await prisma.voucher.findMany({
    where: {
      type: { in: ['warehouse_stock', 'جەردی کۆگا'] },
      isDeleted: false,
      OR: [
        { currencyId: 2 },
        { currencyId: 12 },
        { lines: { some: { OR: [{ currencyId: 2 }, { unitPrice: { gt: 1000 } }] } } }
      ]
    },
    include: { lines: true, inventoryTransactions: true }
  });

  console.log(`Found ${stockVouchers.length} warehouse_stock vouchers to process.`);

  let stockTxConverted = 0;
  let totalStockIqdValue = 0;
  let totalStockUsdValue = 0;

  for (const v of stockVouchers) {
    if (!dryRun) {
      await prisma.voucher.update({
        where: { id: v.id },
        data: { exchangeRate: TARGET_RATE }
      });
    }

    for (const line of v.lines) {
      const isLineIQD = line.currencyId === 2 || line.currencyId === 12 || line.unitPrice > 1000;
      if (isLineIQD && line.unitPrice > 0) {
        const costUsd = Number((line.unitPrice / TARGET_RATE).toFixed(4));
        const matchedTxs = v.inventoryTransactions.filter(t => t.productId === line.productId && t.qtyChange > 0);
        
        for (const tx of matchedTxs) {
          totalStockIqdValue += tx.qtyChange * (tx.unitCost > 1000 ? tx.unitCost : line.unitPrice);
          totalStockUsdValue += tx.qtyChange * costUsd;
          stockTxConverted++;

          if (!dryRun) {
            await prisma.inventoryTransaction.update({
              where: { id: tx.id },
              data: { unitCost: costUsd, currencyId: 1 }
            });
          }
        }
      }
    }
  }

  console.log(`Stock vouchers: Converted ${stockTxConverted} incoming transactions.`);
  console.log(`Total Stock IQD Value: IQD ${totalStockIqdValue.toLocaleString()}`);
  console.log(`Total Stock USD Value: $ ${totalStockUsdValue.toLocaleString()} (at rate ${TARGET_RATE * 100})`);

  // 2. Find purchase vouchers with IQD lines
  const purchaseVouchers = await prisma.voucher.findMany({
    where: {
      type: { in: ['purchase', 'purchase_return'] },
      isDeleted: false,
      OR: [
        { currencyId: 2 },
        { currencyId: 12 },
        { lines: { some: { OR: [{ currencyId: 2 }, { unitPrice: { gt: 1000 } }] } } }
      ]
    },
    include: { lines: true, inventoryTransactions: true }
  });

  console.log(`\nFound ${purchaseVouchers.length} purchase vouchers to process.`);
  let purchaseTxConverted = 0;
  let totalPurchaseIqdValue = 0;
  let totalPurchaseUsdValue = 0;

  for (const v of purchaseVouchers) {
    let vRate = TARGET_RATE;
    if (v.exchangeRate && v.exchangeRate > 100) {
      vRate = v.exchangeRate > 10000 ? v.exchangeRate / 100 : v.exchangeRate;
    } else if (!dryRun) {
      await prisma.voucher.update({
        where: { id: v.id },
        data: { exchangeRate: TARGET_RATE }
      });
    }

    for (const line of v.lines) {
      const isLineIQD = line.currencyId === 2 || line.currencyId === 12 || line.unitPrice > 1000;
      if (isLineIQD && line.unitPrice > 0) {
        const costUsd = Number((line.unitPrice / vRate).toFixed(4));
        const matchedTxs = v.inventoryTransactions.filter(t => t.productId === line.productId && t.qtyChange > 0);
        
        for (const tx of matchedTxs) {
          totalPurchaseIqdValue += tx.qtyChange * (tx.unitCost > 1000 ? tx.unitCost : line.unitPrice);
          totalPurchaseUsdValue += tx.qtyChange * costUsd;
          purchaseTxConverted++;

          if (!dryRun) {
            await prisma.inventoryTransaction.update({
              where: { id: tx.id },
              data: { unitCost: costUsd, currencyId: 1 }
            });
          }
        }
      }
    }
  }

  console.log(`Purchase vouchers: Converted ${purchaseTxConverted} incoming transactions.`);
  console.log(`Total Purchase IQD Value: IQD ${totalPurchaseIqdValue.toLocaleString()}`);
  console.log(`Total Purchase USD Value: $ ${totalPurchaseUsdValue.toLocaleString()}`);

  // 3. Outgoing transactions (sales, etc.) that have unitCost > 1000 or currencyId === 2
  const outgoingTxs = await prisma.inventoryTransaction.findMany({
    where: {
      qtyChange: { lt: 0 },
      voucher: { isDeleted: false },
      OR: [
        { currencyId: 2 },
        { currencyId: 12 },
        { unitCost: { gt: 1000 } }
      ]
    },
    include: { voucher: true }
  });

  console.log(`\nFound ${outgoingTxs.length} outgoing transactions with IQD unit cost.`);
  let outgoingConverted = 0;
  for (const tx of outgoingTxs) {
    let rate = TARGET_RATE;
    if (tx.voucher?.exchangeRate && tx.voucher.exchangeRate > 100) {
      rate = tx.voucher.exchangeRate > 10000 ? tx.voucher.exchangeRate / 100 : tx.voucher.exchangeRate;
    }
    const costUsd = Number((tx.unitCost / rate).toFixed(4));
    outgoingConverted++;

    if (!dryRun) {
      await prisma.inventoryTransaction.update({
        where: { id: tx.id },
        data: { unitCost: costUsd, currencyId: 1 }
      });
    }
  }
  console.log(`Outgoing transactions: Converted ${outgoingConverted} transactions to USD.`);

  // 4. Any remaining stray transactions with unitCost > 1000
  const remainingStrays = await prisma.inventoryTransaction.findMany({
    where: {
      unitCost: { gt: 1000 },
      voucher: { isDeleted: false }
    }
  });
  console.log(`\nRemaining stray transactions with unitCost > 1000: ${remainingStrays.length}`);
  for (const tx of remainingStrays) {
    const costUsd = Number((tx.unitCost / TARGET_RATE).toFixed(4));
    if (!dryRun) {
      await prisma.inventoryTransaction.update({
        where: { id: tx.id },
        data: { unitCost: costUsd, currencyId: 1 }
      });
    }
  }

  console.log('\n=== DRY RUN SUMMARY COMPLETE ===');
  await pool.end();
}

// Execute live migration
migrate(false).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

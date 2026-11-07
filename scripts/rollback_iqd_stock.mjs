import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function rollback() {
  const backupPath = './backups/iqd_stock_baseline_pre_155000.json';
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found at:', backupPath);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('Starting rollback from backup dated:', backupData.timestamp);
  console.log('Restoring', backupData.totalVouchers, 'vouchers and', backupData.totalTransactions, 'inventory transactions...');

  let vCount = 0;
  for (const v of backupData.vouchers) {
    await prisma.voucher.update({
      where: { id: v.id },
      data: {
        currencyId: v.currencyId,
        exchangeRate: v.exchangeRate
      }
    });
    vCount++;
  }

  let txCount = 0;
  for (const t of backupData.inventoryTransactions) {
    await prisma.inventoryTransaction.update({
      where: { id: t.id },
      data: {
        unitCost: t.unitCost,
        currencyId: t.currencyId
      }
    });
    txCount++;
  }

  console.log(`ROLLBACK COMPLETED SUCCESSFULLY:`);
  console.log(`- ${vCount} vouchers restored to original currency & exchange rate.`);
  console.log(`- ${txCount} inventory transactions restored to original IQD costs.`);
  await pool.end();
}

rollback().catch(err => {
  console.error('Rollback error:', err);
  process.exit(1);
});

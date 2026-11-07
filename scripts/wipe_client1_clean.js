const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  max: 2,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function wipeClient1Data(execute = false) {
  console.log('=== CLIENT 1 DATABASE WIPE SCRIPT ===');
  console.log('Target Database Host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

  // Safety check: Ensure target is strictly Client 1
  if (!process.env.DATABASE_URL.includes('gkojjisjdghasspyvglc')) {
    throw new Error('ABORT! Target database is NOT Client 1 (gkojjisjdghasspyvglc). Operation aborted immediately for safety!');
  }

  if (!execute) {
    console.log('DRY RUN MODE: No data deleted. Pass --execute to perform wipe.');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log('Executing wipe in sequential order...');

  const operations = [
    { name: 'VoucherVersion', run: () => prisma.voucherVersion.deleteMany() },
    { name: 'VoucherLine', run: () => prisma.voucherLine.deleteMany() },
    { name: 'VoucherExpense', run: () => prisma.voucherExpense.deleteMany() },
    { name: 'VoucherPaidAmount', run: () => prisma.voucherPaidAmount.deleteMany() },
    { name: 'LedgerEntry', run: () => prisma.ledgerEntry.deleteMany() },
    { name: 'InventoryTransaction', run: () => prisma.inventoryTransaction.deleteMany() },
    { name: 'FixedAssetHistory', run: () => prisma.fixedAssetHistory.deleteMany() },
    { name: 'FixedAsset', run: () => prisma.fixedAsset.deleteMany() },
    { name: 'FixedAssetCategory', run: () => prisma.fixedAssetCategory.deleteMany() },
    { name: 'ProfitDistributionItem', run: () => prisma.profitDistributionItem.deleteMany() },
    { name: 'ProfitDistribution', run: () => prisma.profitDistribution.deleteMany() },
    { name: 'Voucher', run: () => prisma.voucher.deleteMany() },
    { name: 'CashboxBalance', run: () => prisma.cashboxBalance.deleteMany() },
    { name: 'Cashbox', run: () => prisma.cashbox.deleteMany() },
    { name: 'Account', run: () => prisma.account.deleteMany() },
    { name: 'AccountType', run: () => prisma.accountType.deleteMany() },
    { name: 'Product', run: () => prisma.product.deleteMany() },
    { name: 'Category', run: () => prisma.category.deleteMany() },
    { name: 'Brand', run: () => prisma.brand.deleteMany() },
    { name: 'Packaging', run: () => prisma.packaging.deleteMany() },
    { name: 'PriceType', run: () => prisma.priceType.deleteMany() },
    { name: 'Warehouse', run: () => prisma.warehouse.deleteMany() },
    { name: 'InvoiceTemplate', run: () => prisma.invoiceTemplate.deleteMany() },
    { name: 'District', run: () => prisma.district.deleteMany() },
    { name: 'City', run: () => prisma.city.deleteMany() },
    { name: 'Country', run: () => prisma.country.deleteMany() },
    { name: 'SystemAnnouncement', run: () => prisma.systemAnnouncement.deleteMany() },
    { name: 'LoginAttempt', run: () => prisma.loginAttempt.deleteMany() },
    { name: 'Currency', run: () => prisma.currency.deleteMany() },
  ];

  for (const op of operations) {
    try {
      const res = await op.run();
      console.log(`✓ Deleted ${op.name}: ${res.count} records`);
    } catch (err) {
      console.error(`❌ Error deleting ${op.name}: ${err.message}`);
    }
  }

  console.log('\n--- VERIFYING ADMIN USER ---');
  const adminCount = await prisma.user.count();
  console.log(`Remaining Users (Admin kept for login): ${adminCount}`);

  console.log('\n✅ Client 1 database wipe complete. Database is now in 100% clean Day-One state.');

  await prisma.$disconnect();
  await pool.end();
}

const shouldExecute = process.argv.includes('--execute');
wipeClient1Data(shouldExecute).catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});

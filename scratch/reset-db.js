require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Wiping all data from the database...');

  // Delete transaction and user-entered tables
  await prisma.inventoryTransaction.deleteMany();
  console.log('Cleared InventoryTransactions');

  await prisma.ledgerEntry.deleteMany();
  console.log('Cleared LedgerEntries');

  await prisma.voucherPaidAmount.deleteMany();
  console.log('Cleared VoucherPaidAmounts');

  await prisma.voucherExpense.deleteMany();
  console.log('Cleared VoucherExpenses');

  await prisma.voucherLine.deleteMany();
  console.log('Cleared VoucherLines');

  await prisma.voucherVersion.deleteMany();
  console.log('Cleared VoucherVersions');

  await prisma.voucher.deleteMany();
  console.log('Cleared Vouchers');

  await prisma.product.deleteMany();
  console.log('Cleared Products');

  await prisma.account.deleteMany();
  console.log('Cleared Accounts');

  await prisma.cashboxBalance.deleteMany();
  console.log('Cleared CashboxBalances');

  await prisma.cashbox.deleteMany();
  console.log('Cleared Cashboxes');

  await prisma.warehouse.deleteMany();
  console.log('Cleared Warehouses');

  await prisma.invoiceTemplate.deleteMany();
  console.log('Cleared InvoiceTemplates');

  await prisma.district.deleteMany();
  console.log('Cleared Districts');

  await prisma.city.deleteMany();
  console.log('Cleared Cities');

  await prisma.country.deleteMany();
  console.log('Cleared Countries');

  await prisma.currency.deleteMany();
  console.log('Cleared Currencies');

  await prisma.accountType.deleteMany();
  console.log('Cleared AccountTypes');

  console.log('Database wiped successfully! Default setups can now be seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });

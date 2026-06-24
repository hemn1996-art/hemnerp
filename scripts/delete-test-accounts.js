require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Deleting all test vouchers, ledger entries, and accounts...");

  // Delete all ledger entries, voucher expenses, voucher paid amounts, voucher lines
  await prisma.ledgerEntry.deleteMany();
  await prisma.voucherExpense.deleteMany();
  await prisma.voucherPaidAmount.deleteMany();
  await prisma.voucherLine.deleteMany();
  
  // Delete all vouchers
  await prisma.voucher.deleteMany();

  // Delete all accounts
  await prisma.account.deleteMany();

  console.log("✅ All test accounts and vouchers have been completely removed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

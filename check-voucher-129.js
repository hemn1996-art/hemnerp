require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const voucher = await prisma.voucher.findUnique({
    where: { id: 129 },
    include: {
      paidAmounts: true,
      lines: {
        include: {
          product: true,
        }
      },
      expenses: true,
      ledgerEntries: true,
      inventoryTransactions: {
        include: {
          warehouse: true,
        }
      }
    }
  });
  console.log("VOUCHER 129:", JSON.stringify(voucher, null, 2));

  const balances = await prisma.cashboxBalance.findMany({
    where: { cashboxId: 6 }
  });
  console.log("CASHBOX BALANCES FOR ID 6:", JSON.stringify(balances, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
  pool.end();
});

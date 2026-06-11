require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting account deduplication and merging...");

  const accounts = await prisma.account.findMany({
    orderBy: { id: 'asc' }
  });

  const groups = {};
  for (const acc of accounts) {
    const normName = acc.name.trim().toLowerCase();
    const normPhone = (acc.phone || '').replace(/[^0-9]/g, '');
    const key = `${normName}_${normPhone}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(acc);
  }

  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      const primary = list[0];
      const duplicates = list.slice(1);
      console.log(`\nFound duplicate group for Key: "${key}"`);
      console.log(`Primary Account: ID ${primary.id} | Name: "${primary.name}" | Phone: "${primary.phone}"`);

      for (const dup of duplicates) {
        console.log(`  Merging duplicate: ID ${dup.id} | Name: "${dup.name}" | Phone: "${dup.phone}"`);

        // Update Vouchers
        const vCount = await prisma.voucher.updateMany({
          where: { accountId: dup.id },
          data: { accountId: primary.id }
        });
        console.log(`    Updated ${vCount.count} Vouchers`);

        // Update VoucherExpenses
        const expCount = await prisma.voucherExpense.updateMany({
          where: { accountId: dup.id },
          data: { accountId: primary.id }
        });
        console.log(`    Updated ${expCount.count} VoucherExpenses`);

        // Update LedgerEntries
        const leCount = await prisma.ledgerEntry.updateMany({
          where: { accountId: dup.id },
          data: { accountId: primary.id }
        });
        console.log(`    Updated ${leCount.count} LedgerEntries`);

        // Delete duplicate account record
        await prisma.account.delete({
          where: { id: dup.id }
        });
        console.log(`    Deleted Account ID ${dup.id}`);
      }
    }
  }

  console.log("\n✅ Account deduplication and merging completed successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

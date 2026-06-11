require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const accounts = await prisma.account.findMany({
    include: {
      _count: {
        select: {
          ledgerEntries: true,
          vouchers: true,
        }
      }
    }
  });
  console.log("All accounts with counts:");
  accounts.forEach(a => {
    console.log(`ID: ${a.id} | Name: "${a.name}" | Phone: "${a.phone}" | Active: ${a.isActive} | Vouchers: ${a._count.vouchers} | LedgerEntries: ${a._count.ledgerEntries}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

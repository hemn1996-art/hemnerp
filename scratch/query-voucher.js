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
    where: { id: 51 },
    include: {
      account: true,
      paidAmounts: true,
      versions: true,
    }
  });
  console.log("Voucher 45:", JSON.stringify(voucher, null, 2));

  // Let's also count vouchers by type to see what we have
  const counts = await prisma.voucher.groupBy({
    by: ['type'],
    _count: { id: true },
  });
  console.log("Voucher counts by type:", counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());

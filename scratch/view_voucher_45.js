const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const voucher = await prisma.voucher.findUnique({
    where: { id: 45 },
    include: {
      account: true,
      paidAmounts: true,
      ledgerEntries: true,
    }
  });
  console.log("Voucher 45 details:", JSON.stringify(voucher, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

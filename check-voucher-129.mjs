import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const voucher = await prisma.voucher.findUnique({
    where: { id: 129 },
    include: {
      paidAmounts: true,
      lines: true,
      expenses: true,
      ledgerEntries: true,
    }
  });
  console.log("VOUCHER:", JSON.stringify(voucher, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());

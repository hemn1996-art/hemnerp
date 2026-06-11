const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const currencies = await prisma.currency.findMany();
  console.log("Currencies in DB:", currencies);
  const vouchers = await prisma.voucher.findMany({
    where: { id: 152 },
    include: { paidAmounts: true }
  });
  console.log("Voucher 152:", JSON.stringify(vouchers, null, 2));
}

main().catch(console.error);

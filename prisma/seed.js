require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('Seeding database with default values...');

  // 1. Currencies
  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: {
      code: 'USD',
      name: 'دۆلار',
      symbol: '$',
      isActive: true,
    },
  });

  const iqd = await prisma.currency.upsert({
    where: { code: 'IQD' },
    update: {},
    create: {
      code: 'IQD',
      name: 'دینار',
      symbol: 'د.ع',
      isActive: true,
    },
  });

  console.log('Currencies seeded.');

  // 2. Account Types
  const types = [
    { name: 'کڕیار', isBuiltIn: true, showsInSales: true, showsInPurch: false },
    { name: 'دابینکەر', isBuiltIn: true, showsInSales: false, showsInPurch: true },
    { name: 'کڕیار و دابینکەر', isBuiltIn: true, showsInSales: true, showsInPurch: true },
    { name: 'مایەدار (شەریک)', isBuiltIn: true, showsInSales: false, showsInPurch: false },
  ];

  for (const t of types) {
    await prisma.accountType.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  console.log('Account types seeded.');

  // 3. Default Warehouse
  await prisma.warehouse.upsert({
    where: { name: 'کۆگای سەرەکی' },
    update: {},
    create: {
      name: 'کۆگای سەرەکی',
      isActive: true,
    },
  });

  console.log('Default warehouse seeded.');

  // 4. Default Cashboxes
  const cashbox1 = await prisma.cashbox.upsert({
    where: { name: 'سندوقی سەرەکی' },
    update: {},
    create: {
      name: 'سندوقی سەرەکی',
      type: 'cash',
      isActive: true,
    },
  });

  const cashbox2 = await prisma.cashbox.upsert({
    where: { name: 'حیسابی بانک' },
    update: {},
    create: {
      name: 'حیسابی بانک',
      type: 'bank',
      isActive: true,
    },
  });

  console.log('Default cashboxes seeded.');

  // Initialize Cashbox Balances
  await prisma.cashboxBalance.upsert({
    where: {
      cashboxId_currencyId: {
        cashboxId: cashbox1.id,
        currencyId: usd.id,
      },
    },
    update: {},
    create: {
      cashboxId: cashbox1.id,
      currencyId: usd.id,
      amount: 0,
    },
  });

  await prisma.cashboxBalance.upsert({
    where: {
      cashboxId_currencyId: {
        cashboxId: cashbox1.id,
        currencyId: iqd.id,
      },
    },
    update: {},
    create: {
      cashboxId: cashbox1.id,
      currencyId: iqd.id,
      amount: 0,
    },
  });

  await prisma.cashboxBalance.upsert({
    where: {
      cashboxId_currencyId: {
        cashboxId: cashbox2.id,
        currencyId: usd.id,
      },
    },
    update: {},
    create: {
      cashboxId: cashbox2.id,
      currencyId: usd.id,
      amount: 0,
    },
  });

  await prisma.cashboxBalance.upsert({
    where: {
      cashboxId_currencyId: {
        cashboxId: cashbox2.id,
        currencyId: iqd.id,
      },
    },
    update: {},
    create: {
      cashboxId: cashbox2.id,
      currencyId: iqd.id,
      amount: 0,
    },
  });

  console.log('Cashbox balances initialized.');
  console.log('Seeding complete! 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

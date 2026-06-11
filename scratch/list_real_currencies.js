const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const currencies = await prisma.currency.findMany();
  console.log("Real Currencies in DB:");
  currencies.forEach(c => {
    console.log(`ID: ${c.id}, Code: "${c.code}", Name: "${c.name}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const accounts = await prisma.account.findMany();
  console.log("Real Accounts in DB:");
  accounts.forEach(a => {
    console.log(`ID: ${a.id}, Name: "${a.name}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

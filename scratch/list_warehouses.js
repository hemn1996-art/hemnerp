const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const warehouses = await prisma.warehouse.findMany();
  console.log("Real Warehouses in DB:");
  warehouses.forEach(w => {
    console.log(`ID: ${w.id}, Name: "${w.name}", isMain: ${w.isMain}, isActive: ${w.isActive}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

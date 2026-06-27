require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool, { pgbouncer: true });
const prisma = new PrismaClient({ adapter });

async function clear() {
  await prisma.voucherLine.deleteMany({});
  await prisma.voucher.deleteMany({});
  console.log('Cleared existing mapped vouchers.');
}
clear().finally(() => { prisma.$disconnect(); pool.end(); });

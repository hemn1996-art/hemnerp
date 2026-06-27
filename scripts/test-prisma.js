require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool, { pgbouncer: true });
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const user = await prisma.user.findUnique({ where: { username: 'admin' } });
    console.log("Found user:", user);
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}
test().finally(() => { prisma.$disconnect(); pool.end(); });

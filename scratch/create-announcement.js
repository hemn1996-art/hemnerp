try {
  require('dotenv/config');
} catch (e) {
  // dotenv/config not found, assuming env vars are loaded natively or via shell
}
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
});
const adapter = new PrismaPg(pgPool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const message = process.argv[2] || "ئێستا کۆتا ئەپدەیتت پێدەگات";
    const type = process.argv[3] || "info"; // can be "info", "warning", "error", "success"

    // console.log(`Deactivating existing active announcements...`);
    // await prisma.systemAnnouncement.updateMany({
    //   where: { isActive: true },
    //   data: { isActive: false },
    // });

    console.log(`Creating new announcement: "${message}" [Type: ${type}]`);
    const announcement = await prisma.systemAnnouncement.create({
      data: {
        message: message,
        type: type,
        isActive: true,
      },
    });

    console.log("Success! Created announcement:", announcement);
  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await prisma.$disconnect();
    await pgPool.end();
  }
}

main();

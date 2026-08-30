const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function backup() {
  console.log('Starting full database backup...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const data = {
      timestamp: new Date().toISOString(),
      users: await prisma.user.findMany(),
      accounts: await prisma.account.findMany(),
      accountTypes: await prisma.accountType.findMany(),
      vouchers: await prisma.voucher.findMany({
        include: {
          lines: true,
          expenses: true,
          paidAmounts: true,
          ledgerEntries: true,
        }
      }),
      products: await prisma.product.findMany(),
      categories: await prisma.category.findMany(),
      brands: await prisma.brand.findMany(),
      cashboxes: await prisma.cashbox.findMany({
        include: { balances: true }
      }),
      currencies: await prisma.currency.findMany(),
      warehouses: await prisma.warehouse.findMany(),
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `backup-${dateStr}-${Date.now()}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Backup successfully created: backups/${filename}`);
    console.log(`Summary: ${data.vouchers.length} vouchers, ${data.products.length} products, ${data.accounts.length} accounts backed up.`);
  } catch (err) {
    console.error('Backup failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

backup();

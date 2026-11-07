const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  max: 2,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backupClient1() {
  console.log('--- STARTING CLIENT 1 BACKUP ---');
  console.log('Database Host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

  const models = [
    'user',
    'userPermission',
    'currency',
    'country',
    'city',
    'district',
    'accountType',
    'account',
    'warehouse',
    'cashbox',
    'cashboxBalance',
    'product',
    'voucher',
    'voucherVersion',
    'voucherLine',
    'voucherExpense',
    'voucherPaidAmount',
    'ledgerEntry',
    'inventoryTransaction',
    'invoiceTemplate',
    'category',
    'brand',
    'packaging',
    'priceType',
    'systemAnnouncement',
    'profitDistribution',
    'profitDistributionItem',
    'fixedAssetCategory',
    'fixedAsset',
    'fixedAssetHistory',
    'loginAttempt'
  ];

  const backupData = {
    metadata: {
      client: 'Client 1 (کۆگای دۆستان)',
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0],
      createdAt: new Date().toISOString(),
    },
    tables: {}
  };

  let totalRecords = 0;

  for (const m of models) {
    if (prisma[m]) {
      try {
        const rows = await prisma[m].findMany();
        backupData.tables[m] = rows;
        totalRecords += rows.length;
        console.log(`[BACKUP] ${m}: ${rows.length} records`);
      } catch (err) {
        console.error(`[BACKUP ERROR] ${m}: ${err.message}`);
      }
    }
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `client1_backup_before_wipe_${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  const stats = fs.statSync(backupFilePath);
  console.log(`\n✅ Backup successfully created!`);
  console.log(`File: ${backupFilePath}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Records: ${totalRecords}`);

  await prisma.$disconnect();
  await pool.end();
}

backupClient1().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});

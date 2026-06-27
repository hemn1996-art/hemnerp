require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load .env
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
} catch (e) {}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function wipeDatabase() {
  console.log("⚠️ دەستپێکردنی سڕینەوەی تەواوەتی داتابەیس...");
  
  // Truncate all tables using cascade to avoid foreign key errors
  // Note: We only truncate application tables, not Prisma migrations table
  const tables = [
    '"FixedAssetHistory"', '"FixedAsset"', '"FixedAssetCategory"',
    '"ProfitDistributionItem"', '"ProfitDistribution"',
    '"SystemAnnouncement"', '"UserPermission"', '"User"',
    '"VoucherLine"', '"VoucherExpense"', '"VoucherPaidAmount"',
    '"VoucherVersion"', '"InventoryTransaction"', '"LedgerEntry"', '"Voucher"',
    '"Product"', '"Category"', '"Brand"', '"Packaging"', '"PriceType"',
    '"InvoiceTemplate"', '"CashboxBalance"', '"Cashbox"', '"Warehouse"',
    '"Account"', '"AccountType"', '"Currency"', '"Country"', '"City"', '"District"'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`✅ سڕدرایەوە: ${table}`);
    } catch (err) {
      console.log(`⚠️ کێشە لە سڕینەوەی ${table} (ڕەنگە پێشتر سڕدرابێتەوە)`);
    }
  }

  console.log("🧹 داتابەیس بە تەواوی سفر کرایەوە.");
  
  // Run seed script to recreate admin user
  console.log("🌱 دروستکردنەوەی هەژماری ئەدمین...");
  execSync("node scripts/seed-admin.js", { stdio: "inherit" });
  
  console.log("🎉 هەموو کارەکان بە سەرکەوتوویی کۆتاییان هات.");
}

wipeDatabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

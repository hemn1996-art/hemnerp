require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    });
  }
} catch (e) {}

async function wipeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting to", connectionString.split("@")[1]);
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

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

  try {
    const query = `TRUNCATE TABLE ${tables.join(", ")} CASCADE;`;
    console.log("Executing:", query);
    await client.query(query);
    console.log("✅ هەموو خشتەکان بە سەرکەوتوویی سفر کرانەوە.");
  } catch (err) {
    console.error("❌ کێشە لە سڕینەوە:", err.message);
  } finally {
    await client.end();
  }
}

wipeDatabase().catch(console.error);

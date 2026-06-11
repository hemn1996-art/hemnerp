/**
 * reset-fresh.js
 * سفرکردنەوەی هەموو داتاکان + دانانی داتای بنەڕەتی (وەک نصبی نوێ)
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// DATABASE_URL بەکار دەهێنین (port 6543 - transaction mode) کە سنووری session نییە
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool, { pgbouncer: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("⚠️  دەستپێکردنی سفرکردنەوەی هەموو داتاکان...\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ١. سڕینەوەی هەموو شتێک بە ترتیب (foreign keys)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await prisma.voucherVersion.deleteMany({});
  console.log("✓ VoucherVersion");

  await prisma.voucherLine.deleteMany({});
  console.log("✓ VoucherLine");

  await prisma.voucherExpense.deleteMany({});
  console.log("✓ VoucherExpense");

  await prisma.voucherPaidAmount.deleteMany({});
  console.log("✓ VoucherPaidAmount");

  await prisma.ledgerEntry.deleteMany({});
  console.log("✓ LedgerEntry");

  await prisma.inventoryTransaction.deleteMany({});
  console.log("✓ InventoryTransaction");

  await prisma.voucher.deleteMany({});
  console.log("✓ Voucher (پسوڵەکان)");

  await prisma.cashboxBalance.deleteMany({});
  console.log("✓ CashboxBalance");

  await prisma.cashbox.deleteMany({});
  console.log("✓ Cashbox (صندووقەکان)");

  await prisma.account.deleteMany({});
  console.log("✓ Account (هەژمارەکان)");

  await prisma.accountType.deleteMany({});
  console.log("✓ AccountType");

  await prisma.product.deleteMany({});
  console.log("✓ Product (کەرەستەکان)");

  await prisma.warehouse.deleteMany({});
  console.log("✓ Warehouse (کۆگاکان)");

  await prisma.invoiceTemplate.deleteMany({});
  console.log("✓ InvoiceTemplate");

  await prisma.district.deleteMany({});
  await prisma.city.deleteMany({});
  await prisma.country.deleteMany({});
  console.log("✓ Locations");

  await prisma.currency.deleteMany({});
  console.log("✓ Currency (دراوەکان)");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ هەموو داتاکان سڕایەوە!\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ٢. دانانی داتای بنەڕەتی (Seed)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("دەستپێکردنی دانانی داتای بنەڕەتی...\n");

  // دراوەکان
  const usd = await prisma.currency.create({
    data: { code: "USD", name: "دۆلار", symbol: "$", rate: 1, isActive: true },
  });
  const iqd = await prisma.currency.create({
    data: { code: "IQD", name: "دینار", symbol: "د.ع", rate: 1500, isActive: true },
  });
  console.log("✓ دراوەکان (USD, IQD)");

  // جۆری هەژمار
  await prisma.accountType.createMany({
    data: [
      { name: "کڕیار",               isBuiltIn: true, showsInSales: true,  showsInPurch: false },
      { name: "دابینکەر",             isBuiltIn: true, showsInSales: false, showsInPurch: true  },
      { name: "کڕیار و دابینکەر",    isBuiltIn: true, showsInSales: true,  showsInPurch: true  },
      { name: "مایەدار (شەریک)",      isBuiltIn: true, showsInSales: false, showsInPurch: false },
    ],
  });
  console.log("✓ جۆری هەژمار (٤ جۆر)");

  // کۆگای سەرەکی
  await prisma.warehouse.create({
    data: { name: "کۆگای سەرەکی", isMain: true, isActive: true },
  });
  console.log("✓ کۆگای سەرەکی");

  // صندووقەکان
  const box1 = await prisma.cashbox.create({
    data: { name: "سندوقی سەرەکی", type: "cash", isActive: true },
  });
  const box2 = await prisma.cashbox.create({
    data: { name: "حیسابی بانک", type: "bank", isActive: true },
  });
  console.log("✓ صندووقەکان (سندوقی سەرەکی + حیسابی بانک)");

  // بیلانسی صندووقەکان (سفر)
  await prisma.cashboxBalance.createMany({
    data: [
      { cashboxId: box1.id, currencyId: usd.id, amount: 0 },
      { cashboxId: box1.id, currencyId: iqd.id, amount: 0 },
      { cashboxId: box2.id, currencyId: usd.id, amount: 0 },
      { cashboxId: box2.id, currencyId: iqd.id, amount: 0 },
    ],
  });
  console.log("✓ بیلانسی صندووقەکان (سفر)");

  console.log("\n🎉 بەرنامەکە ئامادەیە — وەک نصبی نوێ!");
}

main()
  .catch((e) => {
    console.error("\n❌ هەڵە:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

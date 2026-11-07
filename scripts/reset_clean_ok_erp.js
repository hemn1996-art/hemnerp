require("dotenv").config({ path: "c:/Users/ZETTA/OneDrive/Desktop/ok erp/.env" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function resetOkErp() {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("Checking DB URL safety...");
  
  // STRICT SAFETY GUARD
  if (!dbUrl.includes("gkojjisjdghasspyvglc")) {
    throw new Error("SAFETY ABORT: Target database is NOT ok erp (gkojjisjdghasspyvglc). Wiping stopped immediately!");
  }
  if (dbUrl.includes("pxryitvycwbzdivqpweq")) {
    throw new Error("CRITICAL SAFETY ABORT: Client 2 database URL detected! Operation aborted!");
  }

  console.log("Target is verified as OK ERP:", dbUrl.split("@")[1].split("/")[0]);

  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    max: 2,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("\nDeleting all existing transactions and vouchers in OK ERP...");

  await prisma.voucherVersion.deleteMany({});
  console.log("✔ VoucherVersion wiped");

  await prisma.voucherLine.deleteMany({});
  console.log("✔ VoucherLine wiped");

  await prisma.voucherExpense.deleteMany({});
  console.log("✔ VoucherExpense wiped");

  await prisma.voucherPaidAmount.deleteMany({});
  console.log("✔ VoucherPaidAmount wiped");

  await prisma.ledgerEntry.deleteMany({});
  console.log("✔ LedgerEntry wiped");

  await prisma.inventoryTransaction.deleteMany({});
  console.log("✔ InventoryTransaction wiped");

  await prisma.fixedAssetHistory.deleteMany({});
  await prisma.fixedAsset.deleteMany({});
  await prisma.fixedAssetCategory.deleteMany({});
  console.log("✔ FixedAssets wiped");

  await prisma.profitDistributionItem.deleteMany({});
  await prisma.profitDistribution.deleteMany({});
  console.log("✔ ProfitDistribution wiped");

  await prisma.voucher.deleteMany({});
  console.log("✔ Voucher wiped");

  await prisma.cashboxBalance.deleteMany({});
  console.log("✔ CashboxBalance wiped");

  await prisma.cashbox.deleteMany({});
  console.log("✔ Cashbox wiped");

  await prisma.account.deleteMany({});
  console.log("✔ Account wiped");

  await prisma.accountType.deleteMany({});
  console.log("✔ AccountType wiped");

  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.packaging.deleteMany({});
  await prisma.priceType.deleteMany({});
  console.log("✔ Products & catalog wiped");

  await prisma.warehouse.deleteMany({});
  console.log("✔ Warehouse wiped");

  await prisma.invoiceTemplate.deleteMany({});
  await prisma.district.deleteMany({});
  await prisma.city.deleteMany({});
  await prisma.country.deleteMany({});
  console.log("✔ Templates and Locations wiped");

  await prisma.currency.deleteMany({});
  console.log("✔ Currencies wiped");

  console.log("\n--- Seeding clean Day-One Starter Data ---");

  const usd = await prisma.currency.create({
    data: {
      code: "USD",
      name: "دۆلار",
      symbol: "$",
      rate: 1.0,
      rounding: false,
      decimalPlaces: 2,
      isActive: true,
    },
  });

  const iqd = await prisma.currency.create({
    data: {
      code: "IQD",
      name: "دینار",
      symbol: "دینار",
      rate: 1530.0,
      rounding: false,
      decimalPlaces: 0,
      isActive: true,
    },
  });
  console.log("✔ Created Currencies (USD, IQD)");

  await prisma.accountType.createMany({
    data: [
      { name: "کڕیار", isBuiltIn: true, showsInSales: true, showsInPurch: false },
      { name: "دابینکەر", isBuiltIn: true, showsInSales: false, showsInPurch: true },
      { name: "کڕیار و دابینکەر", isBuiltIn: true, showsInSales: true, showsInPurch: true },
      { name: "خەرجی", isBuiltIn: true, showsInSales: false, showsInPurch: false },
      { name: "کارمەند", isBuiltIn: true, showsInSales: false, showsInPurch: false },
    ],
  });
  console.log("✔ Created clean AccountTypes");

  const mainWarehouse = await prisma.warehouse.create({
    data: { name: "کۆگای سەرەکی", isMain: true, isActive: true },
  });
  console.log("✔ Created Main Warehouse:", mainWarehouse.name);

  const mainBox = await prisma.cashbox.create({
    data: { name: "سندوقی سەرەکی", type: "cash", isActive: true },
  });
  console.log("✔ Created Main Cashbox:", mainBox.name);

  await prisma.cashboxBalance.createMany({
    data: [
      { cashboxId: mainBox.id, currencyId: usd.id, amount: 0 },
      { cashboxId: mainBox.id, currencyId: iqd.id, amount: 0 },
    ],
  });
  console.log("✔ Set Cashbox Balances to exact ZERO (0.00)");

  const users = await prisma.user.findMany();
  console.log(`\n✔ Preserved Admin Users (${users.length} user(s) ready for login)`);

  await prisma.$disconnect();
  await pool.end();
  console.log("\n==========================================");
  console.log("OK ERP has been completely reset to ZERO!");
  console.log("==========================================");
}

resetOkErp().catch((err) => {
  console.error("Reset Error:", err);
  process.exit(1);
});

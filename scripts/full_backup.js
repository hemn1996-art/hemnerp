const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runBackup() {
  console.log("Connecting to current database:", process.env.DATABASE_URL?.split("@")[1]);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 15000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Fetching all tables...");
    const [
      users,
      userPermissions,
      currencies,
      countries,
      cities,
      districts,
      accountTypes,
      accounts,
      warehouses,
      cashboxes,
      cashboxBalances,
      categories,
      brands,
      packagings,
      priceTypes,
      products,
      vouchers,
      voucherLines,
      voucherExpenses,
      voucherPaidAmounts,
      voucherVersions,
      ledgerEntries,
      inventoryTransactions,
      invoiceTemplates,
      systemAnnouncements,
      profitDistributions,
      profitDistributionItems,
      fixedAssetCategories,
      fixedAssets,
      fixedAssetHistories,
      loginAttempts,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.userPermission.findMany(),
      prisma.currency.findMany(),
      prisma.country.findMany(),
      prisma.city.findMany(),
      prisma.district.findMany(),
      prisma.accountType.findMany(),
      prisma.account.findMany(),
      prisma.warehouse.findMany(),
      prisma.cashbox.findMany(),
      prisma.cashboxBalance.findMany(),
      prisma.category.findMany(),
      prisma.brand.findMany(),
      prisma.packaging.findMany(),
      prisma.priceType.findMany(),
      prisma.product.findMany(),
      prisma.voucher.findMany(),
      prisma.voucherLine.findMany(),
      prisma.voucherExpense.findMany(),
      prisma.voucherPaidAmount.findMany(),
      prisma.voucherVersion.findMany(),
      prisma.ledgerEntry.findMany(),
      prisma.inventoryTransaction.findMany(),
      prisma.invoiceTemplate.findMany(),
      prisma.systemAnnouncement.findMany(),
      prisma.profitDistribution.findMany(),
      prisma.profitDistributionItem.findMany(),
      prisma.fixedAssetCategory.findMany(),
      prisma.fixedAsset.findMany(),
      prisma.fixedAssetHistory.findMany(),
      prisma.loginAttempt.findMany(),
    ]);

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        userPermissions: userPermissions.length,
        currencies: currencies.length,
        accounts: accounts.length,
        products: products.length,
        vouchers: vouchers.length,
        voucherLines: voucherLines.length,
        ledgerEntries: ledgerEntries.length,
        inventoryTransactions: inventoryTransactions.length,
        cashboxes: cashboxes.length,
        warehouses: warehouses.length,
      },
      data: {
        users,
        userPermissions,
        currencies,
        countries,
        cities,
        districts,
        accountTypes,
        accounts,
        warehouses,
        cashboxes,
        cashboxBalances,
        categories,
        brands,
        packagings,
        priceTypes,
        products,
        vouchers,
        voucherLines,
        voucherExpenses,
        voucherPaidAmounts,
        voucherVersions,
        ledgerEntries,
        inventoryTransactions,
        invoiceTemplates,
        systemAnnouncements,
        profitDistributions,
        profitDistributionItems,
        fixedAssetCategories,
        fixedAssets,
        fixedAssetHistories,
        loginAttempts,
      },
    };

    const backupDir = path.join(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup_tokyo_${Date.now()}.json`;
    const filePath = path.join(backupDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf8");

    console.log("\n==========================================");
    console.log("✅ FULL BACKUP COMPLETED SUCCESSFULLY!");
    console.log("📁 Saved to:", filePath);
    console.log("📊 Summary of Records:", JSON.stringify(backupData.counts, null, 2));
    console.log("==========================================\n");
  } catch (err) {
    console.error("❌ Backup failed:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runBackup();

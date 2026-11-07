import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Automated scheduled cron backup endpoint
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.SESSION_SECRET || "orient-iraq-cron-2026";
    
    // Verify bearer secret for automated cron jobs
    if (authHeader !== `Bearer ${cronSecret}` && request.headers.get("x-cron-secret") !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const [
      currencies,
      countries,
      cities,
      districts,
      accountTypes,
      accounts,
      warehouses,
      cashboxes,
      cashboxBalances,
      products,
      vouchers,
      voucherLines,
      voucherExpenses,
      voucherPaidAmounts,
      voucherVersions,
      ledgerEntries,
      inventoryTransactions,
      invoiceTemplates,
      categories,
      brands,
      packagings,
      priceTypes,
      systemAnnouncements,
      profitDistributions,
      profitDistributionItems,
      fixedAssetCategories,
      fixedAssets,
      fixedAssetHistories,
    ] = await Promise.all([
      prisma.currency.findMany(),
      prisma.country.findMany(),
      prisma.city.findMany(),
      prisma.district.findMany(),
      prisma.accountType.findMany(),
      prisma.account.findMany(),
      prisma.warehouse.findMany(),
      prisma.cashbox.findMany(),
      prisma.cashboxBalance.findMany(),
      prisma.product.findMany(),
      prisma.voucher.findMany(),
      prisma.voucherLine.findMany(),
      prisma.voucherExpense.findMany(),
      prisma.voucherPaidAmount.findMany(),
      prisma.voucherVersion.findMany(),
      prisma.ledgerEntry.findMany(),
      prisma.inventoryTransaction.findMany(),
      prisma.invoiceTemplate.findMany(),
      prisma.category.findMany(),
      prisma.brand.findMany(),
      prisma.packaging.findMany(),
      prisma.priceType.findMany(),
      prisma.systemAnnouncement.findMany(),
      prisma.profitDistribution.findMany(),
      prisma.profitDistributionItem.findMany(),
      prisma.fixedAssetCategory.findMany(),
      prisma.fixedAsset.findMany(),
      prisma.fixedAssetHistory.findMany(),
    ]);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    const backupData = {
      version: "2.0",
      createdAt: now.toISOString(),
      data: {
        currencies,
        countries,
        cities,
        districts,
        accountTypes,
        accounts,
        warehouses,
        cashboxes,
        cashboxBalances,
        products,
        vouchers,
        voucherLines,
        voucherExpenses,
        voucherPaidAmounts,
        voucherVersions,
        ledgerEntries,
        inventoryTransactions,
        invoiceTemplates,
        categories,
        brands,
        packagings,
        priceTypes,
        systemAnnouncements,
        profitDistributions,
        profitDistributionItems,
        fixedAssetCategories,
        fixedAssets,
        fixedAssetHistories,
      },
      stats: {
        currencies: currencies.length,
        accounts: accounts.length,
        products: products.length,
        vouchers: vouchers.length,
        voucherLines: voucherLines.length,
        ledgerEntries: ledgerEntries.length,
        inventoryTransactions: inventoryTransactions.length,
        categories: categories.length,
        brands: brands.length,
        fixedAssets: fixedAssets.length,
      },
    };

    const fileName = `backup-${dateStr}.json`;
    let savedOnServer = false;

    // Try process.cwd() / backups first
    let backupDir = path.join(process.cwd(), "backups");
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const filePath = path.join(backupDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
      savedOnServer = true;
    } catch (err) {
      // Fallback to /tmp / backups on serverless
      try {
        backupDir = path.join("/tmp", "backups");
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const filePath = path.join(backupDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
        savedOnServer = true;
      } catch (tmpErr) {
        console.error("Cron backup /tmp write failed:", tmpErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Automated daily backup completed successfully",
      fileName,
      savedOnServer,
      stats: backupData.stats,
    });
  } catch (error: any) {
    console.error("Cron backup error:", error);
    return NextResponse.json({ error: error.message || "Failed automated backup" }, { status: 500 });
  }
}

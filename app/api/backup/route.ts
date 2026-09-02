import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

async function getFullBackupData() {
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

  return {
    version: "2.0",
    createdAt: new Date().toISOString(),
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
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backupData = await getFullBackupData();
    return NextResponse.json(backupData, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Backup GET error:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// POST: Save backup to server file system (with /tmp fallback)
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const backupData = await getFullBackupData();

    const fileName = `backup-${dateStr}.json`;
    let filePath = "";
    let fileSize = "0 KB";
    let savedOnServer = false;

    // 1. Try process.cwd() / backups
    let backupDir = path.join(process.cwd(), "backups");
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      filePath = path.join(backupDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
      
      const fileStat = fs.statSync(filePath);
      fileSize = `${(fileStat.size / 1024).toFixed(1)} KB`;
      savedOnServer = true;
    } catch (err) {
      console.warn("Failed to save backup to process.cwd(), attempting fallback to /tmp/backups...", err);
      // 2. Fallback to /tmp / backups
      try {
        backupDir = path.join("/tmp", "backups");
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        filePath = path.join(backupDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
        
        const fileStat = fs.statSync(filePath);
        fileSize = `${(fileStat.size / 1024).toFixed(1)} KB`;
        savedOnServer = true;
      } catch (tmpErr) {
        console.error("Failed to save backup to /tmp as well:", tmpErr);
        // Do not fail the whole request, return success: true but savedOnServer: false
      }
    }

    return NextResponse.json(
      {
        success: true,
        fileName,
        filePath: savedOnServer ? filePath : null,
        fileSize,
        savedOnServer,
        createdAt: now.toISOString(),
        stats: backupData.stats,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Backup POST error:", error);
    return NextResponse.json(
      { error: "Failed to save backup" },
      { status: 500 }
    );
  }
}

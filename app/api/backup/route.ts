import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Export all tables
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
    ]);

    const backupData = {
      version: "1.0",
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
      },
      stats: {
        currencies: currencies.length,
        accounts: accounts.length,
        products: products.length,
        vouchers: vouchers.length,
        voucherLines: voucherLines.length,
        ledgerEntries: ledgerEntries.length,
        inventoryTransactions: inventoryTransactions.length,
      },
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// POST: Save backup to server file system
export async function POST() {
  try {
    // Export all tables
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
    ]);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // e.g. 2026-06-05

    const backupData = {
      version: "1.0",
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
      },
      stats: {
        currencies: currencies.length,
        accounts: accounts.length,
        products: products.length,
        vouchers: vouchers.length,
        voucherLines: voucherLines.length,
        ledgerEntries: ledgerEntries.length,
        inventoryTransactions: inventoryTransactions.length,
      },
    };

    // Create backups directory
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // File name: backup-2026-06-05.json (one per day)
    const fileName = `backup-${dateStr}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

    // Get file size
    const fileStat = fs.statSync(filePath);
    const fileSizeKB = (fileStat.size / 1024).toFixed(1);

    return NextResponse.json({
      success: true,
      fileName,
      filePath,
      fileSize: `${fileSizeKB} KB`,
      createdAt: now.toISOString(),
      stats: backupData.stats,
    });
  } catch (error) {
    console.error("Backup save error:", error);
    return NextResponse.json(
      { error: "Failed to save backup" },
      { status: 500 }
    );
  }
}

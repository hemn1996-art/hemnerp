import { NextResponse } from "next/server";
import { prisma, directPrisma } from "../../../../lib/prisma";
import { verifyPassword, getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Enforce active admin session check
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "دەسەڵاتی بەڕێوەبەرت نییە بۆ ئەم کردارە ❌" },
        { status: 403 }
      );
    }

    const passwordHeader = request.headers.get("x-auth-password");
    const password = passwordHeader ? decodeURIComponent(passwordHeader) : "";

    if (!password) {
      return NextResponse.json(
        { error: "پاسوۆردی بەڕێوبەر پێویستە ❌" },
        { status: 401 }
      );
    }

    // 2. Fetch authenticated admin user directly from database by ID
    const adminUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!adminUser || !adminUser.isActive || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "دەسەڵاتی بەڕێوەبەرت نییە یان هەژمارەکەت ناچالاکە ❌" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, adminUser.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "پاسوۆردی بەڕێوبەر هەڵەیە ❌" },
        { status: 401 }
      );
    }

    const backupData = await request.json();

    if (!backupData || !backupData.data) {
      return NextResponse.json(
        { error: "فایلی باکئەپ نادروستە" },
        { status: 400 }
      );
    }

    const d = backupData.data;

    // Run the entire restore process in a single transaction block on the direct connection
    await directPrisma.$transaction(async (tx) => {
      // 1. Delete all data using a single TRUNCATE CASCADE statement to prevent deadlocks and lock conflicts
      await tx.$executeRawUnsafe(`
        TRUNCATE TABLE 
          "FixedAssetHistory", "FixedAsset", "FixedAssetCategory", 
          "ProfitDistributionItem", "ProfitDistribution", "SystemAnnouncement", 
          "InventoryTransaction", "LedgerEntry", "VoucherPaidAmount", 
          "VoucherExpense", "VoucherLine", "VoucherVersion", "Voucher", 
          "CashboxBalance", "Cashbox", "Product", "InvoiceTemplate", 
          "Account", "AccountType", "District", "City", "Country", 
          "Warehouse", "Currency", "Category", "Brand", "Packaging", "PriceType" 
        RESTART IDENTITY CASCADE;
      `);

      // 2. Re-insert all data in correct order (parents first, children last)

      if (d.categories?.length) {
        await tx.category.createMany({
          data: d.categories.map((r: any) => ({
            id: r.id, name: r.name, isActive: r.isActive ?? true,
          })),
          skipDuplicates: true,
        });
      }

      if (d.brands?.length) {
        await tx.brand.createMany({
          data: d.brands.map((r: any) => ({
            id: r.id, name: r.name, isActive: r.isActive ?? true,
          })),
          skipDuplicates: true,
        });
      }

      if (d.packagings?.length) {
        await tx.packaging.createMany({
          data: d.packagings.map((r: any) => ({
            id: r.id, name: r.name, isActive: r.isActive ?? true,
          })),
          skipDuplicates: true,
        });
      }

      if (d.priceTypes?.length) {
        await tx.priceType.createMany({
          data: d.priceTypes.map((r: any) => ({
            id: r.id, name: r.name, isActive: r.isActive ?? true,
          })),
          skipDuplicates: true,
        });
      }

      if (d.currencies?.length) {
        await tx.currency.createMany({
          data: d.currencies.map((r: any) => ({
            id: r.id, code: r.code, name: r.name, symbol: r.symbol, rate: r.rate,
            mode: r.mode, rounding: r.rounding, color: r.color, isActive: r.isActive,
            createdAt: new Date(r.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.countries?.length) {
        await tx.country.createMany({
          data: d.countries.map((r: any) => ({
            id: r.id, name: r.name,
          })),
          skipDuplicates: true,
        });
      }

      if (d.cities?.length) {
        await tx.city.createMany({
          data: d.cities.map((r: any) => ({
            id: r.id, name: r.name, countryId: r.countryId,
          })),
          skipDuplicates: true,
        });
      }

      if (d.districts?.length) {
        await tx.district.createMany({
          data: d.districts.map((r: any) => ({
            id: r.id, name: r.name, cityId: r.cityId,
          })),
          skipDuplicates: true,
        });
      }

      if (d.accountTypes?.length) {
        await tx.accountType.createMany({
          data: d.accountTypes.map((r: any) => ({
            id: r.id, name: r.name, isBuiltIn: r.isBuiltIn, showsInSales: r.showsInSales,
            showsInPurch: r.showsInPurch, isActive: r.isActive,
          })),
          skipDuplicates: true,
        });
      }

      if (d.accounts?.length) {
        await tx.account.createMany({
          data: d.accounts.map((r: any) => ({
            id: r.id, name: r.name, phone: r.phone, fullAddress: r.fullAddress,
            countryId: r.countryId, cityId: r.cityId, districtId: r.districtId,
            accountTypeId: r.accountTypeId, isShareholder: r.isShareholder ?? false,
            sharePercentage: r.sharePercentage ?? 0,
            creditLimit: r.creditLimit ?? 0,
            creditLimitCurrencyId: r.creditLimitCurrencyId ?? 11,
            debtAlertDays: r.debtAlertDays ?? 0,
            discountPercent: r.discountPercent ?? 0,
            guarantorName: r.guarantorName ?? null,
            notes: r.notes ?? null,
            exchangeRateType: r.exchangeRateType ?? "DAILY_MARKET",
            customExchangeRate: r.customExchangeRate ?? 132000,
            isActive: r.isActive ?? true,
            createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.warehouses?.length) {
        await tx.warehouse.createMany({
          data: d.warehouses.map((r: any) => ({
            id: r.id, name: r.name, color: r.color, isMain: r.isMain,
            isActive: r.isActive, createdAt: new Date(r.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.cashboxes?.length) {
        await tx.cashbox.createMany({
          data: d.cashboxes.map((r: any) => ({
            id: r.id, name: r.name, type: r.type, isActive: r.isActive,
            createdAt: new Date(r.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.cashboxBalances?.length) {
        await tx.cashboxBalance.createMany({
          data: d.cashboxBalances.map((r: any) => ({
            id: r.id, cashboxId: r.cashboxId, currencyId: r.currencyId, amount: r.amount,
          })),
          skipDuplicates: true,
        });
      }

      if (d.products?.length) {
        await tx.product.createMany({
          data: d.products.map((r: any) => ({
            id: r.id, code: r.code, name: r.name, category: r.category,
            brand: r.brand, packaging: r.packaging, isMultiBatch: r.isMultiBatch,
            isExpense: r.isExpense ?? false, isService: r.isService ?? false,
            isActive: r.isActive ?? true,
            salePrices: typeof r.salePrices === "string" ? r.salePrices : JSON.stringify(r.salePrices || []),
            lowStockAlert: r.lowStockAlert ?? 0,
            hasExpiry: r.hasExpiry ?? false,
            expiryAlertDays: r.expiryAlertDays ?? 0,
            createdAt: new Date(r.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.vouchers?.length) {
        await tx.voucher.createMany({
          data: d.vouchers.map((r: any) => ({
            id: r.id, type: r.type, referenceNo: r.referenceNo,
            date: new Date(r.date), accountId: r.accountId, cashboxId: r.cashboxId,
            fromCashboxId: r.fromCashboxId, toCashboxId: r.toCashboxId,
            currencyId: r.currencyId, exchangeRate: r.exchangeRate,
            totalAmount: r.totalAmount, totalDiscount: r.totalDiscount,
            netAmount: r.netAmount, internalNote: r.internalNote, printNote: r.printNote,
            isSaved: r.isSaved ?? true, isDeleted: r.isDeleted ?? false,
            employeeName: r.employeeName || "کۆسار",
            createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
            hasDelivery: r.hasDelivery ?? false, driverName: r.driverName,
            driverPhone: r.driverPhone, deliveryCity: r.deliveryCity,
            deliveryAddress: r.deliveryAddress, deliveryFee: r.deliveryFee,
            extraPaymentHandling: r.extraPaymentHandling,
          })),
          skipDuplicates: true,
        });
      }

      if (d.voucherLines?.length) {
        await tx.voucherLine.createMany({
          data: d.voucherLines.map((r: any) => ({
            id: r.id, voucherId: r.voucherId, productId: r.productId,
            qty: r.qty, unitPrice: r.unitPrice, discountPercent: r.discountPercent,
            discountAmount: r.discountAmount, lineTotal: r.lineTotal, note: r.note,
            currencyId: r.currencyId ?? null,
          })),
          skipDuplicates: true,
        });
      }

      if (d.voucherExpenses?.length) {
        await tx.voucherExpense.createMany({
          data: d.voucherExpenses.map((r: any) => ({
            id: r.id, voucherId: r.voucherId, amount: r.amount,
            currencyId: r.currencyId, accountId: r.accountId, note: r.note,
            addToAccountDebt: r.addToAccountDebt ?? false,
          })),
          skipDuplicates: true,
        });
      }

      if (d.voucherPaidAmounts?.length) {
        await tx.voucherPaidAmount.createMany({
          data: d.voucherPaidAmounts.map((r: any) => ({
            id: r.id, voucherId: r.voucherId, currencyId: r.currencyId,
            amount: r.amount, exchangeRate: r.exchangeRate,
          })),
          skipDuplicates: true,
        });
      }

      if (d.voucherVersions?.length) {
        await tx.voucherVersion.createMany({
          data: d.voucherVersions.map((r: any) => ({
            id: r.id, voucherId: r.voucherId, version: r.version,
            data: typeof r.data === "string" ? r.data : JSON.stringify(r.data),
            employeeName: r.employeeName || "کۆسار",
            updatedAt: new Date(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.ledgerEntries?.length) {
        await tx.ledgerEntry.createMany({
          data: d.ledgerEntries.map((r: any) => ({
            id: r.id, voucherId: r.voucherId, accountId: r.accountId,
            currencyId: r.currencyId, debit: r.debit, credit: r.credit,
            exchangeRate: r.exchangeRate, date: new Date(r.date),
          })),
          skipDuplicates: true,
        });
      }

      if (d.inventoryTransactions?.length) {
        await tx.inventoryTransaction.createMany({
          data: d.inventoryTransactions.map((r: any) => ({
            id: r.id, voucherId: r.voucherId, productId: r.productId,
            warehouseId: r.warehouseId, batchNo: r.batchNo, qtyChange: r.qtyChange,
            unitCost: r.unitCost, currencyId: r.currencyId ?? null, date: new Date(r.date),
          })),
          skipDuplicates: true,
        });
      }

      if (d.invoiceTemplates?.length) {
        await tx.invoiceTemplate.createMany({
          data: d.invoiceTemplates.map((r: any) => ({
            id: r.id, name: r.name, isActive: r.isActive, isMain: r.isMain,
            format: r.format, headerImage: r.headerImage, footerImage: r.footerImage,
            watermarkImage: r.watermarkImage, statementHeaderImage: r.statementHeaderImage,
            fixedNote: r.fixedNote, tableHeaderBg: r.tableHeaderBg,
            tableHeaderColor: r.tableHeaderColor, employeeName: r.employeeName,
            createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.systemAnnouncements?.length) {
        await tx.systemAnnouncement.createMany({
          data: d.systemAnnouncements.map((r: any) => ({
            id: r.id, message: r.message, type: r.type ?? "info",
            isActive: r.isActive ?? true, createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.profitDistributions?.length) {
        await tx.profitDistribution.createMany({
          data: d.profitDistributions.map((r: any) => ({
            id: r.id, date: new Date(r.date), calculatedProfit: r.calculatedProfit,
            distributedProfit: r.distributedProfit, note: r.note,
            createdAt: new Date(r.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.profitDistributionItems?.length) {
        await tx.profitDistributionItem.createMany({
          data: d.profitDistributionItems.map((r: any) => ({
            id: r.id, distributionId: r.distributionId, accountId: r.accountId,
            accountName: r.accountName, sharePercentage: r.sharePercentage,
            previousBalance: r.previousBalance, profitShare: r.profitShare,
            finalBalance: r.finalBalance,
          })),
          skipDuplicates: true,
        });
      }

      if (d.fixedAssetCategories?.length) {
        await tx.fixedAssetCategory.createMany({
          data: d.fixedAssetCategories.map((r: any) => ({
            id: r.id, name: r.name, createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.fixedAssets?.length) {
        await tx.fixedAsset.createMany({
          data: d.fixedAssets.map((r: any) => ({
            id: r.id, name: r.name, categoryId: r.categoryId, code: r.code,
            initialValue: r.initialValue, currentValue: r.currentValue,
            purchaseDate: new Date(r.purchaseDate), isActive: r.isActive,
            createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      if (d.fixedAssetHistories?.length) {
        await tx.fixedAssetHistory.createMany({
          data: d.fixedAssetHistories.map((r: any) => ({
            id: r.id, assetId: r.assetId, value: r.value, changeDate: new Date(r.changeDate),
            note: r.note, createdAt: new Date(r.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      // Reset sequences so new auto-increment IDs don't conflict
      const tables = [
        "Currency", "Country", "City", "District", "AccountType", "Account",
        "Warehouse", "Cashbox", "CashboxBalance", "Product", "Voucher",
        "VoucherLine", "VoucherExpense", "VoucherPaidAmount", "VoucherVersion",
        "LedgerEntry", "InventoryTransaction", "InvoiceTemplate",
        "Category", "Brand", "Packaging", "PriceType", "SystemAnnouncement",
        "ProfitDistribution", "ProfitDistributionItem", "FixedAssetCategory",
        "FixedAsset", "FixedAssetHistory"
      ];

      for (const table of tables) {
        try {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
          );
        } catch {
          // Skip if table is empty or sequence doesn't exist
        }
      }
    }, {
      timeout: 180000 // 3 minutes timeout
    });

    return NextResponse.json({
      success: true,
      message: "باکئەپ بە سەرکەوتوویی گەڕێنرایەوە",
      stats: backupData.stats || {},
    });
  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "هەڵە لە گەڕاندنەوەی باکئەپ: " + (error.message || "نەزانراو") },
      { status: 500 }
    );
  }
}

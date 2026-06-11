import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const usernameHeader = request.headers.get("x-auth-username");
    const passwordHeader = request.headers.get("x-auth-password");

    const username = usernameHeader ? decodeURIComponent(usernameHeader) : "";
    const password = passwordHeader ? decodeURIComponent(passwordHeader) : "";

    const expectedUsername = process.env.APP_USERNAME || "admin";
    const expectedPassword = process.env.APP_PASSWORD || "admin123";

    if (username !== expectedUsername || password !== expectedPassword) {
      return NextResponse.json(
        { error: "یوزەرنەیم یان پاسوۆردی بەڕێوبەر هەڵەیە ❌" },
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

    // Delete all data in correct order (children first, parents last)
    await prisma.$transaction([
      prisma.inventoryTransaction.deleteMany(),
      prisma.ledgerEntry.deleteMany(),
      prisma.voucherPaidAmount.deleteMany(),
      prisma.voucherExpense.deleteMany(),
      prisma.voucherLine.deleteMany(),
      prisma.voucherVersion.deleteMany(),
      prisma.voucher.deleteMany(),
      prisma.cashboxBalance.deleteMany(),
      prisma.cashbox.deleteMany(),
      prisma.product.deleteMany(),
      prisma.invoiceTemplate.deleteMany(),
      prisma.account.deleteMany(),
      prisma.accountType.deleteMany(),
      prisma.district.deleteMany(),
      prisma.city.deleteMany(),
      prisma.country.deleteMany(),
      prisma.warehouse.deleteMany(),
      prisma.currency.deleteMany(),
    ]);

    // Re-insert all data in correct order (parents first, children last)
    // Use createMany with skipDuplicates for safety

    if (d.currencies?.length) {
      await prisma.currency.createMany({ data: d.currencies.map((r: any) => ({
        id: r.id, code: r.code, name: r.name, symbol: r.symbol, rate: r.rate,
        mode: r.mode, rounding: r.rounding, color: r.color, isActive: r.isActive,
        createdAt: new Date(r.createdAt),
      })), skipDuplicates: true });
    }

    if (d.countries?.length) {
      await prisma.country.createMany({ data: d.countries.map((r: any) => ({
        id: r.id, name: r.name,
      })), skipDuplicates: true });
    }

    if (d.cities?.length) {
      await prisma.city.createMany({ data: d.cities.map((r: any) => ({
        id: r.id, name: r.name, countryId: r.countryId,
      })), skipDuplicates: true });
    }

    if (d.districts?.length) {
      await prisma.district.createMany({ data: d.districts.map((r: any) => ({
        id: r.id, name: r.name, cityId: r.cityId,
      })), skipDuplicates: true });
    }

    if (d.accountTypes?.length) {
      await prisma.accountType.createMany({ data: d.accountTypes.map((r: any) => ({
        id: r.id, name: r.name, isBuiltIn: r.isBuiltIn, showsInSales: r.showsInSales,
        showsInPurch: r.showsInPurch, isActive: r.isActive,
      })), skipDuplicates: true });
    }

    if (d.accounts?.length) {
      await prisma.account.createMany({ data: d.accounts.map((r: any) => ({
        id: r.id, name: r.name, phone: r.phone, fullAddress: r.fullAddress,
        countryId: r.countryId, cityId: r.cityId, districtId: r.districtId,
        accountTypeId: r.accountTypeId, isShareholder: r.isShareholder,
        isActive: r.isActive, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
      })), skipDuplicates: true });
    }

    if (d.warehouses?.length) {
      await prisma.warehouse.createMany({ data: d.warehouses.map((r: any) => ({
        id: r.id, name: r.name, color: r.color, isMain: r.isMain,
        isActive: r.isActive, createdAt: new Date(r.createdAt),
      })), skipDuplicates: true });
    }

    if (d.cashboxes?.length) {
      await prisma.cashbox.createMany({ data: d.cashboxes.map((r: any) => ({
        id: r.id, name: r.name, type: r.type, isActive: r.isActive,
        createdAt: new Date(r.createdAt),
      })), skipDuplicates: true });
    }

    if (d.cashboxBalances?.length) {
      await prisma.cashboxBalance.createMany({ data: d.cashboxBalances.map((r: any) => ({
        id: r.id, cashboxId: r.cashboxId, currencyId: r.currencyId, amount: r.amount,
      })), skipDuplicates: true });
    }

    if (d.products?.length) {
      await prisma.product.createMany({ data: d.products.map((r: any) => ({
        id: r.id, code: r.code, name: r.name, isMultiBatch: r.isMultiBatch,
        isExpense: r.isExpense, isService: r.isService, isActive: r.isActive,
        createdAt: new Date(r.createdAt),
      })), skipDuplicates: true });
    }

    if (d.vouchers?.length) {
      await prisma.voucher.createMany({ data: d.vouchers.map((r: any) => ({
        id: r.id, type: r.type, referenceNo: r.referenceNo,
        date: new Date(r.date), accountId: r.accountId, cashboxId: r.cashboxId,
        fromCashboxId: r.fromCashboxId, toCashboxId: r.toCashboxId,
        currencyId: r.currencyId, exchangeRate: r.exchangeRate,
        totalAmount: r.totalAmount, totalDiscount: r.totalDiscount,
        netAmount: r.netAmount, internalNote: r.internalNote, printNote: r.printNote,
        isSaved: r.isSaved, employeeName: r.employeeName,
        createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
        hasDelivery: r.hasDelivery, driverName: r.driverName,
        driverPhone: r.driverPhone, deliveryCity: r.deliveryCity,
        deliveryAddress: r.deliveryAddress, deliveryFee: r.deliveryFee,
        extraPaymentHandling: r.extraPaymentHandling,
      })), skipDuplicates: true });
    }

    if (d.voucherLines?.length) {
      await prisma.voucherLine.createMany({ data: d.voucherLines.map((r: any) => ({
        id: r.id, voucherId: r.voucherId, productId: r.productId,
        qty: r.qty, unitPrice: r.unitPrice, discountPercent: r.discountPercent,
        discountAmount: r.discountAmount, lineTotal: r.lineTotal, note: r.note,
      })), skipDuplicates: true });
    }

    if (d.voucherExpenses?.length) {
      await prisma.voucherExpense.createMany({ data: d.voucherExpenses.map((r: any) => ({
        id: r.id, voucherId: r.voucherId, amount: r.amount,
        currencyId: r.currencyId, accountId: r.accountId, note: r.note,
        addToAccountDebt: r.addToAccountDebt,
      })), skipDuplicates: true });
    }

    if (d.voucherPaidAmounts?.length) {
      await prisma.voucherPaidAmount.createMany({ data: d.voucherPaidAmounts.map((r: any) => ({
        id: r.id, voucherId: r.voucherId, currencyId: r.currencyId,
        amount: r.amount, exchangeRate: r.exchangeRate,
      })), skipDuplicates: true });
    }

    if (d.voucherVersions?.length) {
      await prisma.voucherVersion.createMany({ data: d.voucherVersions.map((r: any) => ({
        id: r.id, voucherId: r.voucherId, version: r.version,
        data: r.data, employeeName: r.employeeName, updatedAt: new Date(r.updatedAt),
      })), skipDuplicates: true });
    }

    if (d.ledgerEntries?.length) {
      await prisma.ledgerEntry.createMany({ data: d.ledgerEntries.map((r: any) => ({
        id: r.id, voucherId: r.voucherId, accountId: r.accountId,
        currencyId: r.currencyId, debit: r.debit, credit: r.credit,
        exchangeRate: r.exchangeRate, date: new Date(r.date),
      })), skipDuplicates: true });
    }

    if (d.inventoryTransactions?.length) {
      await prisma.inventoryTransaction.createMany({ data: d.inventoryTransactions.map((r: any) => ({
        id: r.id, voucherId: r.voucherId, productId: r.productId,
        warehouseId: r.warehouseId, batchNo: r.batchNo, qtyChange: r.qtyChange,
        unitCost: r.unitCost, date: new Date(r.date),
      })), skipDuplicates: true });
    }

    if (d.invoiceTemplates?.length) {
      await prisma.invoiceTemplate.createMany({ data: d.invoiceTemplates.map((r: any) => ({
        id: r.id, name: r.name, isActive: r.isActive, isMain: r.isMain,
        format: r.format, headerImage: r.headerImage, footerImage: r.footerImage,
        watermarkImage: r.watermarkImage, statementHeaderImage: r.statementHeaderImage,
        fixedNote: r.fixedNote, tableHeaderBg: r.tableHeaderBg,
        tableHeaderColor: r.tableHeaderColor, employeeName: r.employeeName,
        createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
      })), skipDuplicates: true });
    }

    // Reset sequences so new auto-increment IDs don't conflict
    const tables = [
      "Currency", "Country", "City", "District", "AccountType", "Account",
      "Warehouse", "Cashbox", "CashboxBalance", "Product", "Voucher",
      "VoucherLine", "VoucherExpense", "VoucherPaidAmount", "VoucherVersion",
      "LedgerEntry", "InventoryTransaction", "InvoiceTemplate"
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
        );
      } catch {
        // Skip if table is empty or sequence doesn't exist
      }
    }

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

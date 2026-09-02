import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    const voucherType = searchParams.get("voucherType");
    const productId = searchParams.get("productId");
    const accountId = searchParams.get("accountId");
    const accountTypeId = searchParams.get("accountTypeId");
    const warehouseId = searchParams.get("warehouseId");
    const currencyId = searchParams.get("currencyId");
    const createdBy = searchParams.get("createdBy");
    const itemCode = searchParams.get("itemCode");
    const batchCode = searchParams.get("batchCode");

    const parseNumberArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        return { in: val.split(",").map(id => parseInt(id)).filter(id => !isNaN(id)) };
      }
      const parsed = parseInt(val);
      return isNaN(parsed) ? undefined : parsed;
    };

    const parseStringArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        return { in: val.split(",") };
      }
      return val;
    };

    // Build where clause
    const where: any = { voucher: { isDeleted: false } };
    
    if (startDate || endDate) {
      where.voucher.date = {};
      if (startDate) where.voucher.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.voucher.date.lte = end;
      }
    }

    if (accountId && accountId !== "all") {
      const parsed = parseNumberArray(accountId);
      if (parsed) where.voucher.accountId = parsed;
    }

    if (accountTypeId && accountTypeId !== "all") {
      const parsed = parseNumberArray(accountTypeId);
      if (parsed) where.voucher.account = { ...where.voucher.account, accountTypeId: parsed };
    }

    const rateType = searchParams.get("rateType");
    if (rateType && rateType !== "all") {
      where.voucher.account = { ...where.voucher.account, exchangeRateType: rateType };
    }

    if (voucherType && voucherType !== "all") {
      const parsed = parseStringArray(voucherType);
      if (parsed) where.voucher.type = parsed;
    }

    if (productId && productId !== "all") {
      const parsed = parseNumberArray(productId);
      if (parsed) where.productId = parsed;
    }

    if (currencyId && currencyId !== "all") {
      const parsed = parseNumberArray(currencyId);
      if (parsed) where.voucher.currencyId = parsed;
    }

    if (createdBy && createdBy !== "all" && createdBy !== "") {
      const parsed = parseStringArray(createdBy);
      if (parsed) where.voucher.employeeName = parsed;
    }

    const category = searchParams.get("category");
    const brand = searchParams.get("brand");

    where.product = where.product || {};
    if (category && category !== "all") {
      const parsed = parseStringArray(category);
      if (parsed) where.product.category = parsed;
    }
    if (brand && brand !== "all") {
      const parsed = parseStringArray(brand);
      if (parsed) where.product.brand = parsed;
    }

    if (itemCode && itemCode.trim() !== "") {
      where.product.code = { contains: itemCode.trim(), mode: 'insensitive' };
    }

    if (Object.keys(where.product).length === 0) {
      delete where.product;
    }

    const txFilter: any = {};
    if (warehouseId && warehouseId !== "all") {
      const parsed = parseNumberArray(warehouseId);
      if (parsed) txFilter.warehouseId = parsed;
    }
    if (batchCode && batchCode.trim() !== "") {
      txFilter.batchNo = { contains: batchCode.trim(), mode: 'insensitive' };
    }
    if (Object.keys(txFilter).length > 0) {
      where.voucher.inventoryTransactions = { some: txFilter };
    }

    const lines = await prisma.voucherLine.findMany({
      where,
      select: {
        id: true,
        voucherId: true,
        qty: true,
        unitPrice: true,
        lineTotal: true,
        currencyId: true,
        productId: true,
        product: { select: { name: true, code: true, category: true, brand: true } },
        voucher: {
          select: {
            referenceNo: true,
            type: true,
            date: true,
            employeeName: true,
            currencyId: true,
            account: { select: { name: true, exchangeRateType: true } },
            inventoryTransactions: {
              select: {
                productId: true,
                batchNo: true,
                warehouse: { select: { name: true } }
              }
            }
          },
        },
      },
      orderBy: { voucher: { date: "desc" } }
    });

    const items = lines.map(line => {
      const matchTx = line.voucher.inventoryTransactions.find(t => t.productId === line.productId);
      const unitPrice = line.unitPrice || 0;
      const lineTotal = line.lineTotal || 0;

      const effectiveCurrencyId = line.currencyId || line.voucher.currencyId || 1;

      return {
        id: line.id,
        voucherId: line.voucherId,
        voucherReference: line.voucherId.toString(),
        voucherType: line.voucher.type,
        productName: line.product.name,
        productCode: line.product.code || "-",
        category: line.product.category || "-",
        brand: line.product.brand || "-",
        label: "-",
        warehouseName: matchTx?.warehouse?.name || "-",
        quantity: line.qty || 0,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
        currencyId: effectiveCurrencyId,
        accountName: line.voucher.account?.name || "نەزانراو",
        exchangeRateType: line.voucher.account?.exchangeRateType || "DAILY_MARKET",
        date: line.voucher.date,
        employeeName: line.voucher.employeeName || "-",
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items report:", error);
    return NextResponse.json({ error: "Failed to fetch items report" }, { status: 500 });
  }
}

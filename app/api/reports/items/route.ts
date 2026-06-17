import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
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
    const where: any = { voucher: {} };
    
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
      if (parsed) where.voucher.account = { accountTypeId: parsed };
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

    if (itemCode && itemCode.trim() !== "") {
      where.product = {
        code: { contains: itemCode.trim(), mode: 'insensitive' }
      };
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

    if (Object.keys(where.voucher).length === 0) {
      delete where.voucher;
    }

    const lines = await prisma.voucherLine.findMany({
      where,
      select: {
        id: true,
        voucherId: true,
        qty: true,
        lineTotal: true,
        productId: true,
        product: { select: { name: true, code: true } },
        voucher: {
          select: {
            referenceNo: true,
            type: true,
            date: true,
            employeeName: true,
            currencyId: true,
            account: { select: { name: true } },
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
      return {
        id: line.id,
        voucherId: line.voucherId,
        voucherReference: line.voucherId.toString(),
        voucherType: line.voucher.type,
        productName: line.product.name,
        productCode: line.product.code || "-",
        category: "-",
        brand: "-",
        label: "-",
        warehouseName: matchTx?.warehouse?.name || "-",
        quantity: line.qty || 0,
        lineTotal: line.lineTotal || 0,
        currencyId: line.voucher.currencyId,
        accountName: line.voucher.account?.name || "نەزانراو",
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

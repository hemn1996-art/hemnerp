import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    const voucherType = searchParams.get("voucherType");
    const voucherReference = searchParams.get("voucherReference");
    
    const productId = searchParams.get("productId");
    const accountId = searchParams.get("accountId");
    const accountTypeId = searchParams.get("accountTypeId");
    
    const currencyId = searchParams.get("currencyId");
    const warehouseId = searchParams.get("warehouseId");

    const profitStatus = searchParams.get("profitStatus");

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
    
    if (voucherReference) {
      const parsedId = parseInt(voucherReference);
      where.voucher.OR = [
        { referenceNo: { contains: voucherReference, mode: "insensitive" } },
        ...(!isNaN(parsedId) ? [{ id: parsedId }] : []),
      ];
    }

    if (productId && productId !== "all") {
      const parsed = parseNumberArray(productId);
      if (parsed) where.productId = parsed;
    }
    
    if (currencyId && currencyId !== "all") {
      const parsed = parseNumberArray(currencyId);
      if (parsed) where.voucher.currencyId = parsed;
    }

    if (warehouseId && warehouseId !== "all") {
      const parsed = parseNumberArray(warehouseId);
      if (parsed) {
        where.voucher.inventoryTransactions = {
          some: {
            warehouseId: parsed
          }
        };
      }
    }
    
    if (Object.keys(where.voucher).length === 0) {
      delete where.voucher;
    }

    const lines = await prisma.voucherLine.findMany({
      where,
      select: {
        id: true,
        voucherId: true,
        productId: true,
        qty: true,
        unitPrice: true,
        discountAmount: true,
        lineTotal: true,
        product: { select: { name: true, code: true } },
        voucher: {
          select: {
            referenceNo: true,
            type: true,
            date: true,
            accountId: true,
            currencyId: true,
            exchangeRate: true,
            account: { select: { name: true, accountTypeId: true } },
            inventoryTransactions: {
              select: {
                productId: true,
                unitCost: true,
                warehouseId: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { voucher: { date: "desc" } }
    });

    let items = lines.map(line => {
      const invTrans = line.voucher.inventoryTransactions.find((t: any) => t.productId === line.productId);
      const unitCost = invTrans?.unitCost || 0;
      const unitPrice = line.unitPrice || 0;
      const discount = line.discountAmount || 0;
      const qty = line.qty || 0;
      
      let profit = 0;
      if (line.voucher.type === 'sales') {
        profit = (unitPrice - unitCost) * qty - discount;
      } else if (line.voucher.type === 'sales_return') {
        profit = -((unitPrice - unitCost) * qty - discount);
      }

      return {
        id: line.id,
        voucherId: line.voucherId,
        voucherReference: line.voucherId.toString(),
        voucherType: line.voucher.type,
        productId: line.productId,
        productName: line.product.name,
        productCode: line.product.code || "-",
        category: "-", 
        brand: "-", 
        label: "-", 
        warehouseId: invTrans?.warehouseId || null,
        warehouseName: invTrans?.warehouse?.name || "-",
        cost: unitCost,
        price: unitPrice,
        quantity: qty,
        discount: discount,
        lineTotal: line.lineTotal,
        profit: profit,
        accountId: line.voucher.accountId,
        accountName: line.voucher.account?.name || "نەزانراو",
        accountTypeId: line.voucher.account?.accountTypeId || null,
        currencyId: line.voucher.currencyId,
        exchangeRate: line.voucher.exchangeRate,
        date: line.voucher.date
      };
    });
    
    if (profitStatus === "profitable") {
      items = items.filter(i => i.profit > 0);
    } else if (profitStatus === "loss") {
      items = items.filter(i => i.profit < 0);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items report:", error);
    return NextResponse.json({ error: "Failed to fetch items report" }, { status: 500 });
  }
}

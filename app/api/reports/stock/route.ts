import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toDate = searchParams.get("toDate") || searchParams.get("date");
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");
    const sellerName = searchParams.get("sellerName");

    // Build database filters
    const where: any = {};

    if (toDate && toDate.trim() !== "") {
      const end = new Date(toDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        where.date = { lte: end };
      }
    }

    if (warehouseId && warehouseId !== "all" && warehouseId !== "") {
      where.warehouseId = parseInt(warehouseId);
    }

    if (productId && productId !== "all" && productId !== "") {
      where.productId = parseInt(productId);
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      select: {
        productId: true,
        warehouseId: true,
        qtyChange: true,
        unitCost: true,
        product: { select: { name: true, code: true } },
        warehouse: { select: { name: true } },
        voucher: {
          select: {
            type: true,
            date: true,
            account: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { date: "asc" }
    });

    const stockMap: Record<string, any> = {};

    transactions.forEach(t => {
      const key = `${t.productId}-${t.warehouseId}`;
      if (!stockMap[key]) {
        stockMap[key] = {
          productId: t.productId,
          productName: t.product?.name || "نەزانراو",
          productCode: t.product?.code || "-",
          category: "-",
          brand: "-",
          sellPrice: 0,
          warehouseId: t.warehouseId,
          warehouseName: t.warehouse?.name || "نەزانراو",
          quantity: 0,
          purchasePrice: 0,
          expense: 0,
          cost: 0,
          sellerName: "-",
          sellerId: null as number | null,
          purchaseDate: "-"
        };
      }

      stockMap[key].quantity += t.qtyChange;

      if (t.qtyChange > 0 && t.voucher?.type === "purchase") {
        stockMap[key].purchasePrice = t.unitCost;
        stockMap[key].cost = t.unitCost;
        stockMap[key].sellerName = t.voucher?.account?.name || "نەزانراو";
        stockMap[key].sellerId = t.voucher?.account?.id || null;
        stockMap[key].purchaseDate = t.voucher?.date || "-";
      }
    });

    let result = Object.values(stockMap).filter((item: any) => item.quantity !== 0);

    // Apply seller filter if present
    if (sellerName && sellerName !== "all" && sellerName !== "") {
      result = result.filter((item: any) => item.sellerName === sellerName);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching stock report:", error?.message || error);
    return NextResponse.json({ 
      error: "کێشەیەک ڕوویدا لە هێنانی ڕاپۆرتی کۆگا", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

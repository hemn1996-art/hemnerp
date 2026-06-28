import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDateParam = searchParams.get("asOfDate");
    
    let dateFilter = {};
    if (asOfDateParam) {
      const end = new Date(asOfDateParam);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { lte: end } };
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: dateFilter,
      select: {
        productId: true,
        warehouseId: true,
        qtyChange: true,
        unitCost: true,
        product: { select: { name: true, code: true, isMultiBatch: true } },
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
          purchaseDate: "-",
          totalPurchaseValue: 0,
          totalPurchaseQty: 0,
          isMultiBatch: t.product?.isMultiBatch || false
        };
      }

      stockMap[key].quantity += t.qtyChange;

      if (t.qtyChange > 0 && t.voucher?.type === "purchase") {
        stockMap[key].totalPurchaseValue += (t.qtyChange * t.unitCost);
        stockMap[key].totalPurchaseQty += t.qtyChange;

        if (stockMap[key].isMultiBatch) {
          stockMap[key].purchasePrice = t.unitCost;
          stockMap[key].cost = t.unitCost;
        } else {
          const avg = stockMap[key].totalPurchaseQty > 0 ? (stockMap[key].totalPurchaseValue / stockMap[key].totalPurchaseQty) : t.unitCost;
          stockMap[key].purchasePrice = avg;
          stockMap[key].cost = avg;
        }
        stockMap[key].sellerName = t.voucher?.account?.name || "نەزانراو";
        stockMap[key].sellerId = t.voucher?.account?.id || null;
        stockMap[key].purchaseDate = t.voucher?.date || "-";
      }
    });

    const result = Object.values(stockMap).filter((item: any) => item.quantity !== 0);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching stock snapshot:", error?.message || error);
    return NextResponse.json({ 
      error: "کێشەیەک ڕوویدا لە هێنانی ڕوونمایی کۆگا", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

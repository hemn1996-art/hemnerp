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
            lines: {
              select: {
                productId: true,
                unitPrice: true,
                discountAmount: true,
                qty: true
              }
            }
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
          totalExpenseValue: 0,
          isMultiBatch: t.product?.isMultiBatch || false
        };
      }

      stockMap[key].quantity += t.qtyChange;

      if (t.qtyChange > 0 && t.voucher?.type === "purchase") {
        const line = t.voucher.lines?.find((l: any) => l.productId === t.productId);
        const originalPrice = line ? line.unitPrice : t.unitCost;
        const unitExpense = Math.max(0, t.unitCost - originalPrice);

        stockMap[key].totalPurchaseValue += (t.qtyChange * t.unitCost);
        stockMap[key].totalPurchaseQty += t.qtyChange;
        stockMap[key].totalExpenseValue += (t.qtyChange * unitExpense);

        if (stockMap[key].isMultiBatch) {
          stockMap[key].purchasePrice = originalPrice;
          stockMap[key].cost = t.unitCost;
          stockMap[key].expense = unitExpense;
        } else {
          const avgCost = stockMap[key].totalPurchaseQty > 0 ? (stockMap[key].totalPurchaseValue / stockMap[key].totalPurchaseQty) : t.unitCost;
          const avgExpense = stockMap[key].totalPurchaseQty > 0 ? (stockMap[key].totalExpenseValue / stockMap[key].totalPurchaseQty) : unitExpense;
          const avgPrice = Math.max(0, avgCost - avgExpense);
          
          stockMap[key].purchasePrice = avgPrice;
          stockMap[key].cost = avgCost;
          stockMap[key].expense = avgExpense;
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

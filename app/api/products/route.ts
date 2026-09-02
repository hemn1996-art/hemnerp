import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../lib/auth";
import { convertDigits } from "../../utils/digits";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchRaw = searchParams.get("search");
    const search = searchRaw ? convertDigits(searchRaw) : null;

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: {
            inventoryTransactions: true,
            voucherLines: true,
          },
        },
        inventoryTransactions: {
          where: { voucher: { isDeleted: false } },
          select: {
            id: true,
            qtyChange: true,
            unitCost: true,
            currencyId: true,
            date: true,
            warehouseId: true,
            voucher: {
              select: {
                type: true,
                exchangeRate: true,
                account: {
                  select: {
                    id: true,
                    name: true,
                    exchangeRateType: true,
                    customExchangeRate: true,
                  },
                },
                versions: {
                  select: {
                    version: true,
                    data: true,
                  },
                },
              },
            },
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { id: "desc" },
    });

    const productsWithStock = products.map((p) => {
      const stock = p.inventoryTransactions.reduce(
        (sum, t) => sum + t.qtyChange,
        0
      );
      
      const warehouseStocks: Record<number, number> = {};
      p.inventoryTransactions.forEach((t) => {
        const wId = t.warehouseId;
        warehouseStocks[wId] = (warehouseStocks[wId] || 0) + t.qtyChange;
      });

      let runningOnHand = 0;
      let runningCost = 0;
      let exchangeRateType = "DAILY_MARKET";
      let customExchangeRate = 132000;
      let lastCostCurrencyId = 1;

      // Sort transactions chronologically
      const sortedTxs = [...p.inventoryTransactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id
      );

      sortedTxs.forEach((t) => {
        let versionData: any = {};
        if (t.voucher?.versions && t.voucher.versions.length > 0) {
          const sortedV = [...t.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
          const latestV = sortedV[sortedV.length - 1];
          try { versionData = JSON.parse(latestV.data); } catch (e) {}
        }

        const acc = t.voucher?.account;
        const rateType = (t.voucher as any)?.exchangeRateType || versionData.exchangeRateType || acc?.exchangeRateType;
        const customRate = (t.voucher as any)?.customExchangeRate || versionData.customExchangeRate || acc?.customExchangeRate;

        if (rateType === "FIXED" && customRate) {
          exchangeRateType = "FIXED";
          customExchangeRate = customRate;
        }

        if (t.qtyChange > 0 && t.unitCost > 0) {
          lastCostCurrencyId = t.currencyId || (t.unitCost > 1000 ? 2 : 1);
          if (p.isMultiBatch) {
            runningCost = t.unitCost;
            runningOnHand += t.qtyChange;
          } else {
            if (runningOnHand <= 0) {
              runningCost = t.unitCost;
              runningOnHand = t.qtyChange;
            } else {
              const totalVal = (runningOnHand * runningCost) + (t.qtyChange * t.unitCost);
              runningOnHand += t.qtyChange;
              runningCost = totalVal / runningOnHand;
            }
          }
        } else if (t.qtyChange < 0) {
          runningOnHand += t.qtyChange;
        }
      });

      const hasTransactions = (p._count?.inventoryTransactions || 0) > 0 || (p._count?.voucherLines || 0) > 0;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand,
        packaging: p.packaging,
        isMultiBatch: p.isMultiBatch,
        isExpense: p.isExpense,
        isService: p.isService,
        isActive: p.isActive,
        createdAt: p.createdAt,
        stock: stock,
        costPrice: runningCost,
        costCurrencyId: lastCostCurrencyId,
        exchangeRateType,
        customExchangeRate,
        isDeletable: !hasTransactions,
        salePrices: p.salePrices ? JSON.parse(p.salePrices) : [],
        warehouseStocks,
        lowStockAlert: p.lowStockAlert,
        hasExpiry: p.hasExpiry,
        expiryAlertDays: p.expiryAlertDays,
      };
    });

    return NextResponse.json(productsWithStock);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const data = await request.json();

    const product = await prisma.product.create({
      data: {
        name: data.name?.trim(),
        code: data.code?.trim() || null,
        category: data.category?.trim() || null,
        brand: data.brand?.trim() || null,
        packaging: data.packaging?.trim() || null,
        isMultiBatch: data.isMultiBatch || false,
        isExpense: data.isExpense || false,
        isService: data.isService || false,
        isActive: data.isActive ?? true,
        salePrices: data.salePrices ? JSON.stringify(data.salePrices) : null,
        lowStockAlert: data.lowStockAlert || 0,
        hasExpiry: data.hasExpiry || false,
        expiryAlertDays: data.expiryAlertDays || 0,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "کۆدی کەرەستە پێشتر بەکارهاتووە. تکایە کۆدێکی تر بەکاربهێنە." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "زیادکردنی کەرەستە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بده." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const data = await request.json();

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name?.trim();
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.category !== undefined) updateData.category = data.category?.trim() || null;
    if (data.brand !== undefined) updateData.brand = data.brand?.trim() || null;
    if (data.packaging !== undefined) updateData.packaging = data.packaging?.trim() || null;
    if (data.isMultiBatch !== undefined) updateData.isMultiBatch = data.isMultiBatch;
    if (data.isExpense !== undefined) updateData.isExpense = data.isExpense;
    if (data.isService !== undefined) updateData.isService = data.isService;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.salePrices !== undefined) updateData.salePrices = data.salePrices ? JSON.stringify(data.salePrices) : null;
    if (data.lowStockAlert !== undefined) updateData.lowStockAlert = data.lowStockAlert;
    if (data.hasExpiry !== undefined) updateData.hasExpiry = data.hasExpiry;
    if (data.expiryAlertDays !== undefined) updateData.expiryAlertDays = data.expiryAlertDays;

    const updatedProduct = await prisma.product.update({
      where: { id: Number(data.id) },
      data: updateData,
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error("Error updating product:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "کۆدی کەرەستە پێشتر بەکارهاتووە. تکایە کۆدێکی تر بەکاربهێنە." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "نوێکردنەوەی کەرەستە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بده." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 }
      );
    }

    const productId = Number(id);

    const voucherLineCount = await prisma.voucherLine.count({
      where: { productId },
    });

    const transactionCount = await prisma.inventoryTransaction.count({
      where: { productId },
    });

    if (voucherLineCount > 0 || transactionCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete product because it has associated transactions or voucher lines." },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

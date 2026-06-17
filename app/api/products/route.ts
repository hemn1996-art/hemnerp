import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

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
          select: {
            id: true,
            qtyChange: true,
            unitCost: true,
            date: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    const productsWithStock = products.map((p) => {
      const stock = p.inventoryTransactions.reduce(
        (sum, t) => sum + t.qtyChange,
        0
      );
      const purchaseTx = p.inventoryTransactions
        .filter((t) => t.qtyChange > 0 && t.unitCost > 0)
        .sort((a, b) => b.id - a.id);
      const latestCost = purchaseTx.length > 0 ? purchaseTx[0].unitCost : 0;
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
        costPrice: latestCost,
        isDeletable: !hasTransactions,
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
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    const updatedProduct = await prisma.product.update({
      where: { id: Number(data.id) },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim() || null,
        category: data.category?.trim() || null,
        brand: data.brand?.trim() || null,
        packaging: data.packaging?.trim() || null,
        isMultiBatch: data.isMultiBatch,
        isExpense: data.isExpense,
        isService: data.isService,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
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

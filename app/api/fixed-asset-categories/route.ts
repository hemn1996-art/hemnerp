import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.fixedAssetCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { assets: true }
        }
      }
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching fixed asset categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: "ناو پێویستە" },
        { status: 400 }
      );
    }

    const existing = await prisma.fixedAssetCategory.findUnique({
      where: { name: data.name.trim() }
    });
    if (existing) {
      return NextResponse.json(
        { error: "ئەم کاتیگۆرییە پێشتر تۆمارکراوە" },
        { status: 400 }
      );
    }

    const category = await prisma.fixedAssetCategory.create({
      data: { name: data.name.trim() }
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id || !data.name?.trim()) {
      return NextResponse.json(
        { error: "ID و ناو پێویستن" },
        { status: 400 }
      );
    }

    const existing = await prisma.fixedAssetCategory.findUnique({
      where: { name: data.name.trim() }
    });
    if (existing && existing.id !== Number(data.id)) {
      return NextResponse.json(
        { error: "ئەم ناوە پێشتر بۆ کاتیگۆرییەکی تر بەکارهاتووە" },
        { status: 400 }
      );
    }

    const category = await prisma.fixedAssetCategory.update({
      where: { id: Number(data.id) },
      data: { name: data.name.trim() }
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
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
        { error: "ID پێویستە" },
        { status: 400 }
      );
    }

    const categoryId = Number(id);
    const assetCount = await prisma.fixedAsset.count({
      where: { categoryId }
    });

    if (assetCount > 0) {
      return NextResponse.json(
        { error: "ناتوانرێت ئەم کاتیگۆرییە بسڕدرێتەوە چونکە موجوداتی تێدا تۆمارکراوە" },
        { status: 400 }
      );
    }

    await prisma.fixedAssetCategory.delete({
      where: { id: categoryId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } }
      ];
    }
    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    const assets = await prisma.fixedAsset.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        history: { orderBy: { changeDate: "desc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Error fetching fixed assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name?.trim() || !data.categoryId || data.initialValue === undefined) {
      return NextResponse.json(
        { error: "ناو، کاتیگۆری و بەهای سەرەتا پێویستن" },
        { status: 400 }
      );
    }

    const initialVal = Number(data.initialValue) || 0;
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();

    // Create the asset and its initial history entry in a transaction
    const asset = await prisma.$transaction(async (tx) => {
      const newAsset = await tx.fixedAsset.create({
        data: {
          name: data.name.trim(),
          categoryId: Number(data.categoryId),
          code: data.code?.trim() || null,
          initialValue: initialVal,
          currentValue: initialVal,
          purchaseDate,
          isActive: data.isActive ?? true
        }
      });

      await tx.fixedAssetHistory.create({
        data: {
          assetId: newAsset.id,
          value: initialVal,
          changeDate: purchaseDate,
          note: "تۆمارکردنی سەرەتایی موجودات"
        }
      });

      return newAsset;
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    const assetId = Number(data.id);

    // If we are performing a value update (depreciation / appreciation)
    if (data.newValue !== undefined) {
      const newVal = Number(data.newValue);
      const changeDate = data.changeDate ? new Date(data.changeDate) : new Date();
      const note = data.note?.trim() || "گۆڕینی بەها";

      const updated = await prisma.$transaction(async (tx) => {
        const asset = await tx.fixedAsset.update({
          where: { id: assetId },
          data: { currentValue: newVal }
        });

        await tx.fixedAssetHistory.create({
          data: {
            assetId,
            value: newVal,
            changeDate,
            note
          }
        });

        return asset;
      });

      return NextResponse.json(updated);
    }

    // Otherwise, edit general details of the asset
    const updateData: any = {};
    if (data.name?.trim()) updateData.name = data.name.trim();
    if (data.categoryId) updateData.categoryId = Number(data.categoryId);
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const updated = await prisma.fixedAsset.update({
      where: { id: assetId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating asset:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
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
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await prisma.fixedAsset.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}

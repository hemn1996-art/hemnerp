import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function getModel(type: string) {
  switch (type) {
    case "category":
      return prisma.category;
    case "brand":
      return prisma.brand;
    case "packaging":
      return prisma.packaging;
    case "priceType":
      return prisma.priceType;
    default:
      return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
    }

    const model = getModel(type);
    if (!model) {
      return NextResponse.json({ error: "Invalid attribute type" }, { status: 400 });
    }

    // @ts-ignore
    const items = await model.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching attributes:", error);
    return NextResponse.json({ error: "Failed to fetch attributes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
    }

    const model = getModel(type);
    if (!model) {
      return NextResponse.json({ error: "Invalid attribute type" }, { status: 400 });
    }

    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // @ts-ignore
    const newItem = await model.create({
      data: {
        name: body.name.trim(),
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error("Error creating attribute:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "ئەم ناوە پێشتر تۆمار کراوە" }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Failed to create attribute" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
    }

    const model = getModel(type);
    if (!model) {
      return NextResponse.json({ error: "Invalid attribute type" }, { status: 400 });
    }

    const body = await request.json();
    if (!body.id || !body.name || !body.name.trim()) {
      return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
    }

    const id = Number(body.id);
    const newName = body.name.trim();

    // @ts-ignore
    const existing = await model.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const oldName = existing.name;

    // @ts-ignore
    const updatedItem = await model.update({
      where: { id },
      data: {
        name: newName,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    // Cascade update to all products that use this category, brand, packaging, or priceType!
    if (oldName !== newName) {
      if (type === "category") {
        await prisma.product.updateMany({
          where: { category: oldName },
          data: { category: newName },
        });
      } else if (type === "brand") {
        await prisma.product.updateMany({
          where: { brand: oldName },
          data: { brand: newName },
        });
      } else if (type === "packaging") {
        await prisma.product.updateMany({
          where: { packaging: oldName },
          data: { packaging: newName },
        });
      } else if (type === "priceType") {
        const prodsWithPrices = await prisma.product.findMany({
          where: { salePrices: { not: null } },
          select: { id: true, salePrices: true },
        });
        for (const p of prodsWithPrices) {
          if (p.salePrices && p.salePrices.includes(oldName)) {
            try {
              const prices = JSON.parse(p.salePrices);
              let changed = false;
              prices.forEach((pr: any) => {
                if (pr.priceType === oldName) {
                  pr.priceType = newName;
                  changed = true;
                }
              });
              if (changed) {
                await prisma.product.update({
                  where: { id: p.id },
                  data: { salePrices: JSON.stringify(prices) },
                });
              }
            } catch (e) {}
          }
        }
      }
    }

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error("Error updating attribute:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "ئەم ناوە پێشتر تۆمار کراوە" }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Failed to update attribute" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Missing type or id parameters" }, { status: 400 });
    }

    const model = getModel(type);
    if (!model) {
      return NextResponse.json({ error: "Invalid attribute type" }, { status: 400 });
    }

    // @ts-ignore
    const existing = await model.findUnique({
      where: { id: Number(id) },
    });

    if (existing) {
      const oldName = existing.name;
      if (type === "category") {
        const count = await prisma.product.count({ where: { category: oldName } });
        if (count > 0) {
          return NextResponse.json(
            { error: `ناتوانیت ئەم کاتیگۆرییە بسڕیتەوە چونکە لەلایەن ${count} کەرەستەوە بەکارهاتووە.` },
            { status: 400 }
          );
        }
      } else if (type === "brand") {
        const count = await prisma.product.count({ where: { brand: oldName } });
        if (count > 0) {
          return NextResponse.json(
            { error: `ناتوانیت ئەم براندە بسڕیتەوە چونکە لەلایەن ${count} کەرەستەوە بەکارهاتووە.` },
            { status: 400 }
          );
        }
      } else if (type === "packaging") {
        const count = await prisma.product.count({ where: { packaging: oldName } });
        if (count > 0) {
          return NextResponse.json(
            { error: `ناتوانیت ئەم پێچانەوەیە بسڕیتەوە چونکە لەلایەن ${count} کەرەستەوە بەکارهاتووە.` },
            { status: 400 }
          );
        }
      }
    }

    // @ts-ignore
    await model.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting attribute:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete attribute" }, { status: 500 });
  }
}

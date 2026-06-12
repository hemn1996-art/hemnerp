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

    return NextResponse.json(items);
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
  } catch (error) {
    console.error("Error creating attribute:", error);
    return NextResponse.json({ error: "Failed to create attribute" }, { status: 500 });
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

    // @ts-ignore
    const updatedItem = await model.update({
      where: { id: Number(body.id) },
      data: {
        name: body.name.trim(),
        isActive: body.isActive,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating attribute:", error);
    return NextResponse.json({ error: "Failed to update attribute" }, { status: 500 });
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
    await model.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attribute:", error);
    return NextResponse.json({ error: "Failed to delete attribute" }, { status: 500 });
  }
}

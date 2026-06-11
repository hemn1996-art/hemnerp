import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const newWarehouse = await prisma.$transaction(async (tx) => {
      // If this warehouse is main, set all other warehouses to not main
      if (data.isMain) {
        await tx.warehouse.updateMany({
          data: { isMain: false },
        });
      }

      return tx.warehouse.create({
        data: {
          name: data.name,
          color: data.color || null,
          isMain: data.isMain ?? false,
          isActive: data.isActive ?? true,
        },
      });
    });

    return NextResponse.json(newWarehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    const updatedWarehouse = await prisma.$transaction(async (tx) => {
      // If this warehouse is updated to main, set all other warehouses to not main
      if (data.isMain) {
        await tx.warehouse.updateMany({
          where: { id: { not: Number(data.id) } },
          data: { isMain: false },
        });
      }

      return tx.warehouse.update({
        where: { id: Number(data.id) },
        data: {
          name: data.name,
          color: data.color,
          isMain: data.isMain,
          isActive: data.isActive,
        },
      });
    });

    return NextResponse.json(updatedWarehouse);
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse" },
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
        { error: "Missing warehouse ID" },
        { status: 400 }
      );
    }

    await prisma.warehouse.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 }
    );
  }
}

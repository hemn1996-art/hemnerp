import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const accountTypes = await prisma.accountType.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(accountTypes);
  } catch (error) {
    console.error("Error fetching account types:", error);
    return NextResponse.json(
      { error: "Failed to fetch account types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newType = await prisma.accountType.create({
      data: {
        name: data.name.trim(),
        showsInSales: data.showInSales ?? data.showsInSales ?? true,
        showsInPurch: data.showInPurchase ?? data.showsInPurch ?? true,
        isActive: data.isActive ?? true,
        isBuiltIn: data.isBuiltIn ?? false,
      },
    });

    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    console.error("Error creating account type:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account type" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updatedType = await prisma.accountType.update({
      where: { id: Number(data.id) },
      data: {
        name: data.name?.trim(),
        showsInSales: data.showInSales ?? data.showsInSales,
        showsInPurch: data.showInPurchase ?? data.showsInPurch,
        isActive: data.isActive,
        isBuiltIn: data.isBuiltIn,
      },
    });

    return NextResponse.json(updatedType);
  } catch (error: any) {
    console.error("Error updating account type:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update account type" },
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
        { error: "Missing account type ID" },
        { status: 400 }
      );
    }

    const idNum = Number(id);

    // Check if built-in
    const existing = await prisma.accountType.findUnique({
      where: { id: idNum },
    });

    if (!existing) {
      return NextResponse.json({ error: "Account type not found" }, { status: 404 });
    }

    if (
      existing.name === "کڕیار" || 
      existing.name === "دابینکەر" || 
      existing.name === "کریار" || 
      existing.name === "کڕیار و دابینکەر"
    ) {
      return NextResponse.json({ error: "Cannot delete built-in account types" }, { status: 400 });
    }

    // Check if used by accounts
    const usedCount = await prisma.account.count({
      where: { accountTypeId: idNum },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        { error: "Account type is in use and cannot be deleted" },
        { status: 400 }
      );
    }

    await prisma.accountType.delete({
      where: { id: idNum },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting account type:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account type" },
      { status: 500 }
    );
  }
}


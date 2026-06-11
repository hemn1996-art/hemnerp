import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cashboxes = await prisma.cashbox.findMany({
      include: {
        balances: {
          include: {
            currency: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(cashboxes);
  } catch (error) {
    console.error("Error fetching cashboxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch cashboxes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const newCashbox = await prisma.$transaction(async (tx) => {
      const cashbox = await tx.cashbox.create({
        data: {
          name: data.name,
          type: data.type,
          isActive: data.isActive ?? true,
        },
      });

      const activeCurrencies = await tx.currency.findMany({
        where: { isActive: true },
      });

      for (const currency of activeCurrencies) {
        // Initialize balance for this cashbox and currency
        await tx.cashboxBalance.create({
          data: {
            cashboxId: cashbox.id,
            currencyId: currency.id,
            amount: 0,
          },
        });
      }

      return tx.cashbox.findUnique({
        where: { id: cashbox.id },
        include: {
          balances: {
            include: {
              currency: true,
            },
          },
        },
      });
    });

    return NextResponse.json(newCashbox, { status: 201 });
  } catch (error) {
    console.error("Error creating cashbox:", error);
    return NextResponse.json(
      { error: "Failed to create cashbox" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    const updatedCashbox = await prisma.cashbox.update({
      where: { id: Number(data.id) },
      data: {
        name: data.name,
        type: data.type,
        isActive: data.isActive,
      },
      include: {
        balances: {
          include: {
            currency: true,
          },
        },
      },
    });

    return NextResponse.json(updatedCashbox);
  } catch (error) {
    console.error("Error updating cashbox:", error);
    return NextResponse.json(
      { error: "Failed to update cashbox" },
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
        { error: "Missing cashbox ID" },
        { status: 400 }
      );
    }

    await prisma.cashbox.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cashbox:", error);
    return NextResponse.json(
      { error: "Failed to delete cashbox" },
      { status: 500 }
    );
  }
}


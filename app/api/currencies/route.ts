import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(currencies);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const currency = await prisma.currency.create({
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        rate: Number(data.rate ?? 1),
        mode: data.mode,
        rounding: Boolean(data.rounding),
        color: data.color,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(currency, { status: 201 });
  } catch (error) {
    console.error("Error creating currency:", error);
    return NextResponse.json({ error: "Failed to create currency" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const id = Number(data.id);
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }
    const currency = await prisma.currency.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        rate: Number(data.rate ?? 1),
        mode: data.mode,
        rounding: Boolean(data.rounding),
        color: data.color,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(currency);
  } catch (error) {
    console.error("Error updating currency:", error);
    return NextResponse.json({ error: "Failed to update currency" }, { status: 500 });
  }
}

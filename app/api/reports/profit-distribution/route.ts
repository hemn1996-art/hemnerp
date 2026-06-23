import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const distributions = await prisma.profitDistribution.findMany({
      include: {
        items: true,
      },
      orderBy: {
        date: "desc",
      },
    });
    return NextResponse.json(distributions);
  } catch (error: any) {
    console.error("Error fetching profit distributions:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { calculatedProfit, distributedProfit, note, items, date } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided for distribution" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find USD currency ID dynamically
      const usdCurrency = await tx.currency.findFirst({
        where: { code: "USD" },
      });
      const usdId = usdCurrency ? usdCurrency.id : 1;

      // 1. Create the ProfitDistribution record
      const distribution = await tx.profitDistribution.create({
        data: {
          calculatedProfit: Number(calculatedProfit),
          distributedProfit: Number(distributedProfit),
          note: note || null,
          date: date ? new Date(date) : new Date(),
          items: {
            create: items.map((item: any) => ({
              accountId: Number(item.accountId),
              accountName: item.accountName,
              sharePercentage: Number(item.sharePercentage),
              previousBalance: Number(item.previousBalance),
              profitShare: Number(item.profitShare),
              finalBalance: Number(item.finalBalance),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. For each shareholder, create a Voucher and LedgerEntry if profitShare > 0
      for (const item of items) {
        const profitShare = Number(item.profitShare);
        if (profitShare <= 0) continue;

        const voucher = await tx.voucher.create({
          data: {
            type: "profit_distribution",
            date: distribution.date,
            accountId: Number(item.accountId),
            netAmount: profitShare,
            totalAmount: profitShare,
            exchangeRate: 1.0,
            currencyId: usdId,
            isSaved: true,
            internalNote: `دابەشکردنی قازانج • ڕێژە: ${item.sharePercentage}% • کۆی قازانج: $${Number(distributedProfit).toLocaleString("en-US")}`,
            printNote: `دابەشکردنی قازانج بە پێی بەشە پشکی ${item.sharePercentage}%`,
            employeeName: "سیستەم",
          },
        });

        await tx.ledgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: Number(item.accountId),
            currencyId: usdId,
            debit: 0,
            credit: profitShare,
            exchangeRate: 1.0,
            date: distribution.date,
          },
        });

        await tx.voucherVersion.create({
          data: {
            voucherId: voucher.id,
            version: 1,
            employeeName: "سیستەم",
            data: JSON.stringify({
              type: "profit_distribution",
              accountId: Number(item.accountId),
              netAmount: profitShare,
              totalAmount: profitShare,
              exchangeRate: 1.0,
              currencyId: usdId,
            }),
          },
        });
      }

      return distribution;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating profit distribution:", error);
    return NextResponse.json(
      { error: "Failed to create profit distribution", message: error.message },
      { status: 500 }
    );
  }
}

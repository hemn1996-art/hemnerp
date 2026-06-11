import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { fullAddress: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    // Fetch accounts and balances in parallel for speed
    const [accounts, balanceAggs] = await Promise.all([
      prisma.account.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          phone: true,
          fullAddress: true,
          accountTypeId: true,
          isShareholder: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          creditLimit: true,
          creditLimitCurrencyId: true,
          debtAlertDays: true,
          discountPercent: true,
          guarantorName: true,
          notes: true,
          accountType: { select: { id: true, name: true, showsInSales: true, showsInPurch: true } },
          country: { select: { name: true } },
          city: { select: { name: true } },
          district: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Aggregate ledger entries by account+currency in the database
      prisma.ledgerEntry.groupBy({
        by: ["accountId", "currencyId"],
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    // Build a fast lookup map: accountId -> { currencyId -> balance }
    const balanceMap = new Map<number, Record<string, number>>();
    for (const agg of balanceAggs) {
      if (!balanceMap.has(agg.accountId)) {
        balanceMap.set(agg.accountId, {});
      }
      const curMap = balanceMap.get(agg.accountId)!;
      const curKey = String(agg.currencyId);
      curMap[curKey] = (curMap[curKey] || 0) + ((agg._sum.debit || 0) - (agg._sum.credit || 0));
    }

    const accountsWithBalances = accounts.map((account: any) => {
      const balanceByCurrency = balanceMap.get(account.id) || {};

      let totalBalance = 0;
      for (const [curIdText, amount] of Object.entries(balanceByCurrency)) {
        if (curIdText === "1") {
          totalBalance += amount;
        } else if (curIdText === "2") {
          totalBalance += amount / 1500;
        } else {
          totalBalance += amount;
        }
      }

      return {
        ...account,
        country: account.country?.name || null,
        city: account.city?.name || null,
        district: account.district?.name || null,
        balanceByCurrency,
        balance: totalBalance,
      };
    });

    return NextResponse.json(accountsWithBalances);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let accountTypeId = data.accountTypeId ? Number(data.accountTypeId) : null;

    if (data.isShareholder) {
      // بۆ خاوەن پشک: جۆری "مایەدار (شەریک)" بدۆزەوە
      const shareholderType = await prisma.accountType.findFirst({
        where: { name: { contains: "مایەدار" } },
      });
      if (shareholderType) {
        accountTypeId = shareholderType.id;
      } else {
        // ئەگەر نەبوو یەکەم جۆر بەکاربهێنە
        const firstType = await prisma.accountType.findFirst();
        if (!firstType) {
          return NextResponse.json({ error: "No account types found" }, { status: 400 });
        }
        accountTypeId = firstType.id;
      }
    } else {
      if (!accountTypeId) {
        return NextResponse.json({ error: "accountTypeId is required for non-shareholders" }, { status: 400 });
      }
    }

    const account = await prisma.account.create({
      data: {
        name: data.name.trim(),
        phone: data.phone || null,
        fullAddress: data.fullAddress || null,
        accountTypeId: accountTypeId!,
        countryId: data.countryId || null,
        cityId: data.cityId || null,
        districtId: data.districtId || null,
        isShareholder: data.isShareholder || false,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

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
    const [accounts, balanceAggs, dbCurrencies, ledgerCounts, voucherCounts] = await Promise.all([
      prisma.account.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          phone: true,
          fullAddress: true,
          accountTypeId: true,
          isShareholder: true,
          sharePercentage: true,
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
      prisma.currency.findMany({
        where: { isActive: true }
      }),
      prisma.ledgerEntry.groupBy({
        by: ["accountId"],
        _count: { id: true }
      }),
      prisma.voucher.groupBy({
        by: ["accountId"],
        _count: { id: true }
      })
    ]);

    // Build lookup maps for ledger/voucher counts
    const ledgerCountsMap = new Map(ledgerCounts.map(c => [c.accountId, c._count.id]));
    const voucherCountsMap = new Map(voucherCounts.map(c => [c.accountId, c._count.id]));

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
      const hasLedger = (ledgerCountsMap.get(account.id) || 0) > 0;
      const hasVoucher = (voucherCountsMap.get(account.id) || 0) > 0;
      const canDelete = !hasLedger && !hasVoucher;

      let totalBalance = 0;
      for (const [curIdText, amount] of Object.entries(balanceByCurrency)) {
        const curId = Number(curIdText);
        const cur = dbCurrencies.find(c => c.id === curId);
        const isIqd = cur ? (cur.code === "IQD") : (curId === 2 || curId === 6 || curId === 8 || curId === 12);
        const rate = cur ? cur.rate : (isIqd ? 1500 : 1);
        if (isIqd) {
          totalBalance += amount / rate;
        } else {
          totalBalance += amount;
        }
      }

      const shareholderBalanceByCurrency: Record<string, number> = {};
      if (account.isShareholder) {
        for (const [curIdText, amount] of Object.entries(balanceByCurrency)) {
          shareholderBalanceByCurrency[curIdText] = -amount;
        }
      }

      return {
        ...account,
        country: account.country?.name || null,
        city: account.city?.name || null,
        district: account.district?.name || null,
        balanceByCurrency,
        balance: totalBalance,
        shareholderBalanceByCurrency: account.isShareholder ? shareholderBalanceByCurrency : undefined,
        shareholderBalance: account.isShareholder ? -totalBalance : undefined,
        canDelete,
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

    // Validate sharePercentage total for shareholders
    if (data.isShareholder && data.sharePercentage > 0) {
      const existingShareholders = await prisma.account.findMany({
        where: { isShareholder: true },
        select: { id: true, sharePercentage: true },
      });
      const currentTotal = existingShareholders.reduce((sum: number, s: any) => sum + (s.sharePercentage || 0), 0);
      if (currentTotal + data.sharePercentage > 100) {
        return NextResponse.json(
          { error: `کۆی ڕێژەکان لە ١٠٠٪ زیاتر دەبێت! ئێستا ${currentTotal}% بەکارهاتووە. تەنها ${(100 - currentTotal).toFixed(2)}% ماوە.` },
          { status: 400 }
        );
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
        sharePercentage: data.isShareholder ? (data.sharePercentage || 0) : 0,
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

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    if (!data.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate sharePercentage total for shareholders
    if (data.isShareholder && typeof data.sharePercentage === 'number' && data.sharePercentage > 0) {
      const existingShareholders = await prisma.account.findMany({
        where: { isShareholder: true, id: { not: Number(data.id) } },
        select: { id: true, sharePercentage: true },
      });
      const currentTotal = existingShareholders.reduce((sum: number, s: any) => sum + (s.sharePercentage || 0), 0);
      if (currentTotal + data.sharePercentage > 100) {
        return NextResponse.json(
          { error: `کۆی ڕێژەکان لە ١٠٠٪ زیاتر دەبێت! ئێستا ${currentTotal}% بەکارهاتووە. تەنها ${(100 - currentTotal).toFixed(2)}% ماوە.` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      name: data.name.trim(),
      phone: data.phone || null,
      fullAddress: data.fullAddress || null,
      isShareholder: data.isShareholder || false,
      sharePercentage: data.isShareholder ? (data.sharePercentage ?? 0) : 0,
      isActive: data.isActive ?? true,
      creditLimit: data.creditLimit ?? 0,
      creditLimitCurrencyId: data.creditLimitCurrencyId ?? 1,
      debtAlertDays: data.debtAlertDays ?? 0,
      discountPercent: data.discountPercent ?? 0,
      guarantorName: data.guarantorName || null,
      notes: data.notes || null,
    };

    if (data.accountTypeId) {
      updateData.accountTypeId = Number(data.accountTypeId);
    }

    const account = await prisma.account.update({
      where: { id: Number(data.id) },
      data: updateData,
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const accountId = Number(id);

    // Check for ledger entries or vouchers
    const [ledgerCount, voucherCount] = await Promise.all([
      prisma.ledgerEntry.count({ where: { accountId } }),
      prisma.voucher.count({ where: { accountId } }),
    ]);

    if (ledgerCount > 0 || voucherCount > 0) {
      return NextResponse.json(
        { error: "ناتوانرێت ئەم هەژمارە/خاوەن پشکە بسڕدرێتەوە چونکە چالاکی یان مامەڵەی دارایی لەسەر تۆمارکراوە." },
        { status: 400 }
      );
    }

    await prisma.account.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account", message: error.message },
      { status: 500 }
    );
  }
}

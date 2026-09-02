import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { convertDigits } from "../../../utils/digits";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchRaw = searchParams.get("search") || "";
    const search = convertDigits(searchRaw);
    const accountTypeId = searchParams.get("accountTypeId");
    const accountIds = searchParams.get("accountIds");
    const city = searchParams.get("city");
    const district = searchParams.get("district");
    const beforeDate = searchParams.get("beforeDate");
    const debtType = searchParams.get("debtType");

    const whereClause: any = { isActive: true, isShareholder: false };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (accountTypeId && accountTypeId !== "all") {
      whereClause.accountTypeId = Number(accountTypeId);
    }
    if (accountIds && accountIds !== "all" && accountIds.trim() !== "") {
      const ids = accountIds.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        whereClause.id = { in: ids };
      }
    }
    if (city && city !== "all") {
      whereClause.city = { name: city };
    }
    if (district && district !== "all") {
      whereClause.district = { name: district };
    }

    // Fetch accounts, balance aggregations, and currencies in parallel
    const [accounts, balanceAggs, currencies] = await Promise.all([
      prisma.account.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          phone: true,
          exchangeRateType: true,
          customExchangeRate: true,
          accountType: { select: { name: true } },
          city: { select: { name: true } },
          district: { select: { name: true } },
          vouchers: {
            where: {
              type: { in: ["money_in", "money_out"] },
              isDeleted: false,
            },
            orderBy: { date: "desc" },
            take: 1,
            select: {
              id: true,
              type: true,
              netAmount: true,
              currencyId: true,
              date: true,
              paidAmounts: {
                select: {
                  currencyId: true,
                  amount: true,
                }
              },
              ledgerEntries: {
                select: {
                  accountId: true,
                  currencyId: true,
                  debit: true,
                  credit: true,
                }
              }
            },
          },
        },
      }),
      // Aggregate ledger entries by account+currency in DB
      prisma.ledgerEntry.groupBy({
        by: ["accountId", "currencyId"],
        where: {
          voucher: { isDeleted: false },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
      prisma.currency.findMany({
        where: { isActive: true }
      })
    ]);

    // Build balance lookup map: accountId -> { currencyId -> balance }
    const balanceMap = new Map<number, Record<string, number>>();
    for (const agg of balanceAggs) {
      if (!balanceMap.has(agg.accountId)) {
        balanceMap.set(agg.accountId, {});
      }
      const curMap = balanceMap.get(agg.accountId)!;
      const amount = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      curMap[String(agg.currencyId)] = amount;
    }

    const reportData = accounts.map((account: any) => {
      const balanceByCurrency = balanceMap.get(account.id) || {};
      
      // Calculate total USD equivalent for filtering and sorting
      let totalDebtInUsd = 0;
      for (const [curIdText, amount] of Object.entries(balanceByCurrency)) {
        const curId = Number(curIdText);
        const cur = currencies.find(c => c.id === curId);
        const rate = cur ? cur.rate : 1;
        if (cur?.code === "IQD") {
          totalDebtInUsd += amount / rate;
        } else {
          totalDebtInUsd += amount;
        }
      }

      // Filter out small micro-balances (< $1 USD equivalent) from debt report
      if (debtType === "people" && totalDebtInUsd < 1.0) return null;
      if (debtType === "mine" && totalDebtInUsd > -1.0) return null;
      if ((!debtType || debtType === "all") && Math.abs(totalDebtInUsd) < 1.0) return null;

      const lastPaymentVoucher = account.vouchers[0];
      let lastPaymentAmount = 0;
      let lastPaymentCurrencyId = 1;
      let lastPaymentDate = null;

      const debtBeforeLastPaymentByCurrency = { ...balanceByCurrency };

      if (lastPaymentVoucher) {
        lastPaymentDate = lastPaymentVoucher.date;
        if (lastPaymentVoucher.paidAmounts && lastPaymentVoucher.paidAmounts.length > 0) {
          lastPaymentAmount = Number(lastPaymentVoucher.paidAmounts[0].amount);
          lastPaymentCurrencyId = lastPaymentVoucher.paidAmounts[0].currencyId || 1;
        } else {
          lastPaymentAmount = Number(lastPaymentVoucher.netAmount);
          lastPaymentCurrencyId = lastPaymentVoucher.currencyId || 1;
        }

        const accLedgers = (lastPaymentVoucher.ledgerEntries || []).filter((le: any) => le.accountId === account.id);
        if (accLedgers.length > 0) {
          for (const le of accLedgers) {
            const curKey = String(le.currencyId);
            const netDelta = (le.debit || 0) - (le.credit || 0);
            debtBeforeLastPaymentByCurrency[curKey] = (debtBeforeLastPaymentByCurrency[curKey] || 0) - netDelta;
          }
        } else {
          const curKey = String(lastPaymentCurrencyId);
          const amt = lastPaymentAmount;
          if (lastPaymentVoucher.type === "money_in") {
            debtBeforeLastPaymentByCurrency[curKey] = (debtBeforeLastPaymentByCurrency[curKey] || 0) + amt;
          } else if (lastPaymentVoucher.type === "money_out") {
            debtBeforeLastPaymentByCurrency[curKey] = (debtBeforeLastPaymentByCurrency[curKey] || 0) - amt;
          }
        }
      }

      // Filter by beforeDate if provided
      if (beforeDate && lastPaymentDate) {
        if (new Date(lastPaymentDate) > new Date(beforeDate)) {
          return null;
        }
      }

      return {
        id: account.id,
        name: account.name,
        phone: account.phone || "-",
        city: account.city?.name || "نەزانراو",
        district: account.district?.name || "نەزانراو",
        accountTypeName: account.accountType?.name || "نەزانراو",
        exchangeRateType: account.exchangeRateType || "DAILY_MARKET",
        customExchangeRate: account.customExchangeRate || 132000,
        totalDebt: totalDebtInUsd, // keep net USD equivalent for sorting
        balanceByCurrency,
        lastPaymentAmount,
        lastPaymentCurrencyId,
        lastPaymentDate,
        debtBeforeLastPaymentByCurrency,
      };
    }).filter(Boolean);

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating debt report:", error);
    return NextResponse.json(
      { error: "Failed to generate debt report" },
      { status: 500 }
    );
  }
}

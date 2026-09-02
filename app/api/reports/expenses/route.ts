import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const accountIds = searchParams.get("accountIds");
    const productIds = searchParams.get("productIds");
    const cashboxIds = searchParams.get("cashboxIds");
    const currencyId = searchParams.get("currencyId");
    const employee = searchParams.get("employee");
    const reference = searchParams.get("reference");

    const parseNumberArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        return { in: val.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id)) };
      }
      const parsed = parseInt(val);
      return isNaN(parsed) ? undefined : parsed;
    };

    const parseStringArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        return { in: val.split(",").map(s => s.trim()).filter(Boolean) };
      }
      return val.trim();
    };

    // Base filter for expense vouchers
    const where: any = {
      type: "expense",
      isDeleted: false,
    };

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Account filter
    if (accountIds && accountIds !== "all") {
      const parsed = parseNumberArray(accountIds);
      if (parsed) where.accountId = parsed;
    }

    // Cashbox filter
    if (cashboxIds && cashboxIds !== "all") {
      const parsed = parseNumberArray(cashboxIds);
      if (parsed) where.cashboxId = parsed;
    }

    // Currency filter
    if (currencyId && currencyId !== "all") {
      const parsed = parseInt(currencyId);
      if (!isNaN(parsed)) where.currencyId = parsed;
    }

    // Employee filter
    if (employee && employee !== "all" && employee !== "") {
      const parsed = parseStringArray(employee);
      if (parsed) where.employeeName = parsed;
    }

    // Voucher Reference or ID filter
    if (reference && reference.trim() !== "") {
      const parsedId = parseInt(reference.trim());
      where.OR = [
        { referenceNo: { contains: reference.trim(), mode: "insensitive" } },
        ...(!isNaN(parsedId) ? [{ id: parsedId }] : []),
      ];
    }

    // Filter by product/expense item if specified
    if (productIds && productIds !== "all") {
      const parsed = parseNumberArray(productIds);
      if (parsed) {
        where.lines = {
          some: {
            productId: parsed,
          },
        };
      }
    }

    const [vouchers, allCurrencies, expenseProducts] = await Promise.all([
      prisma.voucher.findMany({
        where,
        select: {
          id: true,
          type: true,
          referenceNo: true,
          date: true,
          accountId: true,
          cashboxId: true,
          currencyId: true,
          exchangeRate: true,
          totalAmount: true,
          totalDiscount: true,
          netAmount: true,
          internalNote: true,
          printNote: true,
          employeeName: true,
          account: {
            select: {
              id: true,
              name: true,
              phone: true,
              accountType: { select: { id: true, name: true } },
            },
          },
          cashbox: {
            select: {
              id: true,
              name: true,
            },
          },
          currency: {
            select: {
              id: true,
              name: true,
              code: true,
              symbol: true,
            },
          },
          lines: {
            select: {
              id: true,
              productId: true,
              qty: true,
              unitPrice: true,
              discountAmount: true,
              lineTotal: true,
              note: true,
              currencyId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  category: true,
                  isExpense: true,
                },
              },
            },
          },
          paidAmounts: {
            select: {
              id: true,
              amount: true,
              currencyId: true,
              exchangeRate: true,
              currency: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  symbol: true,
                },
              },
            },
          },
          expenses: {
            select: {
              id: true,
              amount: true,
              currencyId: true,
              note: true,
              accountId: true,
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.currency.findMany({ where: { isActive: true } }),
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { isExpense: true },
            { category: { contains: "خەرجی", mode: "insensitive" } },
            { voucherLines: { some: { voucher: { type: "expense", isDeleted: false } } } }
          ],
        },
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const currencyMap = new Map(allCurrencies.map(c => [c.id, c]));

    const mappedVouchers = vouchers.map(v => {
      // Determine currency
      const curObj = currencyMap.get(v.currencyId || 1);
      const isIQD = v.currencyId === 2 || v.currencyId === 12 || curObj?.code === "IQD" || curObj?.symbol === "دینار";
      const currencySymbol = isIQD ? "دینار" : (curObj?.symbol || "$");
      const currencyCode = isIQD ? "IQD" : (curObj?.code || "USD");

      // Extract item names
      const itemNames = v.lines && v.lines.length > 0
        ? v.lines.map(l => l.product?.name).filter(Boolean)
        : [];
      
      const itemSummaries = v.lines && v.lines.length > 0
        ? v.lines.map(l => `${l.product?.name || "کەرەستە"} (${l.qty > 1 ? `${l.qty}x ` : ""}${Number(l.unitPrice).toLocaleString("en-US")} ${currencySymbol})`)
        : [];

      const mainItemName = itemNames.length > 0
        ? itemNames.join("، ")
        : (v.internalNote || v.printNote || "خەرجی گشتی");

      return {
        id: v.id,
        referenceNo: v.referenceNo || v.id.toString(),
        type: v.type,
        date: v.date,
        accountId: v.accountId,
        accountName: v.account?.name || "گشتی",
        accountType: v.account?.accountType?.name || "-",
        cashboxId: v.cashboxId,
        cashboxName: v.cashbox?.name || "-",
        currencyId: v.currencyId || 1,
        currencySymbol,
        currencyCode,
        exchangeRate: v.exchangeRate || 1,
        amount: v.netAmount || v.totalAmount || 0,
        totalDiscount: v.totalDiscount || 0,
        employeeName: v.employeeName || "-",
        note: v.internalNote || v.printNote || "-",
        itemNames,
        itemSummaries,
        mainItemName,
        lines: v.lines.map(l => ({
          id: l.id,
          productId: l.productId,
          productName: l.product?.name || "نەزانراو",
          productCode: l.product?.code || "-",
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          lineTotal: l.lineTotal,
          note: l.note,
        })),
        paidAmounts: v.paidAmounts,
      };
    });

    return NextResponse.json({
      vouchers: mappedVouchers,
      expenseProducts,
    });
  } catch (error: any) {
    console.error("Error fetching expense report:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense report", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

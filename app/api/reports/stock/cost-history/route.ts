import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { calculateHistoricalTransactionCosts } from "@/lib/inventoryCost";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = parseInt(searchParams.get("productId") || "0");
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Fetch transactions for this product with voucher and versions
    const [txs, dbCurrencies] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { productId },
        include: {
          voucher: {
            include: {
              account: { select: { id: true, name: true, exchangeRateType: true, customExchangeRate: true } },
              versions: true,
            }
          }
        },
        orderBy: { date: "asc" }
      }),
      prisma.currency.findMany({ where: { isActive: true } })
    ]);

    const iqdCur = dbCurrencies.find(c => c.code === "IQD" || c.id === 2 || c.id === 12);
    const rawRate = iqdCur?.rate || 1520;
    const marketRatePerDollar = rawRate > 10000 ? rawRate / 100 : (rawRate > 100 ? rawRate : 1520);

    // Calculate historical running costs
    const costMap = calculateHistoricalTransactionCosts(txs as any, false, marketRatePerDollar);

    // Build timeline items from incoming transactions
    const incomingTxs = txs.filter(t => t.qtyChange > 0);
    const historyList: any[] = [];

    for (let i = 0; i < incomingTxs.length; i++) {
      const t = incomingTxs[i];
      const costInfo = costMap.get(t.id);
      const isIQD = costInfo ? costInfo.costCurrencyId === 2 : (t.currencyId === 2);
      const cost = costInfo ? costInfo.cost : (t.unitCost || 0);

      // Determine voucher type label in Kurdish
      let vType = "کڕین";
      if (t.voucher?.type === "warehouse_stock") vType = "داخڵکردنی کۆگا";
      else if (t.voucher?.type === "purchase_return") vType = "گەڕانەوەی کڕین";
      else if (t.voucher?.type === "manual_cost_update") vType = "دەستکاری کۆست";
      else if (t.voucher?.type === "adjustment") vType = "ڕێکخستنەوەی کۆگا";

      const vNo = t.voucher?.referenceNo || t.voucher?.id || "-";
      const isDeleted = t.voucher?.isDeleted || false;
      const employeeName = t.voucher?.employeeName || "سیستەم";
      const date = t.date || t.voucher?.date;

      // Extract latest note or reason from voucher or versions
      let note = t.voucher?.internalNote || null;
      if (t.voucher?.versions && t.voucher.versions.length > 0) {
        try {
          const sortedVersions = [...t.voucher.versions].sort((a, b) => (b.version || 0) - (a.version || 0));
          for (const v of sortedVersions) {
            const parsed = JSON.parse(v.data || "{}");
            if (parsed.reason || parsed.costUpdateReason) {
              note = parsed.reason || parsed.costUpdateReason;
              break;
            }
          }
        } catch (e) {}
      }

      historyList.push({
        id: `tx-${t.id}`,
        txId: t.id,
        voucherId: t.voucherId,
        voucherType: vType,
        voucherNo: vNo,
        isDeleted,
        employeeName,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        cost,
        currencyId: isIQD ? 2 : 1,
        currencySymbol: isIQD ? "دینار" : "$",
        note,
      });
    }

    // Sort descending by date (latest first)
    historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.txId - a.txId);

    // Calculate direction (up/down/neutral) compared to the chronologically prior item
    for (let i = 0; i < historyList.length; i++) {
      const current = historyList[i];
      const prior = historyList[i + 1];
      if (!prior) {
        current.direction = "neutral";
      } else {
        const diff = current.cost - prior.cost;
        if (Math.abs(diff) < 0.0001) {
          current.direction = "neutral";
        } else if (diff > 0) {
          current.direction = "up";
        } else {
          current.direction = "down";
        }
      }
      current.isLatest = i === 0;
    }

    return NextResponse.json({
      history: historyList,
      count: historyList.length,
    });
  } catch (error: any) {
    console.error("Error fetching cost history:", error);
    return NextResponse.json({ error: "Failed to fetch cost history", details: error?.message }, { status: 500 });
  }
}

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
    
    const voucherType = searchParams.get("voucherType");
    const voucherReference = searchParams.get("voucherReference");
    
    const productId = searchParams.get("productId");
    const accountId = searchParams.get("accountId");
    const accountTypeId = searchParams.get("accountTypeId");
    
    const currencyId = searchParams.get("currencyId");
    const warehouseId = searchParams.get("warehouseId");

    const profitStatus = searchParams.get("profitStatus");

    const parseNumberArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        return { in: val.split(",").map(id => parseInt(id)).filter(id => !isNaN(id)) };
      }
      const parsed = parseInt(val);
      return isNaN(parsed) ? undefined : parsed;
    };

    const parseStringArray = (val: string | null) => {
      if (!val || val === "all" || val === "") return undefined;
      if (val.includes(",")) {
        return { in: val.split(",") };
      }
      return val;
    };

    // Build where clause
    const where: any = { voucher: { isDeleted: false } };
    
    if (startDate || endDate) {
      where.voucher.date = {};
      if (startDate) where.voucher.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.voucher.date.lte = end;
      }
    }

    if (accountId && accountId !== "all") {
      const parsed = parseNumberArray(accountId);
      if (parsed) where.voucher.accountId = parsed;
    }
    
    if (accountTypeId && accountTypeId !== "all") {
      const parsed = parseNumberArray(accountTypeId);
      if (parsed) where.voucher.account = { accountTypeId: parsed };
    }

    if (voucherType && voucherType !== "all") {
      const parsed = parseStringArray(voucherType);
      if (parsed) where.voucher.type = parsed;
    }
    
    if (voucherReference) {
      const parsedId = parseInt(voucherReference);
      where.voucher.OR = [
        { referenceNo: { contains: voucherReference, mode: "insensitive" } },
        ...(!isNaN(parsedId) ? [{ id: parsedId }] : []),
      ];
    }

    const category = searchParams.get("category");
    const brand = searchParams.get("brand");

    if (category && category !== "all") {
      const parsed = parseStringArray(category);
      if (parsed) where.product = { ...where.product, category: parsed };
    }

    if (brand && brand !== "all") {
      const parsed = parseStringArray(brand);
      if (parsed) where.product = { ...where.product, brand: parsed };
    }

    if (productId && productId !== "all") {
      const parsed = parseNumberArray(productId);
      if (parsed) where.productId = parsed;
    }
    
    if (currencyId && currencyId !== "all") {
      const parsed = parseNumberArray(currencyId);
      if (parsed) where.voucher.currencyId = parsed;
    }

    if (warehouseId && warehouseId !== "all") {
      const parsed = parseNumberArray(warehouseId);
      if (parsed) {
        where.voucher.inventoryTransactions = {
          some: {
            warehouseId: parsed
          }
        };
      }
    }

    const lines = await prisma.voucherLine.findMany({
      where,
      select: {
        id: true,
        voucherId: true,
        productId: true,
        qty: true,
        unitPrice: true,
        discountAmount: true,
        lineTotal: true,
        currencyId: true,
        product: { select: { name: true, code: true, category: true, brand: true } },
        voucher: {
          select: {
            referenceNo: true,
            type: true,
            date: true,
            accountId: true,
            currencyId: true,
            currency: { select: { id: true, symbol: true, code: true, name: true } },
            exchangeRate: true,
            account: { select: { name: true, accountTypeId: true } },
            inventoryTransactions: {
              select: {
                productId: true,
                unitCost: true,
                warehouseId: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { voucher: { date: "desc" } }
    });

    // Query purchase transactions to detect products bought from FIXED rate suppliers
    const purchaseTxs = await prisma.inventoryTransaction.findMany({
      where: { qtyChange: { gt: 0 }, voucher: { isDeleted: false } },
      select: {
        productId: true,
        unitCost: true,
        voucher: {
          select: {
            currencyId: true,
            exchangeRate: true,
            account: { select: { exchangeRateType: true, customExchangeRate: true } },
            versions: { select: { version: true, data: true } },
            lines: { select: { productId: true, currencyId: true } }
          }
        }
      }
    });

    const productFixedRates: Record<number, { isFixed: boolean, customRate: number, costCurrencyId: number }> = {};
    purchaseTxs.forEach((pt: any) => {
      let versionData: any = {};
      if (pt.voucher?.versions && pt.voucher.versions.length > 0) {
        const sortedV = [...pt.voucher.versions].sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
        const latestV = sortedV[sortedV.length - 1];
        try { versionData = JSON.parse(latestV.data); } catch(e){}
      }
      const sellerAcc = pt.voucher?.account;
      const rateType = (pt.voucher as any)?.exchangeRateType || versionData.exchangeRateType || sellerAcc?.exchangeRateType;
      const customRate = (pt.voucher as any)?.customExchangeRate || versionData.customExchangeRate || sellerAcc?.customExchangeRate;
      const pLine = pt.voucher?.lines?.find((l: any) => l.productId === pt.productId);
      const lineCostCur = pLine?.currencyId || pt.voucher?.currencyId || 1;

      productFixedRates[pt.productId] = {
        isFixed: rateType === "FIXED" && !!customRate,
        customRate: customRate ? (customRate > 10000 ? customRate / 100 : customRate) : 1320,
        costCurrencyId: lineCostCur
      };
    });

    const allCurrencies = await prisma.currency.findMany();
    const currencyMap = new Map<number, any>(allCurrencies.map(c => [c.id, c]));

    let items = lines.map(line => {
      const invTrans = line.voucher.inventoryTransactions.find((t: any) => t.productId === line.productId);
      const unitCost = invTrans?.unitCost || 0;
      const unitPrice = line.unitPrice || 0;
      const discount = line.discountAmount || 0;
      const qty = line.qty || 0;
      
      // Determine price / sale currency strictly from line or voucher
      const priceCurrencyId = line.currencyId || line.voucher.currencyId || 1;
      const curObj = currencyMap.get(priceCurrencyId);
      const isPriceIQD = priceCurrencyId === 2 || priceCurrencyId === 12 || curObj?.code === "IQD" || curObj?.symbol === "دینار";
      const priceCurrencySymbol = isPriceIQD ? "دینار" : (curObj?.symbol || "$");
      const priceCurrencyCode = isPriceIQD ? "IQD" : (curObj?.code || "USD");

      // Determine cost currency strictly from purchase record / product
      const fixedInfo = productFixedRates[line.productId];
      const costCurrencyId = fixedInfo?.costCurrencyId || (line.voucher.type === 'purchase' ? priceCurrencyId : 1);
      const costCurObj = currencyMap.get(costCurrencyId);
      const isCostIQD = costCurrencyId === 2 || costCurrencyId === 12 || costCurObj?.code === "IQD" || costCurObj?.symbol === "دینار";
      const costCurrencySymbol = isCostIQD ? "دینار" : (costCurObj?.symbol || "$");
      const costCurrencyCode = isCostIQD ? "IQD" : (costCurObj?.code || "USD");

      // Calculate line total in line's own price currency
      const lineTotalInPriceCur = (unitPrice * qty) - discount;

      // Exchange rate for conversion
      const rawRate = line.voucher.exchangeRate || 1500;
      const rate = rawRate > 10000 ? rawRate / 100 : (rawRate > 100 ? rawRate : 1500);

      // Convert cost and price to USD for uniform profit calculation
      let costInUSD = 0;
      if (isCostIQD) {
        costInUSD = (unitCost * qty) / rate;
      } else {
        if (fixedInfo && fixedInfo.isFixed && unitCost > 0) {
          const customRate = fixedInfo.customRate > 10000 ? fixedInfo.customRate / 100 : fixedInfo.customRate;
          costInUSD = (unitCost * customRate / rate) * qty;
        } else {
          costInUSD = unitCost * qty;
        }
      }

      let priceInUSD = 0;
      if (isPriceIQD) {
        priceInUSD = lineTotalInPriceCur / rate;
      } else {
        priceInUSD = lineTotalInPriceCur;
      }

      let profit = 0;
      if (line.voucher.type === 'sales') {
        profit = priceInUSD - costInUSD;
      } else if (line.voucher.type === 'sales_return') {
        profit = -(priceInUSD - costInUSD);
      }

      return {
        id: line.id,
        voucherId: line.voucherId,
        voucherReference: line.voucherId.toString(),
        voucherType: line.voucher.type,
        productId: line.productId,
        productName: line.product.name,
        productCode: line.product.code || "-",
        category: line.product.category || "-", 
        brand: line.product.brand || "-", 
        label: "-", 
        warehouseId: invTrans?.warehouseId || null,
        warehouseName: invTrans?.warehouse?.name || "-",
        cost: unitCost,
        costCurrencyId,
        costCurrencySymbol,
        costCurrencyCode,
        price: unitPrice,
        priceCurrencyId,
        priceCurrencySymbol,
        priceCurrencyCode,
        quantity: qty,
        discount: discount,
        lineTotal: lineTotalInPriceCur,
        lineTotalCurrencyId: priceCurrencyId,
        lineTotalCurrencySymbol: priceCurrencySymbol,
        lineTotalCurrencyCode: priceCurrencyCode,
        profit: profit,
        profitCurrencyId: 1,
        profitCurrencySymbol: "$",
        profitCurrencyCode: "USD",
        accountId: line.voucher.accountId,
        accountName: line.voucher.account?.name || "نەزانراو",
        accountTypeId: line.voucher.account?.accountTypeId || null,
        currencyId: priceCurrencyId,
        currencySymbol: priceCurrencySymbol,
        currencyCode: priceCurrencyCode,
        exchangeRate: line.voucher.exchangeRate,
        date: line.voucher.date
      };
    });
    
    if (profitStatus === "profitable" || profitStatus === "قازانجی کردوە") {
      items = items.filter(i => i.profit > 0.001);
    } else if (profitStatus === "zero" || profitStatus === "قازانج سفر") {
      items = items.filter(i => Math.abs(i.profit) <= 0.001);
    } else if (profitStatus === "loss" || profitStatus === "زەرەری کردوە") {
      items = items.filter(i => i.profit < -0.001);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items report:", error);
    return NextResponse.json({ error: "Failed to fetch items report" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { calculateLedgerEntries } from "../../utils/ledgerHelper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const accountId = searchParams.get("accountId");
    const cashboxId = searchParams.get("cashboxId");
    const includeDeleted = searchParams.get("includeDeleted");

    const where: any = {};
    if (type) where.type = type;
    if (accountId) where.accountId = Number(accountId);
    if (cashboxId) where.cashboxId = Number(cashboxId);
    
    if (includeDeleted !== "true") {
      where.isDeleted = false;
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      select: {
        id: true,
        type: true,
        referenceNo: true,
        date: true,
        accountId: true,
        cashboxId: true,
        fromCashboxId: true,
        toCashboxId: true,
        currencyId: true,
        exchangeRate: true,
        totalAmount: true,
        totalDiscount: true,
        netAmount: true,
        internalNote: true,
        printNote: true,
        isSaved: true,
        employeeName: true,
        createdAt: true,
        hasDelivery: true,
        driverName: true,
        driverPhone: true,
        deliveryCity: true,
        deliveryAddress: true,
        deliveryFee: true,
        extraPaymentHandling: true,
        account: { select: { id: true, name: true, accountTypeId: true, city: { select: { name: true } }, district: { select: { name: true } } } },
        cashbox: { select: { id: true, name: true } },
        fromCashbox: { select: { id: true, name: true } },
        toCashbox: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true, name: true } },
        paidAmounts: {
          select: {
            id: true,
            currencyId: true,
            amount: true,
            exchangeRate: true,
            currency: { select: { id: true, name: true, symbol: true, code: true } },
          },
        },
        expenses: {
          select: { id: true, amount: true, currencyId: true, note: true, accountId: true, addToAccountDebt: true },
        },
        lines: {
          select: {
            id: true,
            productId: true,
            qty: true,
            unitPrice: true,
            discountPercent: true,
            discountAmount: true,
            lineTotal: true,
            note: true,
            currencyId: true,
            product: { select: { id: true, name: true, code: true } },
          },
        },
        inventoryTransactions: {
          select: {
            productId: true,
            qtyChange: true,
            unitCost: true,
            warehouseId: true,
          },
        },
        ledgerEntries: {
          select: {
            id: true,
            accountId: true,
            currencyId: true,
            debit: true,
            credit: true,
            exchangeRate: true,
            date: true,
            currency: { select: { id: true, name: true, symbol: true, code: true } },
          },
        },
        versions: {
          select: { id: true, version: true, employeeName: true, data: true, updatedAt: true },
          orderBy: { version: "desc" as const },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return NextResponse.json(
      { error: "Failed to fetch vouchers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const dbCurrencies = await prisma.currency.findMany();
    let autoNote = "";
    if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
      const nonZeroPayments = data.paidAmounts.filter((p: any) => Number(p.amount) !== 0);
      if (nonZeroPayments.length > 1) {
        const parts = nonZeroPayments.map((p: any) => {
          const cur = dbCurrencies.find(c => Number(c.id) === Number(p.currencyId));
          const curName = cur ? (cur.code === "IQD" ? "دینار" : cur.symbol || cur.name) : "";
          const formattedAmount = Math.abs(Number(p.amount)).toLocaleString("en-US");
          return `${formattedAmount} ${curName}`;
        });
        const displayRate = data.exchangeRate > 100 ? data.exchangeRate : data.exchangeRate * 100;
        const formattedRate = Number(displayRate).toLocaleString("en-US");
        autoNote = `${parts.join("   ")}   ڕەیتی گۆڕینەوە ${formattedRate}`;
      }
    }

    if (autoNote) {
      if (data.printNote) {
        if (!data.printNote.includes(autoNote)) {
          data.printNote = `${data.printNote} | ${autoNote}`;
        }
      } else {
        data.printNote = autoNote;
      }

      if (data.internalNote) {
        if (!data.internalNote.includes(autoNote)) {
          data.internalNote = `${data.internalNote} | ${autoNote}`;
        }
      } else {
        data.internalNote = autoNote;
      }
    }

    const voucher = await prisma.$transaction(async (tx) => {
      const createdVoucher = await tx.voucher.create({
        data: {
          type: data.type,
          referenceNo: data.referenceNo,
          date: data.date ? new Date(data.date) : new Date(),
          accountId: data.accountId ? Number(data.accountId) : null,
          cashboxId: data.cashboxId ? Number(data.cashboxId) : null,
          fromCashboxId: data.fromCashboxId ? Number(data.fromCashboxId) : null,
          toCashboxId: data.toCashboxId ? Number(data.toCashboxId) : null,
          currencyId: data.currencyId ? Number(data.currencyId) : null,
          exchangeRate: data.exchangeRate ? Number(data.exchangeRate) : 1,
          totalAmount: data.totalAmount ? Number(data.totalAmount) : 0,
          totalDiscount: data.totalDiscount ? Number(data.totalDiscount) : 0,
          netAmount: data.netAmount ? Number(data.netAmount) : 0,
          internalNote: data.internalNote,
          printNote: data.printNote,
          isSaved: data.isSaved ?? true,
          employeeName: data.employeeName,
          hasDelivery: data.hasDelivery ?? false,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
          deliveryCity: data.deliveryCity,
          deliveryAddress: data.deliveryAddress,
          deliveryFee: data.deliveryFee ? Number(data.deliveryFee) : null,
          extraPaymentHandling: data.extraPaymentHandling || null,
        },
      });

      if (data.lines && Array.isArray(data.lines)) {
        for (const line of data.lines) {
          await tx.voucherLine.create({
            data: {
              voucherId: createdVoucher.id,
              productId: Number(line.productId),
              qty: Number(line.qty),
              unitPrice: Number(line.unitPrice),
              discountPercent: Number(line.discountPercent || 0),
              discountAmount: Number(line.discountAmount || 0),
              lineTotal: Number(line.lineTotal),
              note: line.note,
              currencyId: line.currencyId ? Number(line.currencyId) : null,
            },
          });

          if (["sales", "sales_return", "purchase", "purchase_return", "warehouse_damage", "خەسارەی کۆگا", "warehouse_stock", "جەردی کۆگا", "product_transfer", "گواستنەوەی کاڵا", "material_issue", "سەرفی مواد"].includes(createdVoucher.type)) {
            let qtyChange = Number(line.qty);
            if (["sales", "purchase_return", "warehouse_damage", "خەسارەی کۆگا", "material_issue", "سەرفی مواد"].includes(createdVoucher.type)) {
              qtyChange = -qtyChange;
            }
            if (line.warehouseId) {
              await tx.inventoryTransaction.create({
                data: {
                  voucherId: createdVoucher.id,
                  productId: Number(line.productId),
                  warehouseId: Number(line.warehouseId),
                  qtyChange,
                  unitCost: Number(line.unitCost || line.unitPrice || 0),
                  date: createdVoucher.date,
                },
              });

              if (qtyChange < 0) {
                const currentInv = await tx.inventoryTransaction.aggregate({
                  where: {
                    productId: Number(line.productId),
                    warehouseId: Number(line.warehouseId),
                  },
                  _sum: {
                    qtyChange: true,
                  },
                });
                const currentStock = currentInv._sum.qtyChange || 0;
                if (currentStock < -0.0001) {
                  const product = await tx.product.findUnique({
                    where: { id: Number(line.productId) },
                    select: { name: true },
                  });
                  throw new Error(`ناتوانیت کەرەستەی "${product?.name || line.productId}" بفرۆشیت یان کەم بکەیتەوە، چونکە بڕی پێویست لە کۆگادا نییە. بڕی بەردەست لە کۆگادا: ${currentStock - qtyChange} دانە.`);
                }
              }
            }
          }
        }
      }

      if (data.expenses && Array.isArray(data.expenses)) {
        for (const exp of data.expenses) {
          await tx.voucherExpense.create({
            data: {
              voucherId: createdVoucher.id,
              amount: Number(exp.amount),
              currencyId: Number(exp.currencyId),
              accountId: exp.accountId ? Number(exp.accountId) : null,
              note: exp.note,
              addToAccountDebt: exp.addToAccountDebt ?? false,
            },
          });

          if (exp.addToAccountDebt && exp.accountId) {
            await tx.ledgerEntry.create({
              data: {
                voucherId: createdVoucher.id,
                accountId: Number(exp.accountId),
                currencyId: Number(exp.currencyId),
                debit: 0,
                credit: Number(exp.amount),
                exchangeRate: Number(data.exchangeRate || 1),
                date: createdVoucher.date,
              },
            });
          }
        }
      }

      if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
        for (const pa of data.paidAmounts) {
          await tx.voucherPaidAmount.create({
            data: {
              voucherId: createdVoucher.id,
              currencyId: Number(pa.currencyId),
              amount: Number(pa.amount),
              exchangeRate: Number(pa.exchangeRate || 1),
            },
          });

          if (createdVoucher.type === "cashbox_transfer" && createdVoucher.fromCashboxId && createdVoucher.toCashboxId) {
            await tx.cashboxBalance.upsert({
              where: { cashboxId_currencyId: { cashboxId: createdVoucher.fromCashboxId, currencyId: Number(pa.currencyId) } },
              update: { amount: { decrement: Number(pa.amount) } },
              create: { cashboxId: createdVoucher.fromCashboxId, currencyId: Number(pa.currencyId), amount: -Number(pa.amount) },
            });
            await tx.cashboxBalance.upsert({
              where: { cashboxId_currencyId: { cashboxId: createdVoucher.toCashboxId, currencyId: Number(pa.currencyId) } },
              update: { amount: { increment: Number(pa.amount) } },
              create: { cashboxId: createdVoucher.toCashboxId, currencyId: Number(pa.currencyId), amount: Number(pa.amount) },
            });
          } else if (createdVoucher.cashboxId && createdVoucher.type !== "quotation") {
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange"].includes(createdVoucher.type);
            const amountChange = isIncoming ? Number(pa.amount) : -Number(pa.amount);

            await tx.cashboxBalance.upsert({
              where: {
                cashboxId_currencyId: {
                  cashboxId: createdVoucher.cashboxId,
                  currencyId: Number(pa.currencyId),
                },
              },
              update: {
                amount: { increment: amountChange },
              },
              create: {
                cashboxId: createdVoucher.cashboxId,
                currencyId: Number(pa.currencyId),
                amount: amountChange,
              },
            });
          }
        }
      }

      if (createdVoucher.accountId && !["quotation", "expense"].includes(createdVoucher.type)) {
        if (data.ledgerEntries && Array.isArray(data.ledgerEntries)) {
          for (const le of data.ledgerEntries) {
            await tx.ledgerEntry.create({
              data: {
                voucherId: createdVoucher.id,
                accountId: createdVoucher.accountId,
                currencyId: Number(le.currencyId),
                debit: Number(le.debit || 0),
                credit: Number(le.credit || 0),
                exchangeRate: Number(le.exchangeRate || 1),
                date: createdVoucher.date,
              },
            });
          }
        } else {
          const balanceAggs = await tx.ledgerEntry.groupBy({
            by: ["currencyId"],
            where: { accountId: createdVoucher.accountId },
            _sum: { debit: true, credit: true }
          });
          const balanceBeforeByCurrency: Record<string, number> = {};
          for (const agg of balanceAggs) {
            balanceBeforeByCurrency[String(agg.currencyId)] = (agg._sum.debit || 0) - (agg._sum.credit || 0);
          }

          const dbCurrencies = await tx.currency.findMany();

          const { ledgerEntries: computedEntries } = calculateLedgerEntries({
            type: createdVoucher.type,
            netAmount: createdVoucher.netAmount,
            currencyId: createdVoucher.currencyId || (await tx.currency.findFirst({ where: { isActive: true } }))?.id || 11,
            exchangeRate: createdVoucher.exchangeRate,
            paidAmounts: [
              ...(data.paidAmounts ? data.paidAmounts.map((pa: any) => ({
                currencyId: Number(pa.currencyId),
                amount: Number(pa.amount),
                exchangeRate: Number(pa.exchangeRate || 1)
              })) : []),
              ...(Number(data.totalDiscount) > 0 ? [{
                currencyId: createdVoucher.currencyId || (await tx.currency.findFirst({ where: { isActive: true } }))?.id || 11,
                amount: Number(data.totalDiscount),
                exchangeRate: 1
              }] : [])
            ],
            extraPaymentHandling: data.extraPaymentHandling || null,
            balanceBeforeByCurrency,
            currencies: dbCurrencies
          });

          for (const le of computedEntries) {
            await tx.ledgerEntry.create({
              data: {
                voucherId: createdVoucher.id,
                accountId: createdVoucher.accountId,
                currencyId: le.currencyId,
                debit: le.debit,
                credit: le.credit,
                exchangeRate: le.exchangeRate,
                date: createdVoucher.date,
              },
            });
          }
        }
      }

      await tx.voucherVersion.create({
        data: {
          voucherId: createdVoucher.id,
          version: 1,
          employeeName: createdVoucher.employeeName || data.employeeName || "کۆساری مەلا فەرهاد",
          data: JSON.stringify(data),
        }
      });

      return createdVoucher;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error: any) {
    console.error("Error creating voucher:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create voucher" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { calculateLedgerEntries } from "../../../utils/ledgerHelper";
import { getCurrentUser } from "../../../lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    const { id } = await params;
    const voucherId = Number(id);
    console.log("API: Fetching voucher ID:", id, "-> parsed to:", voucherId);

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        account: true,
        cashbox: true,
        fromCashbox: true,
        toCashbox: true,
        currency: true,
        lines: {
          include: {
            product: true,
          },
        },
        paidAmounts: {
          include: {
            currency: true,
          },
        },
        ledgerEntries: {
          include: {
            account: true,
            currency: true,
          },
        },
        expenses: true,
        versions: {
          orderBy: { version: "asc" }
        },
        inventoryTransactions: {
          include: {
            warehouse: true,
          }
        }
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    let balanceBeforeByCurrency: Record<string, number> = {};
    if (voucher.accountId) {
      const currentVoucherEntries = voucher.ledgerEntries?.filter(le => le.accountId === voucher.accountId) || [];
      const minLedgerId = currentVoucherEntries.length > 0 ? Math.min(...currentVoucherEntries.map(le => le.id)) : null;

      let pastBalances;
      if (minLedgerId !== null) {
        pastBalances = await prisma.ledgerEntry.groupBy({
          by: ["currencyId"],
          where: {
            accountId: voucher.accountId,
            voucher: { isDeleted: false },
            OR: [
              { date: { lt: voucher.date } },
              {
                date: voucher.date,
                id: { lt: minLedgerId }
              }
            ]
          },
          _sum: { debit: true, credit: true }
        });
      } else {
        pastBalances = await prisma.ledgerEntry.groupBy({
          by: ["currencyId"],
          where: {
            accountId: voucher.accountId,
            voucher: { isDeleted: false },
            OR: [
              { date: { lt: voucher.date } },
              {
                date: voucher.date,
                voucherId: { lt: voucher.id }
              }
            ]
          },
          _sum: { debit: true, credit: true }
        });
      }

      for (const entry of pastBalances) {
        balanceBeforeByCurrency[String(entry.currencyId)] = (entry._sum.debit || 0) - (entry._sum.credit || 0);
      }
    }

    let employeePhone: string | null = null;
    if (voucher.employeeName) {
      const creator = await prisma.user.findFirst({
        where: {
          OR: [
            { name: voucher.employeeName },
            { username: voucher.employeeName }
          ]
        },
        select: { phone: true }
      });
      if (creator) {
        employeePhone = creator.phone;
      }
    }

    return NextResponse.json({
      ...voucher,
      historicalBalanceBefore: balanceBeforeByCurrency,
      employeePhone: employeePhone
    });
  } catch (error) {
    console.error("Error fetching voucher:", error);
    return NextResponse.json(
      { error: "Failed to fetch voucher" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const voucherId = Number(id);
    const data = await request.json();

    if (data.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: Number(data.accountId) },
        select: { isShareholder: true },
      });
      const isShareholder = account?.isShareholder === true;
      const isShareholderVoucher = data.type === "shareholder_deposit" || data.type === "shareholder_withdrawal";

      if (isShareholder && !isShareholderVoucher) {
        return NextResponse.json(
          { error: "هەژماری خاوەن پشک تەنها لە پسووڵەکانی دانانی پارە (deposit) و کشانەوەی پارە (withdrawal) ڕێگەپێدراوە." },
          { status: 400 }
        );
      }
      if (!isShareholder && isShareholderVoucher) {
        return NextResponse.json(
          { error: "پسوولەی دانانی پارە و کشانەوەی پارە تەنها بۆ هەژماری خاوەن پشک ڕێگەپێدراوە." },
          { status: 400 }
        );
      }
    } else {
      const isShareholderVoucher = data.type === "shareholder_deposit" || data.type === "shareholder_withdrawal";
      if (isShareholderVoucher) {
        return NextResponse.json(
          { error: "دیاریکردنی هەژماری خاوەن پشک ناچارییە بۆ ئەم پسووڵەیە." },
          { status: 400 }
        );
      }
    }

    const dbCurrencies = await prisma.currency.findMany();
    let autoNote = "";
    if (data.type !== "cashbox_transfer" && data.paidAmounts && Array.isArray(data.paidAmounts)) {
      const nonZeroPayments = data.paidAmounts.filter((p: any) => Number(p.amount) !== 0);
      const targetCurId = Number(data.currencyId);
      const isConversionNeeded = nonZeroPayments.length > 1 || (nonZeroPayments.length === 1 && Number(nonZeroPayments[0].currencyId) !== targetCurId);

      if (isConversionNeeded) {
        const parts = nonZeroPayments.map((p: any) => {
          const cur = dbCurrencies.find(c => Number(c.id) === Number(p.currencyId));
          const curName = cur ? (cur.code === "IQD" ? "دینار" : cur.symbol || cur.name) : "";
          const formattedAmount = Math.abs(Number(p.amount)).toLocaleString("en-US");
          return cur?.code === "IQD" ? `${formattedAmount} ${curName}` : `${curName} ${formattedAmount}`;
        });

        const rawExRate = Number(data.exchangeRate) || 1500;
        const displayRate100 = rawExRate >= 10000 ? rawExRate : rawExRate * 100;
        const formattedRate = Number(displayRate100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

        const ratePerUSD = displayRate100 / 100;
        let totalEquivalent = 0;
        nonZeroPayments.forEach((p: any) => {
          const fromId = Number(p.currencyId);
          const amt = Math.abs(Number(p.amount));
          if (fromId === targetCurId) {
            totalEquivalent += amt;
          } else {
            const fromCur = dbCurrencies.find(c => Number(c.id) === fromId);
            const toCur = dbCurrencies.find(c => Number(c.id) === targetCurId);
            if (fromCur?.code === "IQD" && toCur?.code === "USD") {
              totalEquivalent += amt / ratePerUSD;
            } else if (fromCur?.code === "USD" && toCur?.code === "IQD") {
              totalEquivalent += amt * ratePerUSD;
            } else {
              totalEquivalent += amt;
            }
          }
        });

        const targetCur = dbCurrencies.find(c => Number(c.id) === targetCurId);
        const targetSymbol = targetCur ? (targetCur.code === "IQD" ? "دینار" : targetCur.symbol || "$") : "$";
        const roundedTotal = Math.round(totalEquivalent * 100) / 100;
        const totalText = targetCur?.code === "IQD"
          ? `کۆی گشتی ${roundedTotal.toLocaleString("en-US")} دینار`
          : `کۆی گشتی ${targetSymbol} ${roundedTotal.toLocaleString("en-US")}`;

        autoNote = `${parts.join("   ")}   ڕەیتی گۆڕینەوە ${formattedRate}   ${totalText}`;
      }
    }

    if (autoNote) {
      data.printNote = autoNote;
      data.internalNote = autoNote;
    }

    const updatedVoucher = await prisma.$transaction(async (tx) => {
      // 1. Fetch the existing voucher with its payments and lines to reverse them
      const existingVoucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: {
          paidAmounts: true,
          ledgerEntries: true,
          lines: {
            include: {
              product: true,
            }
          },
          expenses: true,
        },
      });


      if (!existingVoucher) {
        throw new Error("Voucher not found");
      }

      // 2. Reverse previous cashbox balances
      if ((existingVoucher.cashboxId || existingVoucher.type === "cashbox_transfer") && existingVoucher.type !== "quotation") {
        for (const pa of existingVoucher.paidAmounts) {
          if (existingVoucher.type === "cashbox_transfer" && existingVoucher.fromCashboxId && existingVoucher.toCashboxId) {
            // Revert transfer (increment from, decrement to)
            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.fromCashboxId, currencyId: pa.currencyId } },
              data: { amount: { increment: pa.amount } },
            });
            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.toCashboxId, currencyId: pa.currencyId } },
              data: { amount: { decrement: pa.amount } },
            });
          } else if (existingVoucher.cashboxId) {
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange", "purchase_return"].includes(existingVoucher.type);
            const amountChange = isIncoming ? -Number(pa.amount) : Number(pa.amount); // Opposite of original

            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.cashboxId, currencyId: pa.currencyId } },
              data: { amount: { increment: amountChange } },
            });
          }
        }
      }

      // 3. Delete old related records (Cascading deletes if configured, but safe to delete manually)
      await tx.voucherPaidAmount.deleteMany({ where: { voucherId } });
      await tx.voucherLine.deleteMany({ where: { voucherId } });
      await tx.voucherExpense.deleteMany({ where: { voucherId } });
      await tx.ledgerEntry.deleteMany({ where: { voucherId } });
      await tx.inventoryTransaction.deleteMany({ where: { voucherId } });

      // 4. Update the main Voucher record
      const updated = await tx.voucher.update({
        where: { id: voucherId },
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
          hasDelivery: data.hasDelivery ?? false,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
          deliveryCity: data.deliveryCity,
          deliveryAddress: data.deliveryAddress,
          deliveryFee: data.deliveryFee ? Number(data.deliveryFee) : null,
          extraPaymentHandling: data.extraPaymentHandling || null,
        },
      });

      // 5. Add new Voucher Lines if provided
      if (data.lines && Array.isArray(data.lines)) {
        for (const line of data.lines) {
          await tx.voucherLine.create({
            data: {
              voucherId: updated.id,
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

          // Check if product is a service or expense (they do not enter/affect inventory)
          const product = await tx.product.findUnique({
            where: { id: Number(line.productId) },
            select: { id: true, name: true, isExpense: true, isService: true, category: true },
          });
          const isServiceOrExpense = Boolean(
            product?.isExpense ||
            product?.isService ||
            (product?.category && (product.category.includes("خزمەتگوزاری") || product.category.includes("گەیاندن"))) ||
            (product?.name && (product.name.includes("گەیاندن") || product.name.includes("خزمەتگوزاری")))
          );

          if (!isServiceOrExpense && ["sales", "sales_return", "purchase", "purchase_return", "warehouse_damage", "خەسارەی کۆگا", "warehouse_stock", "جەردی کۆگا", "product_transfer", "گواستنەوەی کاڵا", "material_issue", "سەرفی مواد"].includes(updated.type)) {
            let qtyChange = Number(line.qty);
            if (["sales", "purchase_return", "warehouse_damage", "خەسارەی کۆگا", "material_issue", "سەرفی مواد"].includes(updated.type)) {
              qtyChange = -qtyChange;
            }
            if (line.warehouseId) {
              await tx.inventoryTransaction.create({
                data: {
                  voucherId: updated.id,
                  productId: Number(line.productId),
                  warehouseId: Number(line.warehouseId),
                  qtyChange,
                  unitCost: Number(line.unitCost || line.unitPrice || 0),
                  // IMPORTANT: line.currencyId is the authoritative source for the item's currency.
                  // Fall back to the voucher's currencyId if line doesn't have one.
                  // Never fall back to hardcoded 1 (USD) because that causes IQD items to get tagged as USD.
                  currencyId: Number(line.currencyId ?? data.currencyId),
                  date: updated.date,
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
                  throw new Error(`ناتوانیت کەرەستەی "${product?.name || line.productId}" بفرۆشیت یان کەم بکەیتەوە، چونکە بڕی پێویست لە کۆگادا نییە. بڕی بەردەست لە کۆگادا: ${currentStock - qtyChange} دانە.`);
                }
              }
            }
          }
        }
      }

      // 6. Add new Voucher Expenses if provided
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const exp of data.expenses) {
          await tx.voucherExpense.create({
            data: {
              voucherId: updated.id,
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
                voucherId: updated.id,
                accountId: Number(exp.accountId),
                currencyId: Number(exp.currencyId),
                debit: 0,
                credit: Number(exp.amount),
                exchangeRate: Number(data.exchangeRate || 1),
                date: updated.date,
              },
            });
          }
        }
      }

      // 7. Add new Voucher Paid Amounts & Apply new balances
      if (data.paidAmounts && Array.isArray(data.paidAmounts)) {
        for (const pa of data.paidAmounts) {
          await tx.voucherPaidAmount.create({
            data: {
              voucherId: updated.id,
              currencyId: Number(pa.currencyId),
              amount: Number(pa.amount),
              exchangeRate: Number(pa.exchangeRate || 1),
            },
          });

          // Adjust cashbox balance if applicable
          if (updated.type === "cashbox_transfer" && updated.fromCashboxId && updated.toCashboxId) {
            // Decrement fromCashbox
            await tx.cashboxBalance.upsert({
              where: { cashboxId_currencyId: { cashboxId: updated.fromCashboxId, currencyId: Number(pa.currencyId) } },
              update: { amount: { decrement: Number(pa.amount) } },
              create: { cashboxId: updated.fromCashboxId, currencyId: Number(pa.currencyId), amount: -Number(pa.amount) },
            });
            // Increment toCashbox
            await tx.cashboxBalance.upsert({
              where: { cashboxId_currencyId: { cashboxId: updated.toCashboxId, currencyId: Number(pa.currencyId) } },
              update: { amount: { increment: Number(pa.amount) } },
              create: { cashboxId: updated.toCashboxId, currencyId: Number(pa.currencyId), amount: Number(pa.amount) },
            });
          } else if (updated.cashboxId && updated.type !== "quotation") {
            // For sales / money_in / exchange: increment cashbox balance
            // For purchase / money_out / expense: decrement cashbox balance
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange", "purchase_return"].includes(updated.type);
            const amountChange = isIncoming ? Number(pa.amount) : -Number(pa.amount);

            await tx.cashboxBalance.upsert({
              where: {
                cashboxId_currencyId: {
                  cashboxId: updated.cashboxId,
                  currencyId: Number(pa.currencyId),
                },
              },
              update: {
                amount: { increment: amountChange },
              },
              create: {
                cashboxId: updated.cashboxId,
                currencyId: Number(pa.currencyId),
                amount: amountChange,
              },
            });
          }
        }
      }

      // 8. Create Ledger Entry for Customer/Supplier Account Debt Tracking
      if (updated.accountId && !["quotation", "expense"].includes(updated.type)) {
        if (data.ledgerEntries && Array.isArray(data.ledgerEntries)) {
          for (const le of data.ledgerEntries) {
            await tx.ledgerEntry.create({
              data: {
                voucherId: updated.id,
                accountId: updated.accountId,
                currencyId: Number(le.currencyId),
                debit: Number(le.debit || 0),
                credit: Number(le.credit || 0),
                exchangeRate: Number(le.exchangeRate || 1),
                date: updated.date,
              },
            });
          }
        } else {
          // Query current balances before this voucher (excluding this voucher itself)
          const balanceAggs = await tx.ledgerEntry.groupBy({
            by: ["currencyId"],
            where: {
              accountId: updated.accountId,
              NOT: { voucherId: updated.id }
            },
            _sum: { debit: true, credit: true }
          });
          const balanceBeforeByCurrency: Record<string, number> = {};
          for (const agg of balanceAggs) {
            balanceBeforeByCurrency[String(agg.currencyId)] = (agg._sum.debit || 0) - (agg._sum.credit || 0);
          }

          const dbCurrencies = await tx.currency.findMany();

          const { ledgerEntries: computedEntries } = calculateLedgerEntries({
            type: updated.type,
            netAmount: updated.netAmount,
            currencyId: updated.currencyId || (await tx.currency.findFirst({ where: { isActive: true } }))?.id || 11,
            exchangeRate: updated.exchangeRate,
            paidAmounts: [
              ...(data.paidAmounts ? data.paidAmounts.map((pa: any) => ({
                currencyId: Number(pa.currencyId),
                amount: Number(pa.amount),
                exchangeRate: Number(pa.exchangeRate || 1)
              })) : []),
              ...(Number(data.totalDiscount) > 0 ? [{
                currencyId: updated.currencyId || (await tx.currency.findFirst({ where: { isActive: true } }))?.id || 11,
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
                voucherId: updated.id,
                accountId: updated.accountId,
                currencyId: le.currencyId,
                debit: le.debit,
                credit: le.credit,
                exchangeRate: le.exchangeRate,
                date: updated.date,
              },
            });
          }
        }
      }

      // 9. Handle Versioning (وەشان)
      const latestVersion = await tx.voucherVersion.findFirst({
        where: { voucherId },
        orderBy: { version: "desc" },
      });

      if (!latestVersion) {
        // Reconstruct basic Version 1
        const originalData = {
          type: existingVoucher.type,
          referenceNo: existingVoucher.referenceNo,
          date: existingVoucher.date,
          accountId: existingVoucher.accountId,
          cashboxId: existingVoucher.cashboxId,
          fromCashboxId: existingVoucher.fromCashboxId,
          toCashboxId: existingVoucher.toCashboxId,
          currencyId: existingVoucher.currencyId,
          exchangeRate: existingVoucher.exchangeRate,
          totalAmount: existingVoucher.totalAmount,
          totalDiscount: existingVoucher.totalDiscount,
          netAmount: existingVoucher.netAmount,
          internalNote: existingVoucher.internalNote,
          printNote: existingVoucher.printNote,
          employeeName: existingVoucher.employeeName,
          lines: existingVoucher.lines.map(line => ({
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            discountAmount: line.discountAmount,
            lineTotal: line.lineTotal,
            note: line.note,
            productName: line.product?.name
          })),
          paidAmounts: existingVoucher.paidAmounts.map(pa => ({
            currencyId: pa.currencyId,
            amount: pa.amount,
            exchangeRate: pa.exchangeRate
          })),
        };

        await tx.voucherVersion.create({
          data: {
            voucherId,
            version: 1,
            employeeName: existingVoucher.employeeName || "بەڕێوەبەر",
            data: JSON.stringify(originalData),
            updatedAt: existingVoucher.createdAt,
          }
        });
      }

      const nextVersionNum = latestVersion ? latestVersion.version + 1 : 2;

      await tx.voucherVersion.create({
        data: {
          voucherId,
          version: nextVersionNum,
          employeeName: updated.employeeName || data.employeeName || "بەڕێوەبەر",
          data: JSON.stringify(data),
        },
      });

      return updated;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    return NextResponse.json(updatedVoucher, { status: 200 });
  } catch (error: any) {
    console.error("Error updating voucher:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update voucher" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const voucherId = Number(id);

    await prisma.$transaction(async (tx) => {
      // 1. Fetch the existing voucher with its payments and lines to reverse them
      const existingVoucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: {
          paidAmounts: true,
          ledgerEntries: true,
        },
      });

      if (!existingVoucher) {
        throw new Error("Voucher not found");
      }

      // 2. Reverse previous cashbox balances
      if ((existingVoucher.cashboxId || existingVoucher.type === "cashbox_transfer") && existingVoucher.type !== "quotation") {
        for (const pa of existingVoucher.paidAmounts) {
          if (existingVoucher.type === "cashbox_transfer" && existingVoucher.fromCashboxId && existingVoucher.toCashboxId) {
            // Revert transfer (increment from, decrement to)
            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.fromCashboxId, currencyId: pa.currencyId } },
              data: { amount: { increment: pa.amount } },
            });
            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.toCashboxId, currencyId: pa.currencyId } },
              data: { amount: { decrement: pa.amount } },
            });
          } else if (existingVoucher.cashboxId) {
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange", "purchase_return"].includes(existingVoucher.type);
            const amountChange = isIncoming ? -Number(pa.amount) : Number(pa.amount); // Opposite of original

            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.cashboxId, currencyId: pa.currencyId } },
              data: { amount: { increment: amountChange } },
            });
          }
        }
      }

      // 3. Delete related records to reverse balances/actions but keep lines for history
      await tx.voucherPaidAmount.deleteMany({ where: { voucherId } });
      await tx.voucherExpense.deleteMany({ where: { voucherId } });
      await tx.ledgerEntry.deleteMany({ where: { voucherId } });
      await tx.inventoryTransaction.deleteMany({ where: { voucherId } });

      // 4. Soft-delete the main Voucher record by setting isDeleted to true
      await tx.voucher.update({
        where: { id: voucherId },
        data: { isDeleted: true },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return NextResponse.json(
      { error: "Failed to delete voucher" },
      { status: 500 }
    );
  }
}

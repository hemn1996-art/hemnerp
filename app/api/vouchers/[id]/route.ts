import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { calculateLedgerEntries } from "../../../utils/ledgerHelper";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    const voucherId = Number(id);
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
      if (existingVoucher.cashboxId || existingVoucher.type === "cashbox_transfer") {
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
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange"].includes(existingVoucher.type);
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
            },
          });

          if (["sales", "sales_return", "purchase", "purchase_return", "warehouse_damage", "خەسارەی کۆگا", "warehouse_stock", "جەردی کۆگا", "product_transfer", "گواستنەوەی کاڵا", "material_issue", "سەرفی مواد"].includes(updated.type)) {
            let qtyChange = Number(line.qty);
            if (["sales", "warehouse_damage", "خەسارەی کۆگا", "material_issue", "سەرفی مواد"].includes(updated.type)) {
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
                  date: updated.date,
                },
              });
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
          } else if (updated.cashboxId) {
            // For sales / money_in / exchange: increment cashbox balance
            // For purchase / money_out / expense: decrement cashbox balance
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange"].includes(updated.type);
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
      if (updated.accountId) {
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
            currencyId: updated.currencyId || (await tx.currency.findFirst({ where: { isActive: true } }))?.id || 5,
            exchangeRate: updated.exchangeRate,
            paidAmounts: data.paidAmounts ? data.paidAmounts.map((pa: any) => ({
              currencyId: Number(pa.currencyId),
              amount: Number(pa.amount),
              exchangeRate: Number(pa.exchangeRate || 1)
            })) : [],
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
            employeeName: existingVoucher.employeeName || "کۆساری مەلا فەرهاد",
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
          employeeName: updated.employeeName || data.employeeName || "کۆساری مەلا فەرهاد",
          data: JSON.stringify(data),
        },
      });

      return updated;
    });

    return NextResponse.json(updatedVoucher, { status: 200 });
  } catch (error: any) {
    console.error("Error updating voucher:", error);
    return NextResponse.json(
      { error: "Failed to update voucher", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      if (existingVoucher.cashboxId || existingVoucher.type === "cashbox_transfer") {
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
            const isIncoming = ["sales", "money_in", "shareholder_deposit", "cashbox_exchange"].includes(existingVoucher.type);
            const amountChange = isIncoming ? -Number(pa.amount) : Number(pa.amount); // Opposite of original

            await tx.cashboxBalance.update({
              where: { cashboxId_currencyId: { cashboxId: existingVoucher.cashboxId, currencyId: pa.currencyId } },
              data: { amount: { increment: amountChange } },
            });
          }
        }
      }

      // 3. Delete related records
      await tx.voucherPaidAmount.deleteMany({ where: { voucherId } });
      await tx.voucherLine.deleteMany({ where: { voucherId } });
      await tx.voucherExpense.deleteMany({ where: { voucherId } });
      await tx.ledgerEntry.deleteMany({ where: { voucherId } });

      // 4. Delete the main Voucher record
      await tx.voucher.delete({ where: { id: voucherId } });
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

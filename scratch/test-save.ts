import { prisma } from '../lib/prisma';

async function run() {
  try {
    // Find supplier "دابینکار - گشتی"
    const supplier = await prisma.account.findFirst({
      where: { id: 7 }
    });
    console.log("Supplier:", supplier);

    // Find account "هیمن"
    const expenseAccount = await prisma.account.findFirst({
      where: { id: 8 }
    });
    console.log("Expense Account:", expenseAccount);

    // Find a product
    const product = await prisma.product.findFirst({
      where: { id: 29 }
    });
    console.log("Product:", product);

    // Find cashbox
    const cashbox = await prisma.cashbox.findFirst({
      where: { id: 6 }
    });
    console.log("Cashbox:", cashbox);

    const payload = {
      type: "purchase",
      referenceNo: "TEST01",
      date: new Date().toISOString(),
      accountId: supplier?.id || 7,
      cashboxId: cashbox?.id || 6,
      currencyId: 1,
      exchangeRate: 1500,
      totalAmount: 8000,
      totalDiscount: 0,
      netAmount: 8000,
      internalNote: "test note",
      printNote: "",
      employeeName: "سیستەم",
      lines: [
        {
          productId: product?.id || 29,
          qty: 100,
          unitPrice: 80,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: 8000,
          note: "",
          warehouseId: 1,
        }
      ],
      expenses: [
        {
          amount: 2000,
          currencyId: 1,
          accountId: expenseAccount?.id || 8,
          addToAccountDebt: true,
        }
      ],
      paidAmounts: [
        {
          currencyId: 2,
          amount: 1000000,
          exchangeRate: 1500,
        }
      ],
      ledgerEntries: [
        {
          currencyId: 1,
          debit: 0,
          credit: 6000,
          exchangeRate: 1500,
        }
      ],
      extraPaymentHandling: null
    };

    console.log("Posting payload...");
    const voucher = await prisma.$transaction(async (tx) => {
      const createdVoucher = await tx.voucher.create({
        data: {
          type: payload.type,
          referenceNo: payload.referenceNo,
          date: new Date(payload.date),
          accountId: payload.accountId,
          cashboxId: payload.cashboxId,
          currencyId: payload.currencyId,
          exchangeRate: payload.exchangeRate,
          totalAmount: payload.totalAmount,
          totalDiscount: payload.totalDiscount,
          netAmount: payload.netAmount,
          internalNote: payload.internalNote,
          printNote: payload.printNote,
          employeeName: payload.employeeName,
          extraPaymentHandling: payload.extraPaymentHandling,
        },
      });

      for (const line of payload.lines) {
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
          },
        });
      }

      for (const exp of payload.expenses) {
        await tx.voucherExpense.create({
          data: {
            voucherId: createdVoucher.id,
            amount: Number(exp.amount),
            currencyId: Number(exp.currencyId),
            accountId: exp.accountId ? Number(exp.accountId) : null,
            addToAccountDebt: exp.addToAccountDebt ?? false,
          },
        });
      }

      for (const pa of payload.paidAmounts) {
        await tx.voucherPaidAmount.create({
          data: {
            voucherId: createdVoucher.id,
            currencyId: Number(pa.currencyId),
            amount: Number(pa.amount),
            exchangeRate: Number(pa.exchangeRate || 1),
          },
        });

        if (createdVoucher.cashboxId) {
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

      if (createdVoucher.accountId) {
        for (const le of payload.ledgerEntries) {
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
      }

      await tx.voucherVersion.create({
        data: {
          voucherId: createdVoucher.id,
          version: 1,
          employeeName: createdVoucher.employeeName || "سیستەم",
          data: JSON.stringify(payload),
        }
      });

      return createdVoucher;
    });

    console.log("Success! Created voucher:", voucher);

  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();

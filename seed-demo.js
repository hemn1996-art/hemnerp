require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 پاککردنەوەی داتابەیس و داغڵکردنی داتای نموونە...');

  // Clear existing transaction tables to prevent duplicates
  await prisma.ledgerEntry.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.voucherExpense.deleteMany();
  await prisma.voucherPaidAmount.deleteMany();
  await prisma.voucherLine.deleteMany();
  await prisma.voucherVersion.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.account.deleteMany();
  await prisma.cashboxBalance.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.accountType.deleteMany();

  // ── 1. کارەکتەرەکان ──────────────────────────────────────────────────────
  const usd = await prisma.currency.create({
    data: { id: 1, code: 'USD', name: 'دۆلار', symbol: '$', isActive: true },
  });
  const iqd = await prisma.currency.create({
    data: { id: 2, code: 'IQD', name: 'دینار', symbol: 'د.ع', isActive: true },
  });
  console.log('✅ دراوەکان ئامادەن');

  // ── 2. جۆری هەژمار ────────────────────────────────────────────────────────
  const typeBuyer = await prisma.accountType.create({
    data: { id: 1, name: 'کڕیار', isBuiltIn: true, showsInSales: true, showsInPurch: false },
  });
  const typeSupplier = await prisma.accountType.create({
    data: { id: 2, name: 'دابینکەر', isBuiltIn: true, showsInSales: false, showsInPurch: true },
  });
  const typeBoth = await prisma.accountType.create({
    data: { id: 3, name: 'کڕیار و دابینکەر', isBuiltIn: true, showsInSales: true, showsInPurch: true },
  });
  const typePartner = await prisma.accountType.create({
    data: { id: 4, name: 'مایەدار (شەریک)', isBuiltIn: true, showsInSales: false, showsInPurch: false },
  });
  console.log('✅ جۆری هەژمارەکان ئامادەن');

  // ── 3. کۆگا و سندوق ───────────────────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { name: 'کۆگای سەرەکی' },
    update: {},
    create: { name: 'کۆگای سەرەکی', isActive: true },
  });

  const cashbox = await prisma.cashbox.upsert({
    where: { name: 'سندوقی سەرەکی' },
    update: {},
    create: { name: 'سندوقی سەرەکی', type: 'cash', isActive: true },
  });

  // Init balances
  for (const cur of [usd, iqd]) {
    await prisma.cashboxBalance.upsert({
      where: { cashboxId_currencyId: { cashboxId: cashbox.id, currencyId: cur.id } },
      update: {},
      create: { cashboxId: cashbox.id, currencyId: cur.id, amount: 0 },
    });
  }
  console.log('✅ کۆگا و سندوق ئامادەن');

  // ── 4. بەرهەمەکان ─────────────────────────────────────────────────────────
  const productsData = [
    { code: 'P001', name: 'مۆبایل سامسونگ A55',  isMultiBatch: false, isExpense: false, isService: false },
    { code: 'P002', name: 'لاپتۆپ دێل i5',        isMultiBatch: false, isExpense: false, isService: false },
    { code: 'P003', name: 'سماعة بلوتوث',          isMultiBatch: false, isExpense: false, isService: false },
    { code: 'P004', name: 'شاشە LED 32 ئینچ',      isMultiBatch: false, isExpense: false, isService: false },
    { code: 'SRV1', name: 'خزمەتگوزاری دامەزراندن', isMultiBatch: false, isExpense: false, isService: true  },
    { code: 'EXP1', name: 'کرێی گواستنەوە',         isMultiBatch: false, isExpense: true,  isService: false },
  ];
  const products = {};
  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { code: p.code } });
    const prod = existing
      ? existing
      : await prisma.product.create({ data: p });
    products[p.code] = prod;
  }
  console.log('✅ بەرهەمەکان ئامادەن');

  // ── 5. هەژمارەکان ─────────────────────────────────────────────────────────
  // کڕیارەکان
  const buyer1 = await prisma.account.create({
    data: { name: 'ئەحمەد کەریم', phone: '0750-111-2222', accountTypeId: typeBuyer.id, isActive: true },
  });
  const buyer2 = await prisma.account.create({
    data: { name: 'شیرین عەلی', phone: '0770-333-4444', accountTypeId: typeBuyer.id, isActive: true },
  });
  const buyer3 = await prisma.account.create({
    data: { name: 'کۆمپانیای ئەستێرە', phone: '0751-555-6666', accountTypeId: typeBoth.id, isActive: true },
  });
  // دابینکەرەکان
  const supp1 = await prisma.account.create({
    data: { name: 'شیرکەتی ئەڵتیین', phone: '0780-777-8888', accountTypeId: typeSupplier.id, isActive: true },
  });
  const supp2 = await prisma.account.create({
    data: { name: 'مەحەمەد عومەر', phone: '0751-999-0000', accountTypeId: typeSupplier.id, isActive: true },
  });
  console.log('✅ هەژمارەکان ئامادەن');

  // ── 6. پسووڵەی فرۆشتن #1 ── ئەحمەد کەریم ─────────────────────────────────
  // فرۆشتنی دوو مۆبایل بە دۆلار، بەشێک دەستی پارە وەرگرتووە
  const sales1 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'sales',
        referenceNo: 'S-001',
        date: new Date('2026-05-10T10:00:00'),
        accountId: buyer1.id,
        cashboxId: cashbox.id,
        currencyId: usd.id,
        exchangeRate: 1,
        totalAmount: 600,
        totalDiscount: 50,
        netAmount: 550,
        internalNote: 'پسووڵەی تاقیکردنەوەی یەکەم',
        isSaved: true,
        employeeName: 'هێمن',
      },
    });

    await tx.voucherLine.create({
      data: { voucherId: v.id, productId: products['P001'].id, qty: 2, unitPrice: 300, discountPercent: 0, discountAmount: 50, lineTotal: 550 },
    });

    // ٢٠٠ دۆلار دەستی پارە وەرگرتووە
    await tx.voucherPaidAmount.create({
      data: { voucherId: v.id, currencyId: usd.id, amount: 200, exchangeRate: 1 },
    });
    await tx.cashboxBalance.upsert({
      where: { cashboxId_currencyId: { cashboxId: cashbox.id, currencyId: usd.id } },
      update: { amount: { increment: 200 } },
      create: { cashboxId: cashbox.id, currencyId: usd.id, amount: 200 },
    });

    // Ledger: debit 550, credit 200 → باقی قەرز 350$
    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: buyer1.id, currencyId: usd.id, debit: 550, credit: 200, exchangeRate: 1, date: v.date },
    });

    // Inventory: -2 مۆبایل
    await tx.inventoryTransaction.create({
      data: { voucherId: v.id, productId: products['P001'].id, warehouseId: warehouse.id, qtyChange: -2, unitCost: 250, date: v.date },
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'sales', note: 'نوێکردنەوەی یەکەم' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ پسووڵەی فرۆشتن #1 دروست کرا — ID:', sales1.id);

  // نوێکردنەوەی پسووڵەی فرۆشتن #1 (دووەم جار)
  await prisma.voucherVersion.create({
    data: {
      voucherId: sales1.id,
      version: 2,
      employeeName: 'هێمن',
      data: JSON.stringify({ type: 'sales', note: 'داشکاندنی ١٠ دۆلاری زیادە زیادکرا' }),
    },
  });
  console.log('✅ نوێکردنەوەی دووەمی پسووڵەی فرۆشتن #1 تۆمار کرا');

  // ── 7. پسووڵەی فرۆشتن #2 ── شیرین عەلی ──────────────────────────────────
  const sales2 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'sales',
        referenceNo: 'S-002',
        date: new Date('2026-05-18T09:30:00'),
        accountId: buyer2.id,
        cashboxId: cashbox.id,
        currencyId: iqd.id,
        exchangeRate: 1,
        totalAmount: 1500000,
        totalDiscount: 0,
        netAmount: 1500000,
        isSaved: true,
        employeeName: 'هێمن',
      },
    });

    await tx.voucherLine.create({
      data: { voucherId: v.id, productId: products['P004'].id, qty: 1, unitPrice: 1500000, discountPercent: 0, discountAmount: 0, lineTotal: 1500000 },
    });

    // تەواوی پارەکەی دابووە
    await tx.voucherPaidAmount.create({
      data: { voucherId: v.id, currencyId: iqd.id, amount: 1500000, exchangeRate: 1 },
    });
    await tx.cashboxBalance.upsert({
      where: { cashboxId_currencyId: { cashboxId: cashbox.id, currencyId: iqd.id } },
      update: { amount: { increment: 1500000 } },
      create: { cashboxId: cashbox.id, currencyId: iqd.id, amount: 1500000 },
    });

    // Ledger: fully paid
    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: buyer2.id, currencyId: iqd.id, debit: 1500000, credit: 1500000, exchangeRate: 1, date: v.date },
    });

    await tx.inventoryTransaction.create({
      data: { voucherId: v.id, productId: products['P004'].id, warehouseId: warehouse.id, qtyChange: -1, unitCost: 1200000, date: v.date },
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'sales' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ پسووڵەی فرۆشتن #2 دروست کرا — ID:', sales2.id);

  // ── 8. پسووڵەی کڕین ── شیرکەتی ئەڵتیین ─────────────────────────────────
  const purch1 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'purchase',
        referenceNo: 'P-001',
        date: new Date('2026-05-05T08:00:00'),
        accountId: supp1.id,
        cashboxId: cashbox.id,
        currencyId: usd.id,
        exchangeRate: 1,
        totalAmount: 1200,
        totalDiscount: 0,
        netAmount: 1200,
        isSaved: true,
        employeeName: 'هێمن',
      },
    });

    await tx.voucherLine.createMany({
      data: [
        { voucherId: v.id, productId: products['P001'].id, qty: 5, unitPrice: 240, discountPercent: 0, discountAmount: 0, lineTotal: 1200 },
        { voucherId: v.id, productId: products['P003'].id, qty: 10, unitPrice: 0, discountPercent: 0, discountAmount: 0, lineTotal: 0 },
      ],
    });

    // ٥٠٠ دۆلار پاری داوە
    await tx.voucherPaidAmount.create({
      data: { voucherId: v.id, currencyId: usd.id, amount: 500, exchangeRate: 1 },
    });
    await tx.cashboxBalance.upsert({
      where: { cashboxId_currencyId: { cashboxId: cashbox.id, currencyId: usd.id } },
      update: { amount: { decrement: 500 } },
      create: { cashboxId: cashbox.id, currencyId: usd.id, amount: -500 },
    });

    // Ledger supplier: credit 1200, debit 500 → باقی قەرز 700$
    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: supp1.id, currencyId: usd.id, debit: 500, credit: 1200, exchangeRate: 1, date: v.date },
    });

    // Inventory: +5 مۆبایل، +10 سماعة
    await tx.inventoryTransaction.createMany({
      data: [
        { voucherId: v.id, productId: products['P001'].id, warehouseId: warehouse.id, qtyChange: 5, unitCost: 240, date: v.date },
        { voucherId: v.id, productId: products['P003'].id, warehouseId: warehouse.id, qtyChange: 10, unitCost: 0, date: v.date },
      ],
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'purchase' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ پسووڵەی کڕین دروست کرا — ID:', purch1.id);

  // ── 9. پارەی هاتوو — وەرگرتنی پارەی قەرز لە ئەحمەد ─────────────────────
  const moneyIn1 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'money_in',
        referenceNo: 'MI-001',
        date: new Date('2026-05-20T11:00:00'),
        accountId: buyer1.id,
        cashboxId: cashbox.id,
        currencyId: usd.id,
        exchangeRate: 1,
        totalAmount: 200,
        totalDiscount: 0,
        netAmount: 200,
        isSaved: true,
        employeeName: 'هێمن',
        internalNote: 'وەرگرتنی بەشێک لە قەرزی ئەحمەد',
      },
    });

    await tx.voucherPaidAmount.create({
      data: { voucherId: v.id, currencyId: usd.id, amount: 200, exchangeRate: 1 },
    });
    await tx.cashboxBalance.upsert({
      where: { cashboxId_currencyId: { cashboxId: cashbox.id, currencyId: usd.id } },
      update: { amount: { increment: 200 } },
      create: { cashboxId: cashbox.id, currencyId: usd.id, amount: 200 },
    });

    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: buyer1.id, currencyId: usd.id, debit: 0, credit: 200, exchangeRate: 1, date: v.date },
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'money_in' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ پارەی هاتوو دروست کرا — ID:', moneyIn1.id);

  // ── 10. پارەی ڕۆشتوو — دانی پارە بۆ مەحەمەد عومەر ──────────────────────
  const moneyOut1 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'money_out',
        referenceNo: 'MO-001',
        date: new Date('2026-05-22T14:00:00'),
        accountId: supp2.id,
        cashboxId: cashbox.id,
        currencyId: iqd.id,
        exchangeRate: 1,
        totalAmount: 500000,
        totalDiscount: 0,
        netAmount: 500000,
        isSaved: true,
        employeeName: 'هێمن',
        internalNote: 'پارەدانی پێشوەختانە بۆ مەحەمەد',
      },
    });

    await tx.voucherPaidAmount.create({
      data: { voucherId: v.id, currencyId: iqd.id, amount: 500000, exchangeRate: 1 },
    });
    await tx.cashboxBalance.upsert({
      where: { cashboxId_currencyId: { cashboxId: cashbox.id, currencyId: iqd.id } },
      update: { amount: { decrement: 500000 } },
      create: { cashboxId: cashbox.id, currencyId: iqd.id, amount: -500000 },
    });

    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: supp2.id, currencyId: iqd.id, debit: 500000, credit: 0, exchangeRate: 1, date: v.date },
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'money_out' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ پارەی ڕۆشتوو دروست کرا — ID:', moneyOut1.id);

  // ── 11. داشکاندن لە قەرزی خەڵک (buyer3) ────────────────────────────────
  const debtDisc1 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'debt_discount',
        referenceNo: 'DD-001',
        date: new Date('2026-05-25T10:30:00'),
        accountId: buyer3.id,
        currencyId: usd.id,
        exchangeRate: 1,
        totalAmount: 50,
        totalDiscount: 0,
        netAmount: 50,
        isSaved: true,
        employeeName: 'هێمن',
        internalNote: 'داشکاندن بە مەبەستی بەخشین',
      },
    });

    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: buyer3.id, currencyId: usd.id, debit: 0, credit: 50, exchangeRate: 1, date: v.date },
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'debt_discount' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ داشکاندن لە قەرزی خەڵک دروست کرا — ID:', debtDisc1.id);

  // ── 12. داشکاندن لە قەرزی من (supp1) ────────────────────────────────────
  const myDebtDisc1 = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        type: 'my_debt_discount',
        referenceNo: 'MDD-001',
        date: new Date('2026-05-28T09:00:00'),
        accountId: supp1.id,
        currencyId: usd.id,
        exchangeRate: 1,
        totalAmount: 100,
        totalDiscount: 0,
        netAmount: 100,
        isSaved: true,
        employeeName: 'هێمن',
        internalNote: 'داشکاندنی شیرکەتی ئەڵتیین',
      },
    });

    await tx.ledgerEntry.create({
      data: { voucherId: v.id, accountId: supp1.id, currencyId: usd.id, debit: 100, credit: 0, exchangeRate: 1, date: v.date },
    });

    await tx.voucherVersion.create({
      data: { voucherId: v.id, version: 1, employeeName: 'هێمن', data: JSON.stringify({ type: 'my_debt_discount' }) },
    });

    return v;
  }, { timeout: 30000 });
  console.log('✅ داشکاندن لە قەرزی من دروست کرا — ID:', myDebtDisc1.id);

  // ── سوماری ────────────────────────────────────────────────────────────────
  console.log('\n🎉 داتای نموونە بە سەرکەوتوویی داغڵکرا!\n');
  console.log('📋 سوماری:');
  console.log('   بەرهەم:          6 دانە');
  console.log('   هەژمار (کڕیار):  3 دانە (ئەحمەد، شیرین، کۆمپانیای ئەستێرە)');
  console.log('   هەژمار (دابینکەر): 2 دانە (شیرکەتی ئەڵتیین، مەحەمەد عومەر)');
  console.log('   پسووڵەی فرۆشتن:  2 دانە (S-001 بە دووجار نوێکردنەوە، S-002)');
  console.log('   پسووڵەی کڕین:    1 دانە (P-001)');
  console.log('   پارەی هاتوو:     1 دانە (MI-001)');
  console.log('   پارەی ڕۆشتوو:   1 دانە (MO-001)');
  console.log('   داشکاندن لە قەرزی خەڵک: 1 دانە');
  console.log('   داشکاندن لە قەرزی من:   1 دانە');
  console.log('\n💰 باقی قەرزەکان:');
  console.log('   ئەحمەد کەریم: 350$ قەرزی خەڵکی (550 - 200 هاتووە)');
  console.log('   شیرین عەلی:  پارە کێشاوە - قەرز نەماوە');
  console.log('   شیرکەتی ئەڵتیین: 600$ قەرزی من (1200 - 500 - 100داشکاندن)');
  console.log('   مەحەمەد عومەر: 500,000د.ع پارەی ڕۆشتووە (پێشوەخت)');
}

main()
  .catch((e) => {
    console.error('❌ هەڵە:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

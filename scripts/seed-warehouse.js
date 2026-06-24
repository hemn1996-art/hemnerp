const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Add more products
  const newProducts = [
    { code: "P005", name: "تەلەفزیۆنی سامسونگ 55 ئینچ", isMultiBatch: false },
    { code: "P006", name: "ئایفۆن 15 پرۆ", isMultiBatch: false },
    { code: "P007", name: "تابلێتی ئایپاد ئێر", isMultiBatch: false },
    { code: "P008", name: "پرینتەری HP LaserJet", isMultiBatch: false },
    { code: "P009", name: "ڕاوتەری TP-Link", isMultiBatch: false },
    { code: "P010", name: "کیبۆردی مێکانیکی", isMultiBatch: false },
    { code: "P011", name: "ماوسی وایرلێس", isMultiBatch: false },
    { code: "P012", name: "هارد دیسکی 1TB", isMultiBatch: false },
    { code: "P013", name: "چارجەری وایرلێس", isMultiBatch: false },
    { code: "P014", name: "کامێرای مراقبة", isMultiBatch: false },
    { code: "P015", name: "سپیکەری بلوتوث JBL", isMultiBatch: false },
    { code: "P016", name: "پاوەر بانک 20000mAh", isMultiBatch: false },
    { code: "P017", name: "کەیسی مۆبایل", isMultiBatch: false },
    { code: "P018", name: "گلاسی تەلەفۆن", isMultiBatch: false },
    { code: "P019", name: "فلاش مێموری 64GB", isMultiBatch: false },
    { code: "P020", name: "لاپتۆپ لێنۆڤۆ i7", isMultiBatch: false },
  ];

  for (const prod of newProducts) {
    await prisma.product.upsert({
      where: { code: prod.code },
      update: {},
      create: prod,
    });
  }
  console.log("Products created/updated.");

  // Get all products
  const allProducts = await prisma.product.findMany({
    where: { isActive: true, isExpense: false, isService: false },
    select: { id: true, name: true, code: true },
  });
  console.log(`Total sellable products: ${allProducts.length}`);

  // Get warehouse
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  if (!warehouse) {
    console.error("No warehouse found!");
    return;
  }

  // Get cashbox
  const cashbox = await prisma.cashbox.findFirst({ where: { isActive: true } });

  // Product costs (in USD)
  const productCosts = {
    "P001": 250,   // مۆبایل سامسونگ A55
    "P002": 450,   // لاپتۆپ دێل i5
    "P003": 25,    // سماعة بلوتوث
    "P004": 180,   // شاشە LED 32
    "P005": 550,   // تەلەفزیۆنی سامسونگ 55
    "P006": 999,   // ئایفۆن 15 پرۆ
    "P007": 599,   // تابلێتی ئایپاد
    "P008": 200,   // پرینتەر
    "P009": 35,    // ڕاوتەر
    "P010": 65,    // کیبۆرد
    "P011": 20,    // ماوس
    "P012": 55,    // هارد دیسک
    "P013": 30,    // چارجەر
    "P014": 85,    // کامێرا
    "P015": 75,    // سپیکەر
    "P016": 25,    // پاوەر بانک
    "P017": 8,     // کەیسی مۆبایل
    "P018": 5,     // گلاسی تەلەفۆن
    "P019": 10,    // فلاش مێموری
    "P020": 650,   // لاپتۆپ لێنۆڤۆ
  };

  // Product quantities to stock
  const productQty = {
    "P001": 30,
    "P002": 15,
    "P003": 50,
    "P004": 20,
    "P005": 10,
    "P006": 25,
    "P007": 12,
    "P008": 8,
    "P009": 40,
    "P010": 35,
    "P011": 60,
    "P012": 25,
    "P013": 45,
    "P014": 15,
    "P015": 20,
    "P016": 50,
    "P017": 100,
    "P018": 150,
    "P019": 80,
    "P020": 10,
  };

  // Create a purchase voucher to stock up each product
  const today = new Date();
  
  for (const product of allProducts) {
    const code = product.code;
    if (!code || !productCosts[code]) continue;

    const qty = productQty[code] || 20;
    const unitCost = productCosts[code];
    const totalAmount = qty * unitCost;

    // Create purchase voucher
    const voucher = await prisma.voucher.create({
      data: {
        type: "purchase",
        date: new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000), // random date in last 30 days
        currencyId: 1, // USD
        exchangeRate: 1,
        totalAmount: totalAmount,
        totalDiscount: 0,
        netAmount: totalAmount,
        cashboxId: cashbox ? cashbox.id : null,
        isSaved: true,
        internalNote: "پڕکردنی کۆگا - سیستەم",
        lines: {
          create: {
            productId: product.id,
            qty: qty,
            unitPrice: unitCost,
            discountPercent: 0,
            discountAmount: 0,
            lineTotal: totalAmount,
          },
        },
        inventoryTransactions: {
          create: {
            productId: product.id,
            warehouseId: warehouse.id,
            qtyChange: qty,
            unitCost: unitCost,
            date: new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    console.log(`Stocked ${product.name}: ${qty} units @ $${unitCost} (Voucher #${voucher.id})`);
  }

  // Update cashbox balance (add some starting cash)
  await prisma.cashboxBalance.upsert({
    where: { cashboxId_currencyId: { cashboxId: 1, currencyId: 1 } },
    update: { amount: 5000 },
    create: { cashboxId: 1, currencyId: 1, amount: 5000 },
  });
  await prisma.cashboxBalance.upsert({
    where: { cashboxId_currencyId: { cashboxId: 1, currencyId: 2 } },
    update: { amount: 5000000 },
    create: { cashboxId: 1, currencyId: 2, amount: 5000000 },
  });
  console.log("Cashbox balances set: $5,000 USD + 5,000,000 IQD");

  // Print summary
  const totalInv = await prisma.inventoryTransaction.count();
  const totalVouchers = await prisma.voucher.count();
  console.log(`\nDone! Total inventory transactions: ${totalInv}, Total vouchers: ${totalVouchers}`);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });

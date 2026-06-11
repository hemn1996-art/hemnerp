require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Creating robust test data for Account Statement...");

  // 1. Ensure basic required data exists
  let cur = await prisma.currency.findFirst({ where: { code: 'USD' } });
  if (!cur) cur = await prisma.currency.create({ data: { name: 'دۆلار', code: 'USD', symbol: '$', exchangeRate: 1 } });

  let accType = await prisma.accountType.findFirst({ where: { name: 'کڕیار' } });
  if (!accType) accType = await prisma.accountType.create({ data: { name: 'کڕیار', showsInSales: true, showsInPurch: false } });

  let cb = await prisma.cashbox.findFirst();
  if (!cb) cb = await prisma.cashbox.create({ data: { name: 'سندوقی سەرەکی', type: 'main' } });

  let wh = await prisma.warehouse.findFirst();
  if (!wh) wh = await prisma.warehouse.create({ data: { name: 'کۆگای سەرەکی', type: 'main' } });

  let prod = await prisma.product.findFirst();
  if (!prod) {
    prod = await prisma.product.create({
      data: {
        name: 'موبایلی ئایفۆن 15 پرۆ ماکس',
        code: 'IP15PM',
        sellPrice: 1200,
        currencyId: cur.id
      }
    });
  }

  // 2. Create the target Account (کاک بەرزان)
  let targetAccount = await prisma.account.findFirst({ where: { name: 'کاک بەرزان' } });
  if (!targetAccount) {
    targetAccount = await prisma.account.create({
      data: {
        name: 'کاک بەرزان',
        phone: '07725119267',
        accountTypeId: accType.id
      }
    });
  }

  // 3. Clear existing vouchers for this account to start fresh
  await prisma.voucher.deleteMany({
    where: { accountId: targetAccount.id }
  });

  // 4. Generate 10-15 random vouchers over the last month
  const types = ["sales", "money_in", "sales_return", "expense"];
  const now = new Date();
  
  for (let i = 0; i < 15; i++) {
    const vType = types[Math.floor(Math.random() * types.length)];
    const daysAgo = 30 - i * 2;
    const vDate = new Date();
    vDate.setDate(now.getDate() - daysAgo);

    let amount = Math.floor(Math.random() * 5000) + 100;
    if (vType === 'sales') amount += 1000;
    
    let paid = 0;
    if (vType === 'sales') paid = Math.floor(amount / 2); // pay half
    if (vType === 'money_in') paid = amount; // full payment
    if (vType === 'sales_return') paid = 0;
    if (vType === 'expense') paid = amount;

    const discount = Math.floor(Math.random() * 50);

    // Create Voucher
    await prisma.voucher.create({
      data: {
        type: vType,
        date: vDate,
        accountId: targetAccount.id,
        currencyId: cur.id,
        exchangeRate: 1,
        totalAmount: amount,
        totalDiscount: discount,
        netAmount: amount - discount,
        printNote: `نموونەی پسووڵە - ${i + 1}`,
        
        lines: vType === 'sales' || vType === 'sales_return' ? {
          create: [
            {
              productId: prod.id,
              qty: Math.floor(Math.random() * 5) + 1,
              unitPrice: 1200,
              discountAmount: discount,
              lineTotal: amount,
              note: 'دانە'
            }
          ]
        } : undefined,

        paidAmounts: paid > 0 ? {
          create: [
            {
              currencyId: cur.id,
              amount: paid,
              exchangeRate: 1
            }
          ]
        } : undefined,

        ledgerEntries: {
          create: [
            {
              accountId: targetAccount.id,
              debit: (vType === 'sales' || vType === 'money_out') ? (amount - discount) : 0,
              credit: (vType === 'money_in' || vType === 'sales_return') ? (amount - discount) : 0,
              currencyId: cur.id,
              date: vDate
            }
          ]
        }
      }
    });
  }

  console.log(`✅ دروستکرا! هەژماری "${targetAccount.name}" ئێستا 15 پسووڵەی هەیە بۆ تاقیکردنەوە.`);
  console.log(`💡 بۆ بینینی، بڕۆ بۆ: /reports/account-statement?accountId=${targetAccount.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

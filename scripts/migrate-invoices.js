require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool, { pgbouncer: true });
const prisma = new PrismaClient({ adapter });

// Map old system invoice types to new system (assuming 'Purchase', 'Sale', 'Expense', 'Income')
const typeMap = {
  'Purchase': 'Purchase',
  'Sell': 'Sale',
  'Expense': 'Expense',
  'PayIn': 'Income', // Trader paying us (receipt)
  'PayOut': 'Expense', // Us paying trader (payment)
  'DepositMoney': 'Income', // Adding money to safe
  'WithdrawMoney': 'Expense', // Taking money out
  'SelfDebt': 'Sale', // Assuming starting balance or debt
  'SellReturn': 'Sale', // Needs negative qty maybe? Let's treat as Sale for now or skip if complex
  'PurchaseReturn': 'Purchase', 
  'NoneProfitSell': 'Sale'
};

async function main() {
  console.log("دەستپێکردنی گواستنەوەی پسوڵەکان...");

  const rawData = fs.readFileSync(path.join(__dirname, "..", "scratch", "invoices_api.json"), "utf8");
  const invoices = JSON.parse(rawData);

  // Get mappings
  const accounts = await prisma.account.findMany();
  const accountMap = {}; // old name -> new ID
  accounts.forEach(a => accountMap[a.name] = a.id);

  const products = await prisma.product.findMany();
  const productMap = {}; // old id -> new ID
  products.forEach(p => productMap[p.code] = p.id); // assuming old id was stored in code

  const cashboxes = await prisma.cashbox.findMany();
  const mainCashboxId = cashboxes[0]?.id;
  
  const currencies = await prisma.currency.findMany();
  const dinarId = currencies.find(c => c.code === 'IQD')?.id;
  const dollarId = currencies.find(c => c.code === 'USD')?.id;

  let successCount = 0;

  for (const data of invoices) {
    const inv = data.invoice;
    const ver = inv.last_version;
    if (!ver) continue;
    
    let newType = typeMap[inv.type];
    if (!newType) {
        console.log(`Skipping unknown type: ${inv.type} for invoice ${inv.id}`);
        continue; // Skip unsupported types for now
    }

    // Attempt to map account
    let accountId = null;
    if (ver.trader) {
        // We need the trader name to map it, which is in balance array usually, or we just find by old name
        const balanceInfo = data.balance?.current_balance?.find(b => b.invoice_version__trader === ver.trader);
        if (balanceInfo && balanceInfo.invoice_version__trader__name) {
            accountId = accountMap[balanceInfo.invoice_version__trader__name];
        }
    }
    
    // Currency mapping
    let currencyId = ver.total_price_currency === 2 ? dollarId : dinarId; 
    // Fallbacks if not set on header
    if (!currencyId && ver.items && ver.items.length > 0) {
        currencyId = ver.items[0].selling_price_currency === 2 ? dollarId : dinarId;
    }
    
    let totalAmount = ver.total_price || 0;
    
    try {
      const newVoucher = await prisma.voucher.create({
        data: {
          type: newType,
          referenceNo: inv.id.toString(),
          date: new Date(inv.created_at),
          accountId: accountId,
          cashboxId: mainCashboxId, // Default
          currencyId: currencyId,
          exchangeRate: ver.currency_rates ? (ver.currency_rates['1'] || 1500) : 1500,
          totalAmount: totalAmount,
          netAmount: totalAmount,
          internalNote: ver.invoice_note || inv.type, // Store original type here for reference
          printNote: ver.print_note,
          isSaved: true
        }
      });

      // Insert lines
      if (ver.items && ver.items.length > 0) {
        for (const item of ver.items) {
          const productId = productMap[item.item_info?.id?.toString() || item.item?.toString()];
          if (!productId) continue;
          
          await prisma.voucherLine.create({
            data: {
              voucherId: newVoucher.id,
              productId: productId,
              qty: item.qty || 1,
              unitPrice: item.selling_price || item.cost_price || 0,
              lineTotal: item.total_price || 0,
              note: item.note || ''
            }
          });
        }
      }

      console.log(`- داخڵکرا: پسوڵەی کۆن ${inv.id} (${inv.type})`);
      successCount++;
    } catch (err) {
      console.error(`❌ کێشە لە داخڵکردنی پسوڵەی ${inv.id}: ${err.message}`);
    }
  }

  console.log(`\n✅ سەرکەوتوو بوو: ${successCount} پسوڵە داخڵ کران.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

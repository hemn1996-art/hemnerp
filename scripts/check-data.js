const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  max: 5,
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const products = await p.product.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true } });
  console.log('Products:', JSON.stringify(products, null, 2));

  const wh = await p.warehouse.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  console.log('Warehouses:', JSON.stringify(wh, null, 2));

  const cur = await p.currency.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, symbol: true, rate: true } });
  console.log('Currencies:', JSON.stringify(cur, null, 2));

  const cb = await p.cashbox.findMany({ where: { isActive: true }, select: { id: true, name: true, type: true } });
  console.log('Cashboxes:', JSON.stringify(cb, null, 2));

  const acc = await p.account.findMany({ where: { isActive: true }, select: { id: true, name: true }, take: 10 });
  console.log('Accounts:', JSON.stringify(acc, null, 2));

  const invCount = await p.inventoryTransaction.count();
  console.log('InventoryTransactions count:', invCount);

  const prodCount = await p.product.count();
  console.log('Total products:', prodCount);

  await p.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });

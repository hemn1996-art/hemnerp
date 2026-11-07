const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
let dbUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
    break;
  }
}

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  const vRes = await pool.query(`
    SELECT v.id, v.type, v."currencyId", v."exchangeRate", c.code as cur_code, c.symbol as cur_symbol
    FROM "Voucher" v
    LEFT JOIN "Currency" c ON v."currencyId" = c.id
    WHERE v.id = 45
  `);
  console.log('Voucher 45:', vRes.rows);

  const linesRes = await pool.query(`
    SELECT vl.id, vl."voucherId", vl."productId", vl.qty, vl."unitPrice", vl."lineTotal", vl."currencyId"
    FROM "VoucherLine" vl
    WHERE vl."voucherId" = 45
  `);
  console.log('Lines:', linesRes.rows);

  const txRes = await pool.query(`
    SELECT it.id, it."voucherId", it."productId", it."unitCost", it."qtyChange"
    FROM "InventoryTransaction" it
    WHERE it."voucherId" = 45
  `);
  console.log('Inventory Transactions:', txRes.rows);

  const pRes = await pool.query(`
    SELECT id, name, "currencyId", "costPrice", "sellingPrice"
    FROM "Product"
    WHERE id = ${linesRes.rows[0]?.productId || 0}
  `);
  console.log('Product:', pRes.rows);

  await pool.end();
}

main().catch(console.error);

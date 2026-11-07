require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const pRes = await pool.query('SELECT * FROM "Product" WHERE id = 13 OR name LIKE \'%هایسنس 9%\'');
  console.log('Product:', pRes.rows);

  const txRes = await pool.query(`
    SELECT it.*, v."referenceNo", v.type, v."currencyId", v."exchangeRate", a.name as acc_name, a."exchangeRateType", a."customExchangeRate"
    FROM "InventoryTransaction" it
    LEFT JOIN "Voucher" v ON it."voucherId" = v.id
    LEFT JOIN "Account" a ON v."accountId" = a.id
    WHERE it."productId" = 13
    ORDER BY it.id DESC;
  `);
  console.log('Inventory Transactions for Product 13:', txRes.rows);
}

main().catch(console.error).finally(() => pool.end());

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  // Update VoucherLine 430 (or all lines of Voucher 84 where unitPrice > 1000)
  const res = await pool.query(`
    UPDATE "VoucherLine" 
    SET "currencyId" = 2 
    WHERE "voucherId" = 84 AND ("unitPrice" > 1000 OR "currencyId" IS NULL)
    RETURNING *;
  `);
  console.log('Updated lines for Voucher 84:', res.rows);
}

main().catch(console.error).finally(() => pool.end());

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const vRes = await pool.query('SELECT * FROM "Voucher" WHERE "id" = 98');
  console.log('Voucher 98:', vRes.rows[0]);

  if (vRes.rows.length > 0) {
    const lRes = await pool.query('SELECT * FROM "VoucherLine" WHERE "voucherId" = $1', [98]);
    console.log('Lines for Voucher 98:', lRes.rows);

    const paRes = await pool.query('SELECT * FROM "VoucherPaidAmount" WHERE "voucherId" = $1', [98]);
    console.log('PaidAmounts for Voucher 98:', paRes.rows);
  }
}

main().catch(console.error).finally(() => pool.end());

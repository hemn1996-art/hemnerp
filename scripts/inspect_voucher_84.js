require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const vRes = await pool.query('SELECT * FROM "Voucher" WHERE "id" = 84 OR "referenceNo" = \'84\'');
  console.log('Voucher 84:', vRes.rows);

  if (vRes.rows.length > 0) {
    const lRes = await pool.query('SELECT * FROM "VoucherLine" WHERE "voucherId" = $1', [vRes.rows[0].id]);
    console.log('Lines for Voucher 84:', lRes.rows);
  }
}

main().catch(console.error).finally(() => pool.end());

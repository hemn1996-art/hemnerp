require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const v = await pool.query('SELECT * FROM "Voucher" WHERE id = 84');
  console.log('Voucher 84:', v.rows[0]);

  const lines = await pool.query('SELECT * FROM "VoucherLine" WHERE "voucherId" = 84');
  console.log('Lines 84:', lines.rows);

  const pa = await pool.query('SELECT * FROM "VoucherPaidAmount" WHERE "voucherId" = 84');
  console.log('PaidAmounts 84:', pa.rows);

  const le = await pool.query('SELECT * FROM "LedgerEntry" WHERE "voucherId" = 84');
  console.log('LedgerEntries 84:', le.rows);
}

main().catch(console.error).finally(() => pool.end());

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // First: inspect full current state
  const v = await pool.query('SELECT * FROM "Voucher" WHERE id = 85');
  console.log('Voucher 85:', JSON.stringify(v.rows[0], null, 2));

  const lines = await pool.query('SELECT * FROM "VoucherLine" WHERE "voucherId" = 85');
  console.log('Lines 85:', JSON.stringify(lines.rows, null, 2));

  const paid = await pool.query('SELECT * FROM "VoucherPaidAmount" WHERE "voucherId" = 85');
  console.log('PaidAmounts 85:', JSON.stringify(paid.rows, null, 2));

  const le = await pool.query('SELECT * FROM "LedgerEntry" WHERE "voucherId" = 85');
  console.log('LedgerEntries 85:', JSON.stringify(le.rows, null, 2));
}

main().catch(console.error).finally(() => pool.end());

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  const resCur = await pool.query('SELECT * FROM "Currency"');
  console.log("Currencies:", resCur.rows);

  const resVouchers = await pool.query('SELECT * FROM "Voucher" WHERE id IN (149, 150)');
  console.log("Vouchers 149, 150:", resVouchers.rows);

  const resPaid = await pool.query('SELECT * FROM "VoucherPaidAmount" WHERE "voucherId" IN (149, 150)');
  console.log("Paid Amounts for 149, 150:", resPaid.rows);

  await pool.end();
}

main().catch(console.error);

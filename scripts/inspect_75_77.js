require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const v75 = await pool.query('SELECT * FROM "Voucher" WHERE id IN (75, 77)');
  console.log("Vouchers 75 & 77:", v75.rows);

  const l75 = await pool.query('SELECT * FROM "VoucherLine" WHERE "voucherId" IN (75, 77)');
  console.log("\nLines 75 & 77:", l75.rows);

  const le75 = await pool.query('SELECT * FROM "LedgerEntry" WHERE "voucherId" IN (75, 77)');
  console.log("\nLedger 75 & 77:", le75.rows);

  const pa75 = await pool.query('SELECT * FROM "VoucherPaidAmount" WHERE "voucherId" IN (75, 77)');
  console.log("\nPaidAmounts 75 & 77:", pa75.rows);
}

main().catch(console.error).finally(() => pool.end());

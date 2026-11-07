require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  // 1. Update Voucher 84
  await pool.query(`
    UPDATE "Voucher"
    SET "currencyId" = 2,
        "totalAmount" = 880000,
        "netAmount" = 880000,
        "internalNote" = '',
        "printNote" = ''
    WHERE id = 84;
  `);

  // 2. Update VoucherLine 430
  await pool.query(`
    UPDATE "VoucherLine"
    SET "lineTotal" = 880000,
        "currencyId" = 2
    WHERE "voucherId" = 84;
  `);

  // 3. Update LedgerEntries for Voucher 84
  // Purchase credit: 880,000 IQD
  // Payment debit: 880,000 IQD
  await pool.query(`
    DELETE FROM "LedgerEntry" WHERE "voucherId" = 84;
  `);

  await pool.query(`
    INSERT INTO "LedgerEntry" ("voucherId", "accountId", "currencyId", "debit", "credit", "exchangeRate", "date")
    VALUES 
      (84, 3, 2, 0, 880000, 1540, '2026-08-23T14:01:00.000Z'),
      (84, 3, 2, 880000, 0, 1540, '2026-08-23T14:01:00.000Z');
  `);

  console.log('Successfully fixed Voucher 84 and its LedgerEntries in database!');
}

main().catch(console.error).finally(() => pool.end());

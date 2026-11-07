require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Voucher 85: IQD purchase — 3 units @ 550,000 IQD = 1,650,000 IQD total
// The DB has wrong: currencyId=1(USD), totalAmount=1071.43, lineTotal=1071.43
// Fix: currencyId=2(IQD), totalAmount=1,650,000, lineTotal=1,650,000, ledger IQD

const VOUCHER_ID = 85;
const LINE_ID = 392;
const LEDGER_ID = 57;

const CORRECT_CURRENCY_ID = 2;       // IQD
const CORRECT_TOTAL = 1650000;        // 3 × 550,000
const CORRECT_LINE_TOTAL = 1650000;
const EXCHANGE_RATE = 1540;

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fix Voucher header
    await client.query(`
      UPDATE "Voucher"
      SET "currencyId" = $1,
          "totalAmount" = $2,
          "netAmount"   = $2,
          "updatedAt"   = NOW()
      WHERE id = $3
    `, [CORRECT_CURRENCY_ID, CORRECT_TOTAL, VOUCHER_ID]);
    console.log('✅ Voucher header updated: IQD, 1,650,000');

    // 2. Fix VoucherLine lineTotal (unitPrice already correct at 550,000)
    await client.query(`
      UPDATE "VoucherLine"
      SET "lineTotal"   = $1,
          "currencyId"  = $2
      WHERE id = $3
    `, [CORRECT_LINE_TOTAL, CORRECT_CURRENCY_ID, LINE_ID]);
    console.log('✅ VoucherLine lineTotal updated: 1,650,000 IQD');

    // 3. Fix LedgerEntry — was USD 1071.43, should be IQD credit 1,650,000
    await client.query(`
      UPDATE "LedgerEntry"
      SET "currencyId"   = $1,
          "credit"       = $2,
          "debit"        = 0,
          "exchangeRate" = $3
      WHERE id = $4
    `, [CORRECT_CURRENCY_ID, CORRECT_TOTAL, EXCHANGE_RATE, LEDGER_ID]);
    console.log('✅ LedgerEntry updated: IQD credit 1,650,000');

    await client.query('COMMIT');
    console.log('\n✅ All fixes committed successfully.');

    // Verify
    const v = await client.query('SELECT id, "currencyId", "totalAmount", "netAmount" FROM "Voucher" WHERE id = $1', [VOUCHER_ID]);
    console.log('\nVoucher after fix:', v.rows[0]);
    const l = await client.query('SELECT id, "currencyId", "unitPrice", "lineTotal" FROM "VoucherLine" WHERE "voucherId" = $1', [VOUCHER_ID]);
    console.log('Lines after fix:', l.rows);
    const le = await client.query('SELECT id, "currencyId", "debit", "credit" FROM "LedgerEntry" WHERE "voucherId" = $1', [VOUCHER_ID]);
    console.log('Ledger after fix:', le.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ROLLBACK — Error:', err.message);
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());

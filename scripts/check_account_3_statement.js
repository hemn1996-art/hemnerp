require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const le = await pool.query(`
    SELECT le.*, v."referenceNo", v.type, v."totalAmount", v."netAmount", v."currencyId" as v_cur
    FROM "LedgerEntry" le
    LEFT JOIN "Voucher" v ON le."voucherId" = v.id
    WHERE le."accountId" = 3
    ORDER BY le.date ASC, le.id ASC;
  `);
  console.log('Account 3 Ledger Entries:', le.rows);
}

main().catch(console.error).finally(() => pool.end());

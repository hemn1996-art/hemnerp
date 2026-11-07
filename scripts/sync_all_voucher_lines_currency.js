require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  // 1. If unitPrice > 1000, it is 100% IQD (currencyId: 2)
  const res1 = await pool.query(`
    UPDATE "VoucherLine"
    SET "currencyId" = 2
    WHERE "unitPrice" > 1000 AND ("currencyId" IS NULL OR "currencyId" != 2)
    RETURNING id, "voucherId", "unitPrice", "currencyId";
  `);
  console.log(`Updated ${res1.rowCount} lines with unitPrice > 1000 to IQD (currencyId = 2)`);

  // 2. If unitPrice <= 1000 and currencyId IS NULL, set to 1 (USD)
  const res2 = await pool.query(`
    UPDATE "VoucherLine"
    SET "currencyId" = 1
    WHERE "unitPrice" <= 1000 AND "currencyId" IS NULL
    RETURNING id, "voucherId", "unitPrice", "currencyId";
  `);
  console.log(`Updated ${res2.rowCount} lines with unitPrice <= 1000 to USD (currencyId = 1)`);

  // 3. Inspect Voucher 98 lines
  const lines98 = await pool.query('SELECT id, "productId", "unitPrice", "currencyId", "lineTotal" FROM "VoucherLine" WHERE "voucherId" = 98');
  console.log('Voucher 98 lines after fix:', lines98.rows);
}

main().catch(console.error).finally(() => pool.end());

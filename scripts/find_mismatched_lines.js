require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const allMismatchedLines = await pool.query(`
    SELECT vl.id, vl."voucherId", vl.qty, vl."unitPrice", vl."discountAmount", vl."lineTotal", vl."currencyId" as line_cur,
           v.type, v."currencyId" as v_cur, v."exchangeRate",
           p.name as prod_name,
           (vl.qty * vl."unitPrice" - COALESCE(vl."discountAmount", 0)) as expected_line_total
    FROM "VoucherLine" vl
    JOIN "Voucher" v ON v.id = vl."voucherId"
    LEFT JOIN "Product" p ON p.id = vl."productId"
    WHERE v."isDeleted" = false
      AND ABS(vl."lineTotal" - (vl.qty * vl."unitPrice" - COALESCE(vl."discountAmount", 0))) > 0.05
    ORDER BY vl.id
  `);

  console.log(`Found ${allMismatchedLines.rows.length} lines where lineTotal != qty * unitPrice:`);
  console.table(allMismatchedLines.rows);
}

main().catch(console.error).finally(() => pool.end());

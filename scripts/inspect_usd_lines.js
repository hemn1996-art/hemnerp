require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const usdLines = await pool.query(`
    SELECT vl.id, vl."voucherId", vl.qty, vl."unitPrice", vl."lineTotal", vl."currencyId" as line_cur,
           v.type, v."currencyId" as v_cur, v.date, p.name as prod_name
    FROM "VoucherLine" vl
    JOIN "Voucher" v ON v.id = vl."voucherId"
    LEFT JOIN "Product" p ON p.id = vl."productId"
    WHERE v."isDeleted" = false
      AND COALESCE(vl."currencyId", v."currencyId", 1) = 1
    ORDER BY vl."lineTotal" DESC
    LIMIT 30
  `);

  console.log("Top USD VoucherLines in DB:");
  usdLines.rows.forEach(r => {
    console.log(`Line ${r.id} (Voucher ${r.voucherId} - ${r.type}): qty=${r.qty}, unitPrice=${r.unitPrice}, lineTotal=${r.lineTotal}, line_cur=${r.line_cur}, v_cur=${r.v_cur}, prod=${r.prod_name}`);
  });

  const byType = await pool.query(`
    SELECT v.type, COUNT(*) as cnt, SUM(vl.qty) as qty, SUM(vl."lineTotal") as money,
           COALESCE(vl."currencyId", v."currencyId", 1) as cur
    FROM "VoucherLine" vl
    JOIN "Voucher" v ON v.id = vl."voucherId"
    WHERE v."isDeleted" = false
    GROUP BY v.type, COALESCE(vl."currencyId", v."currencyId", 1)
    ORDER BY v.type, cur
  `);

  console.log("\nBreakdown by Voucher Type and Currency:");
  console.table(byType.rows);
}

main().catch(console.error).finally(() => pool.end());

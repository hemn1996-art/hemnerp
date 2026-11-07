require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const linesRes = await pool.query(`
    SELECT vl.id, vl."voucherId", vl.qty, vl."unitPrice", vl."lineTotal", vl."currencyId" as line_cur,
           v.type, v."currencyId" as v_cur, v."exchangeRate", v.date,
           p.name as prod_name
    FROM "VoucherLine" vl
    JOIN "Voucher" v ON v.id = vl."voucherId"
    LEFT JOIN "Product" p ON p.id = vl."productId"
    WHERE v."isDeleted" = false
    ORDER BY vl."lineTotal" DESC
    LIMIT 25
  `);

  console.log("Top 25 largest line totals in DB:");
  linesRes.rows.forEach(r => {
    console.log(`Line ${r.id} (Voucher ${r.voucherId} - ${r.type}): qty=${r.qty}, unitPrice=${r.unitPrice}, lineTotal=${r.lineTotal}, line_cur=${r.line_cur}, v_cur=${r.v_cur}, prod=${r.prod_name}`);
  });

  const totalsRes = await pool.query(`
    SELECT 
      COALESCE(vl."currencyId", v."currencyId", 1) as cur_id,
      COUNT(*) as line_count,
      SUM(vl.qty) as total_qty,
      SUM(vl."lineTotal") as total_money
    FROM "VoucherLine" vl
    JOIN "Voucher" v ON v.id = vl."voucherId"
    WHERE v."isDeleted" = false
    GROUP BY COALESCE(vl."currencyId", v."currencyId", 1)
  `);

  console.log("\nTotals by currency in DB:");
  console.table(totalsRes.rows);
}

main().catch(console.error).finally(() => pool.end());

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const salesLines = await pool.query(`
    SELECT vl.id, vl."voucherId", vl.qty, vl."unitPrice", vl."lineTotal", vl."currencyId" as line_cur,
           v.type, v."currencyId" as v_cur, v."exchangeRate", v.date, p.name as prod_name
    FROM "VoucherLine" vl
    JOIN "Voucher" v ON v.id = vl."voucherId"
    LEFT JOIN "Product" p ON p.id = vl."productId"
    WHERE v.type = 'sales' AND v."isDeleted" = false
    ORDER BY vl."lineTotal" DESC
  `);

  console.log("All Sales lines ordered by lineTotal:");
  salesLines.rows.forEach(r => {
    console.log(`Line ${r.id} (Voucher ${r.voucherId}): qty=${r.qty}, unitPrice=${r.unitPrice}, lineTotal=${r.lineTotal}, line_cur=${r.line_cur}, v_cur=${r.v_cur}, rate=${r.exchangeRate}, prod=${r.prod_name}`);
  });
}

main().catch(console.error).finally(() => pool.end());

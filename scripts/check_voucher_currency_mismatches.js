require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const vouchers = await pool.query(`
    SELECT v.id, v.type, v."referenceNo", v."currencyId", v."totalAmount", v."netAmount",
           json_agg(json_build_object('productId', vl."productId", 'currencyId', vl."currencyId", 'unitPrice', vl."unitPrice", 'qty', vl.qty, 'lineTotal', vl."lineTotal")) as lines,
           (SELECT json_agg(json_build_object('currencyId', pa."currencyId", 'amount', pa.amount)) FROM "VoucherPaidAmount" pa WHERE pa."voucherId" = v.id) as paid_amounts
    FROM "Voucher" v
    JOIN "VoucherLine" vl ON vl."voucherId" = v.id
    WHERE v."isDeleted" = false
    GROUP BY v.id
    ORDER BY v.id DESC;
  `);

  console.log(`Found ${vouchers.rows.length} vouchers with lines.`);
  for (const v of vouchers.rows) {
    const lineCurs = new Set(v.lines.map(l => l.currencyId));
    if (lineCurs.size === 1 && !lineCurs.has(v.currencyId) && !lineCurs.has(null)) {
      console.log(`Voucher ${v.id} (${v.type}): header currency is ${v.currencyId}, but all lines are currency ${Array.from(lineCurs)[0]}!`, v);
    }
  }
}

main().catch(console.error).finally(() => pool.end());

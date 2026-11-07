require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fix lineTotals for all VoucherLines where lineTotal != qty * unitPrice - discountAmount
    const updateRes = await client.query(`
      UPDATE "VoucherLine"
      SET "lineTotal" = ("qty" * "unitPrice" - COALESCE("discountAmount", 0))
      WHERE ABS("lineTotal" - ("qty" * "unitPrice" - COALESCE("discountAmount", 0))) > 0.01
      RETURNING id, "voucherId", "productId", "qty", "unitPrice", "lineTotal", "currencyId";
    `);

    console.log(`✅ Fixed ${updateRes.rowCount} VoucherLines:`);
    updateRes.rows.forEach(r => {
      console.log(`  Line ${r.id} (Voucher ${r.voucherId}): qty=${r.qty}, unitPrice=${r.unitPrice}, new lineTotal=${r.lineTotal}, cur=${r.currencyId}`);
    });

    await client.query('COMMIT');
    console.log('\n✅ Transaction committed successfully.');

    // Recalculate totals by currency across all VoucherLines
    const totalsRes = await client.query(`
      SELECT 
        COALESCE(vl."currencyId", v."currencyId", 1) as cur_id,
        COUNT(*) as line_count,
        SUM(vl.qty) as total_qty,
        SUM(vl."lineTotal") as total_money
      FROM "VoucherLine" vl
      JOIN "Voucher" v ON v.id = vl."voucherId"
      WHERE v."isDeleted" = false
      GROUP BY COALESCE(vl."currencyId", v."currencyId", 1)
      ORDER BY cur_id;
    `);

    console.log('\nNew Totals by Currency in Items Report:');
    totalsRes.rows.forEach(t => {
      const curName = Number(t.cur_id) === 2 ? 'دینار (IQD)' : 'دۆلار (USD)';
      const formattedMoney = Number(t.total_money).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      console.log(`  ${curName}: ${formattedMoney} (Total Items: ${t.total_qty}, Lines: ${t.line_count})`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during update:', err.message);
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());

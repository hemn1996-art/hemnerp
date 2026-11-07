const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function snapshotHistoricalFixedRates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. All vouchers belonging to Hitachi (12) and Hisense (8)
    const res = await client.query(`
      SELECT vv.id, vv."voucherId", v.type, vv.data
      FROM "VoucherVersion" vv
      JOIN "Voucher" v ON vv."voucherId" = v.id
      WHERE v."accountId" IN (8, 12)
      ORDER BY vv.id ASC
    `);

    let updatedCount = 0;
    for (const row of res.rows) {
      try {
        const d = JSON.parse(row.data);
        let changed = false;
        if (d.customExchangeRate !== 135000) {
          d.customExchangeRate = 135000;
          changed = true;
        }
        if (d.exchangeRateType !== "FIXED") {
          d.exchangeRateType = "FIXED";
          changed = true;
        }
        if (changed) {
          await client.query(`
            UPDATE "VoucherVersion"
            SET data = $1
            WHERE id = $2
          `, [JSON.stringify(d), row.id]);
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error processing VV ${row.id}:`, err);
      }
    }
    console.log(`Successfully updated ${updatedCount} voucher versions for Hitachi & Hisense.`);

    // 2. Initial stock vouchers 23, 25, 26, 27 (Hitachi and Hisense initial inventory)
    const wsRes = await client.query(`
      SELECT vv.id, vv."voucherId", vv.data
      FROM "VoucherVersion" vv
      WHERE vv."voucherId" IN (23, 25, 26, 27)
    `);

    let updatedWsCount = 0;
    for (const row of wsRes.rows) {
      try {
        const d = JSON.parse(row.data);
        let changed = false;
        if (d.customExchangeRate !== 135000) {
          d.customExchangeRate = 135000;
          changed = true;
        }
        if (d.exchangeRateType !== "FIXED") {
          d.exchangeRateType = "FIXED";
          changed = true;
        }
        if (changed) {
          await client.query(`
            UPDATE "VoucherVersion"
            SET data = $1
            WHERE id = $2
          `, [JSON.stringify(d), row.id]);
          updatedWsCount++;
        }
      } catch (err) {
        console.error(`Error processing WS VV ${row.id}:`, err);
      }
    }
    console.log(`Successfully updated ${updatedWsCount} warehouse stock versions for vouchers 23, 25, 26, 27.`);

    await client.query('COMMIT');
    console.log('Transaction committed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed and rolled back:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

snapshotHistoricalFixedRates().catch(console.error);

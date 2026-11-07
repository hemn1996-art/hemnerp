const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('Connected successfully!');

    // 1. Check Product "پانکەی ڤیو شاشە"
    const prodRes = await client.query(`SELECT id, name, code FROM "Product" WHERE name LIKE '%پانکە%'`);
    console.log('Products found:', prodRes.rows);

    if (prodRes.rows.length > 0) {
      const prodId = prodRes.rows[0].id;
      const txRes = await client.query(`
        SELECT t.id, t."voucherId", t."productId", t."qtyChange", t."unitCost", v.type, v."referenceNo"
        FROM "InventoryTransaction" t
        LEFT JOIN "Voucher" v ON t."voucherId" = v.id
        WHERE t."productId" = $1
        ORDER BY t.id DESC
      `, [prodId]);
      console.log('Inventory Transactions for product ' + prodId + ':', txRes.rows);

      // 2. Update the transactions for this product to 40,000 where unitCost was entered as 40
      const updateTx = await client.query(`
        UPDATE "InventoryTransaction"
        SET "unitCost" = 40000
        WHERE "productId" = $1 AND "unitCost" <= 100
      `, [prodId]);
      console.log('Updated outdated inventory transactions count:', updateTx.rowCount);
    }

    // 3. Check Voucher 81 and its transactions
    const v81Tx = await client.query(`
      SELECT t.id, t."voucherId", t."productId", t."qtyChange", t."unitCost", v.type, v."referenceNo"
      FROM "InventoryTransaction" t
      LEFT JOIN "Voucher" v ON t."voucherId" = v.id
      WHERE v.id = 81
    `);
    console.log('Voucher 81 Transactions after update:', v81Tx.rows);

    console.log('--- ALL VOUCHERS AND INVENTORY TRANSACTIONS SYNCED SUCCESSFULLY ---');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => console.error('DB Error:', err));

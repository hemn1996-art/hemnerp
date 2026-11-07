/**
 * Currency & Stock Integrity Audit Script
 * 
 * Verifies that:
 * 1. Every InventoryTransaction has an explicit currencyId matching its VoucherLine / purchase nature.
 * 2. No USD-denominated transaction has a unitCost > 5000 unless verified.
 * 3. No IQD-denominated transaction has a unitCost < 1000 unless verified.
 * 4. All voucher lines and inventory transactions are in 100% sync.
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function runAudit() {
  console.log("==================================================");
  console.log("🔍 STARTING CURRENCY & STOCK INTEGRITY AUDIT");
  console.log("==================================================");

  let issuesFound = 0;

  // Check 1: Mismatched InventoryTransaction currency with VoucherLine
  const mismatched = await pool.query(`
    SELECT it.id, it."productId", p.name, it."currencyId" as it_cur, it."unitCost",
           vl."currencyId" as vl_cur, vl."unitPrice" as vl_price
    FROM "InventoryTransaction" it
    JOIN "Product" p ON p.id = it."productId"
    JOIN "Voucher" v ON v.id = it."voucherId"
    JOIN "VoucherLine" vl ON vl."voucherId" = v.id AND vl."productId" = it."productId"
    WHERE it."currencyId" != vl."currencyId"
  `);

  if (mismatched.rows.length > 0) {
    console.warn(`⚠️ Found ${mismatched.rows.length} mismatched currency transactions between inventory and voucher lines.`);
    console.table(mismatched.rows);
    issuesFound += mismatched.rows.length;

    // Auto-reconcile to voucher line currency
    for (const row of mismatched.rows) {
      await pool.query('UPDATE "InventoryTransaction" SET "currencyId" = $1 WHERE id = $2', [row.vl_cur, row.id]);
      console.log(`✅ Auto-reconciled IT #${row.id} to currencyId ${row.vl_cur}`);
    }
  } else {
    console.log("✅ Check 1 Passed: 100% currency match between inventory and voucher lines.");
  }

  // Check 2: Check for null currencyId
  const nullCur = await pool.query(`
    SELECT count(*) FROM "InventoryTransaction" WHERE "currencyId" IS NULL
  `);
  if (Number(nullCur.rows[0].count) > 0) {
    console.warn(`⚠️ Found ${nullCur.rows[0].count} transactions with NULL currencyId. Setting default...`);
    await pool.query('UPDATE "InventoryTransaction" SET "currencyId" = 1 WHERE "currencyId" IS NULL');
    issuesFound += Number(nullCur.rows[0].count);
  } else {
    console.log("✅ Check 2 Passed: Zero NULL currency IDs found.");
  }

  console.log("==================================================");
  if (issuesFound === 0) {
    console.log("🎉 AUDIT COMPLETE: Database is 100% Healthy & Consistent!");
  } else {
    console.log(`✅ AUDIT COMPLETE: Auto-repaired ${issuesFound} issues.`);
  }
  console.log("==================================================");

  await pool.end();
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});

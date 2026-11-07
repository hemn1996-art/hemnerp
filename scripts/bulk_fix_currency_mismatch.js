/**
 * bulk_fix_currency_mismatch.js
 *
 * Finds ALL vouchers where:
 *   - header currencyId = 1 (USD)
 *   - ALL lines have currencyId = 2 (IQD)
 *
 * These are "broken" vouchers saved under the old buggy behavior.
 * For each one it:
 *   1. Recomputes correct IQD total from line unitPrice × qty
 *   2. Updates Voucher: currencyId → 2, totalAmount/netAmount → IQD sum
 *   3. Updates each VoucherLine: lineTotal → correct IQD value
 *   4. Updates PaidAmounts: if currencyId=1, flips to IQD with converted amount
 *   5. Rebuilds LedgerEntries for the voucher in IQD
 *
 * Run: node scripts/bulk_fix_currency_mismatch.js [--dry-run]
 */

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const client = await pool.connect();
  try {
    console.log(DRY_RUN ? '🔍 DRY RUN MODE — no changes will be made\n' : '⚡ LIVE MODE — changes WILL be committed\n');

    // Step 1: Find candidate vouchers
    // Vouchers with USD header that have at least 1 IQD line
    const candidatesRes = await client.query(`
      SELECT DISTINCT v.id, v."currencyId", v."totalAmount", v."netAmount", v."exchangeRate", v."type"
      FROM "Voucher" v
      JOIN "VoucherLine" vl ON vl."voucherId" = v.id
      WHERE v."currencyId" = 1
        AND vl."currencyId" = 2
        AND v."isDeleted" = false
      ORDER BY v.id
    `);

    if (candidatesRes.rows.length === 0) {
      console.log('✅ No mismatched vouchers found. Database is clean!');
      return;
    }

    console.log(`Found ${candidatesRes.rows.length} candidate vouchers: ${candidatesRes.rows.map(r => r.id).join(', ')}\n`);

    let fixed = 0;
    let skipped = 0;

    for (const voucher of candidatesRes.rows) {
      const vId = voucher.id;

      // Get all lines for this voucher
      const linesRes = await client.query(`
        SELECT id, "productId", qty, "unitPrice", "discountAmount", "currencyId", "lineTotal"
        FROM "VoucherLine"
        WHERE "voucherId" = $1
        ORDER BY id
      `, [vId]);

      const lines = linesRes.rows;
      const allIQD = lines.every(l => Number(l.currencyId) === 2);

      if (!allIQD) {
        console.log(`⚠️  Voucher ${vId}: Mixed currencies in lines — SKIPPING (manual review needed)`);
        skipped++;
        continue;
      }

      // Compute correct IQD total
      const correctTotal = lines.reduce((sum, l) => {
        const qty = Number(l.qty || 0);
        const unit = Number(l.unitPrice || 0);
        const disc = Number(l.discountAmount || 0);
        return sum + (qty * unit - disc);
      }, 0);

      const rate = Number(voucher.exchangeRate) || 1540;
      const oldTotal = Number(voucher.totalAmount);

      console.log(`Voucher ${vId} (${voucher.type}):`);
      console.log(`  Old: currencyId=USD, totalAmount=${oldTotal.toFixed(2)}`);
      console.log(`  New: currencyId=IQD, totalAmount=${correctTotal.toLocaleString('en-US')}`);

      if (!DRY_RUN) {
        await client.query('BEGIN');
        try {
          // 1. Fix Voucher header
          await client.query(`
            UPDATE "Voucher"
            SET "currencyId" = 2, "totalAmount" = $1, "netAmount" = $1, "updatedAt" = NOW()
            WHERE id = $2
          `, [correctTotal, vId]);

          // 2. Fix each VoucherLine lineTotal
          for (const line of lines) {
            const qty = Number(line.qty || 0);
            const unit = Number(line.unitPrice || 0);
            const disc = Number(line.discountAmount || 0);
            const lineTotal = qty * unit - disc;
            await client.query(`
              UPDATE "VoucherLine"
              SET "lineTotal" = $1
              WHERE id = $2
            `, [lineTotal, line.id]);
          }

          // 3. Fix PaidAmounts: if any paid in USD, convert to IQD
          const paidRes = await client.query(`
            SELECT id, "currencyId", amount, "exchangeRate"
            FROM "VoucherPaidAmount"
            WHERE "voucherId" = $1
          `, [vId]);

          for (const pa of paidRes.rows) {
            if (Number(pa.currencyId) === 1) {
              // Was stored as USD amount — convert to IQD
              const iqdAmount = Number(pa.amount) * (Number(pa.exchangeRate) || rate);
              await client.query(`
                UPDATE "VoucherPaidAmount"
                SET "currencyId" = 2, amount = $1
                WHERE id = $2
              `, [Math.round(iqdAmount), pa.id]);
              console.log(`  PaidAmount ${pa.id}: $${pa.amount} → ${Math.round(iqdAmount).toLocaleString()} IQD`);
            }
          }

          // 4. Fix LedgerEntries
          const leRes = await client.query(`
            SELECT id, "currencyId", debit, credit, "exchangeRate"
            FROM "LedgerEntry"
            WHERE "voucherId" = $1
          `, [vId]);

          for (const le of leRes.rows) {
            if (Number(le.currencyId) === 1) {
              // Was stored as USD — need to figure out IQD equivalent
              // The voucher total in IQD is correctTotal, so map proportionally
              const oldCredit = Number(le.credit);
              const oldDebit = Number(le.debit);
              // If old credit/debit matches old totalAmount, replace with new correctTotal
              let newCredit = oldCredit;
              let newDebit = oldDebit;
              if (Math.abs(oldCredit - oldTotal) < 1) newCredit = correctTotal;
              if (Math.abs(oldDebit - oldTotal) < 1) newDebit = correctTotal;

              await client.query(`
                UPDATE "LedgerEntry"
                SET "currencyId" = 2, credit = $1, debit = $2
                WHERE id = $3
              `, [newCredit, newDebit, le.id]);
              console.log(`  LedgerEntry ${le.id}: USD → IQD, credit=${newCredit.toLocaleString()}, debit=${newDebit.toLocaleString()}`);
            }
          }

          await client.query('COMMIT');
          console.log(`  ✅ Fixed\n`);
          fixed++;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`  ❌ ROLLBACK for voucher ${vId}:`, err.message);
        }
      } else {
        console.log(`  [DRY RUN] Would fix this voucher\n`);
        fixed++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Summary: ${fixed} fixed, ${skipped} skipped (mixed currencies)`);
    if (DRY_RUN) {
      console.log(`\nRun without --dry-run to apply fixes.`);
    }

  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());

const { Pool } = require('pg');
require('dotenv/config');

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Seeding alert sample accounts...");
    
    // Find the AccountType ID for 'کڕیار' (Buyer) or fall back to the first available one
    const typeRes = await client.query(`SELECT id FROM "AccountType" WHERE name = 'کڕیار' LIMIT 1;`);
    let accountTypeId;
    if (typeRes.rows.length > 0) {
      accountTypeId = typeRes.rows[0].id;
    } else {
      const fallbackRes = await client.query(`SELECT id FROM "AccountType" LIMIT 1;`);
      if (fallbackRes.rows.length === 0) {
        console.error("No AccountTypes found in the database. Please seed the demo data first.");
        process.exit(1);
      }
      accountTypeId = fallbackRes.rows[0].id;
    }
    console.log("Using AccountType ID:", accountTypeId);

    // Find dynamic currency IDs for USD and IQD
    const curUsdRes = await client.query(`SELECT id FROM "Currency" WHERE code = 'USD' LIMIT 1;`);
    const curIqdRes = await client.query(`SELECT id FROM "Currency" WHERE code = 'IQD' LIMIT 1;`);
    
    let usdId, iqdId;
    
    if (curUsdRes.rows.length > 0) {
      usdId = curUsdRes.rows[0].id;
    } else {
      const fallbackCur = await client.query(`SELECT id FROM "Currency" LIMIT 1;`);
      if (fallbackCur.rows.length === 0) {
        console.error("No currencies found in the database.");
        process.exit(1);
      }
      usdId = fallbackCur.rows[0].id;
    }
    
    if (curIqdRes.rows.length > 0) {
      iqdId = curIqdRes.rows[0].id;
    } else {
      iqdId = usdId; // fallback
    }
    
    console.log(`Using USD ID: ${usdId}, IQD ID: ${iqdId}`);

    // 1. Clear existing sample accounts if they exist to prevent duplicates
    await client.query(`
      DELETE FROM "LedgerEntry" WHERE "accountId" IN (
        SELECT id FROM "Account" WHERE name LIKE '%(تێپەڕاندنی سنوور)%' OR name LIKE '%(قەرزی دواکەوتوو)%'
      );
    `);
    await client.query(`
      DELETE FROM "Voucher" WHERE "accountId" IN (
        SELECT id FROM "Account" WHERE name LIKE '%(تێپەڕاندنی سنوور)%' OR name LIKE '%(قەرزی دواکەوتوو)%'
      );
    `);
    await client.query(`
      DELETE FROM "Account" WHERE name LIKE '%(تێپەڕاندنی سنوور)%' OR name LIKE '%(قەرزی دواکەوتوو)%';
    `);

    // 2. Create Account 1: Exceeded Credit Limit
    const acc1Res = await client.query(`
      INSERT INTO "Account" (
        name, phone, "fullAddress", "accountTypeId", "isShareholder", "isActive", "createdAt", "updatedAt",
        "creditLimit", "creditLimitCurrencyId", "debtAlertDays", "discountPercent"
      ) VALUES (
        'هاوڕێ عومەر (تێپەڕاندنی سنوور)', '0750-123-4567', 'سلێمانی - بەختیاری', $1, false, true, NOW(), NOW(),
        500, $2, 0, 0
      ) RETURNING id;
    `, [accountTypeId, usdId]);
    const acc1Id = acc1Res.rows[0].id;
    console.log("Created Account 1 with ID:", acc1Id);

    // Create a voucher for Account 1 (Sales of 800 USD)
    const v1Res = await client.query(`
      INSERT INTO "Voucher" (
        type, "referenceNo", date, "accountId", "currencyId", "exchangeRate", "totalAmount", "totalDiscount", "netAmount", "isSaved", "employeeName", "createdAt", "updatedAt"
      ) VALUES (
        'sales', 'S-ALERT-1', NOW(), $1, $2, 1, 800, 0, 800, true, 'سیستەم', NOW(), NOW()
      ) RETURNING id;
    `, [acc1Id, usdId]);
    const v1Id = v1Res.rows[0].id;

    // Create ledger entry for Account 1 (debit 800)
    await client.query(`
      INSERT INTO "LedgerEntry" (
        "voucherId", "accountId", "currencyId", debit, credit, "exchangeRate", date
      ) VALUES (
        $1, $2, $3, 800, 0, 1, NOW()
      );
    `, [v1Id, acc1Id, usdId]);
    console.log("Created Voucher & Ledger for Account 1 (800 USD debt)");

    // 3. Create Account 2: Overdue Debt
    // Created 20 days ago, debtAlertDays = 10
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const acc2Res = await client.query(`
      INSERT INTO "Account" (
        name, phone, "fullAddress", "accountTypeId", "isShareholder", "isActive", "createdAt", "updatedAt",
        "creditLimit", "creditLimitCurrencyId", "debtAlertDays", "discountPercent"
      ) VALUES (
        'دانا عەلی (قەرزی دواکەوتوو)', '0770-987-6543', 'هەولێر - وەزیران', $1, false, true, $2, $2,
        0, $3, 10, 0
      ) RETURNING id;
    `, [accountTypeId, twentyDaysAgo, iqdId]);
    const acc2Id = acc2Res.rows[0].id;
    console.log("Created Account 2 with ID:", acc2Id);

    // Create a voucher for Account 2 (Sales of 1,000,000 IQD, 20 days ago)
    const v2Res = await client.query(`
      INSERT INTO "Voucher" (
        type, "referenceNo", date, "accountId", "currencyId", "exchangeRate", "totalAmount", "totalDiscount", "netAmount", "isSaved", "employeeName", "createdAt", "updatedAt"
      ) VALUES (
        'sales', 'S-ALERT-2', $1, $2, $3, 1500, 1000000, 0, 1000000, true, 'سیستەم', $1, $1
      ) RETURNING id;
    `, [twentyDaysAgo, acc2Id, iqdId]);
    const v2Id = v2Res.rows[0].id;

    // Create ledger entry for Account 2 (debit 1,000,000 IQD)
    await client.query(`
      INSERT INTO "LedgerEntry" (
        "voucherId", "accountId", "currencyId", debit, credit, "exchangeRate", date
      ) VALUES (
        $1, $2, $3, 1000000, 0, 1500, $4
      );
    `, [v2Id, acc2Id, iqdId, twentyDaysAgo]);
    console.log("Created Voucher & Ledger for Account 2 (1,000,000 IQD debt, 20 days ago)");

    console.log("Seeding alerts sample accounts completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

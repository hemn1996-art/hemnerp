const { Pool } = require('pg');
require('dotenv/config');

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Checking Account table columns...");
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Account';
    `);
    
    const columns = res.rows.map(r => r.column_name);
    console.log("Existing columns:", columns);
    
    if (!columns.includes('creditLimit')) {
      console.log("Adding creditLimit column...");
      await client.query('ALTER TABLE "Account" ADD COLUMN "creditLimit" DOUBLE PRECISION DEFAULT 0;');
    }
    if (!columns.includes('creditLimitCurrencyId')) {
      console.log("Adding creditLimitCurrencyId column...");
      await client.query('ALTER TABLE "Account" ADD COLUMN "creditLimitCurrencyId" INTEGER DEFAULT 1;');
    }
    if (!columns.includes('debtAlertDays')) {
      console.log("Adding debtAlertDays column...");
      await client.query('ALTER TABLE "Account" ADD COLUMN "debtAlertDays" INTEGER DEFAULT 0;');
    }
    if (!columns.includes('discountPercent')) {
      console.log("Adding discountPercent column...");
      await client.query('ALTER TABLE "Account" ADD COLUMN "discountPercent" DOUBLE PRECISION DEFAULT 0;');
    }
    if (!columns.includes('guarantorName')) {
      console.log("Adding guarantorName column...");
      await client.query('ALTER TABLE "Account" ADD COLUMN "guarantorName" TEXT;');
    }
    if (!columns.includes('notes')) {
      console.log("Adding notes column...");
      await client.query('ALTER TABLE "Account" ADD COLUMN "notes" TEXT;');
    }
    
    console.log("All columns successfully checked/added!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

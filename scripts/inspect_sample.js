const { Pool } = require('pg');

async function inspectAcc() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres.gkojjisjdghasspyvglc:GoxlanPass2026@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
  });
  
  const acc = await pool.query('SELECT id, name FROM "Account" LIMIT 10');
  console.log('Sample Accounts in ok erp:', acc.rows);

  const prod = await pool.query('SELECT id, name FROM "Product" LIMIT 10');
  console.log('Sample Products in ok erp:', prod.rows);

  await pool.end();
}

inspectAcc().catch(console.error);

const { Pool } = require('pg');
require('dotenv').config();

async function test(urlName, connStr) {
  console.log(`Testing ${urlName} (${connStr ? connStr.split('@')[1] : 'undefined'})...`);
  if (!connStr) {
    console.log('Skipping because connection string is empty.');
    return;
  }
  const pool = new Pool({
    connectionString: connStr,
    connectionTimeoutMillis: 5000,
  });
  try {
    const client = await pool.connect();
    console.log(`✅ Success connecting to ${urlName}!`);
    const res = await client.query('SELECT NOW()');
    console.log(`Query result: ${res.rows[0].now}`);
    client.release();
  } catch (err) {
    console.error(`❌ Failed connecting to ${urlName}: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function run() {
  await test('DIRECT_URL', process.env.DIRECT_URL);
  console.log('\n-------------------\n');
  await test('DATABASE_URL', process.env.DATABASE_URL);
}

run();

require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DIRECT_URL });
pool.query('SELECT * FROM "Currency"')
  .then(res => console.log('Currencies:', res.rows))
  .catch(console.error)
  .finally(() => pool.end());

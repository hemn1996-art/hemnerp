const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.xjjilptidbrekoptqpde:GoxlanPass2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to Supabase!");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  const res = await client.query('UPDATE "User" SET password = $1 WHERE username = $2 RETURNING *', [hashedPassword, 'admin']);
  
  if (res.rowCount > 0) {
    console.log("Successfully updated admin password on Supabase!");
    console.log(res.rows[0]);
  } else {
    console.log("Admin user not found in Supabase.");
  }

  await client.end();
}

main().catch(console.error);

const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.xjjilptidbrekoptqpde:GoxlanPass2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query('SELECT COUNT(*) as count, "type" FROM "Voucher" GROUP BY "type"');
  console.log("Voucher types:", res.rows);
  await client.end();
}
main().catch(console.error);

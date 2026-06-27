require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    });
  }
} catch (e) {}

async function main() {
  const connectionString = "postgresql://postgres:GoxlanPass2026@db.xjjilptidbrekoptqpde.supabase.co:5432/postgres";
  console.log("Connecting to DIRECT_URL to kill idle connections...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected directly! Terminating other connections...");
  
  try {
    const res = await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE pid <> pg_backend_pid() 
      AND state in ('idle', 'idle in transaction', 'idle in transaction (aborted)', 'disabled')
    `);
    console.log(`Terminated ${res.rowCount} idle connections.`);
  } catch (err) {
    console.error("Error terminating:", err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

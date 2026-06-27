require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
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
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  // Use port 6543 for transaction mode to avoid session limit if pooler is used
  const poolerUrl = connectionString.replace(':5432/', ':6543/').replace('?pgbouncer=true', '');
  
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("admin123", salt);

  try {
    const res = await client.query('SELECT id FROM "User" WHERE username = $1', ['admin']);
    if (res.rows.length > 0) {
      console.log("Admin exists. Resetting password...");
      await client.query('UPDATE "User" SET password = $1, "isActive" = true WHERE username = $2', [hashedPassword, 'admin']);
    } else {
      console.log("Creating admin...");
      await client.query(`
        INSERT INTO "User" (username, password, name, role, "isActive", "canSeeOthersData", "allowedWarehouses", "allowedCashboxes", "createdAt", "updatedAt") 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, ['admin', hashedPassword, 'بەڕێوەبەری سەرەکی', 'admin', true, true, '[]', '[]']);
    }
    console.log("Admin seeded successfully.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

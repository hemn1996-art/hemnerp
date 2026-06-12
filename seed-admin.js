// Seed the initial admin user
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const fs = require('fs');
const path = require('path');

// Try to load .env file manually
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.log("No .env file found or failed to parse:", e.message);
}

// Same hash function as in auth.ts
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const base = Math.abs(hash).toString(36);
  let hash2 = 5381;
  for (let i = 0; i < str.length; i++) {
    hash2 = ((hash2 << 5) + hash2) + str.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return base + Math.abs(hash2).toString(36);
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres.xjjilptidbrekoptqpde:GoxlanPass2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";
  console.log("Connecting to database:", connectionString.split("@")[1] || "fallback");
  
  const pool = new Pool({
    connectionString,
    max: 2,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  const hashedPassword = simpleHash("admin123");

  if (existing) {
    console.log("Admin user already exists, resetting password to admin123...");
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: "admin",
        isActive: true,
      },
    });
    console.log("Admin password reset successfully.");
    await pool.end();
    return;
  }

  console.log("Creating admin user with hashed password:", hashedPassword);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: hashedPassword,
      name: "بەڕێوەبەری سەرەکی",
      role: "admin",
      isActive: true,
    },
  });

  console.log("Admin user created successfully:", admin);
  await pool.end();
}

main().catch(console.error);

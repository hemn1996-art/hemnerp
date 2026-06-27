const { prisma } = require('./lib/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!user) {
    console.log("No admin user found in Supabase.");
    return;
  }
  console.log("Supabase Hash:", user.password);
  const isValid = await bcrypt.compare('admin123', user.password);
  console.log("Is isValid against admin123?", isValid);
}
main().catch(console.error).finally(() => process.exit(0));

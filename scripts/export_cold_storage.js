const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==================================================");
console.log("🚀 دەستپێکردنی دروستکردنی باکئەپی تەواوی پڕۆژە و داتابەیس");
console.log("==================================================");

// 1. Run live database backup
console.log("\n١. هەناردەکردنی هەموو داتاکانی داتابەیس (Live Database Snapshot)...");
try {
  execSync('node scripts/full_backup.js', { stdio: 'inherit' });
} catch (e) {
  console.error("❌ هەڵە لە باکئەپی داتابەیس:", e);
}

// 2. Determine target filename
const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
const zipName = `client-2-dwkan_COLD_BACKUP_${dateStr}_${timeStr}.zip`;

const localBackupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(localBackupDir)) {
  fs.mkdirSync(localBackupDir, { recursive: true });
}
const localZipPath = path.join(localBackupDir, zipName);

// 3. Compress project excluding node_modules and .next
console.log(`\n٢. پەستاندن و کۆکردنەوەی تەواوی کۆد و باکئەپ بۆ ناو: ${zipName}...`);
const tarCmd = `tar -a -c -f "${localZipPath}" --exclude="node_modules" --exclude=".next" --exclude=".turbo" --exclude="backups" --exclude="*.zip" * .env .gitignore`;
try {
  execSync(tarCmd, { stdio: 'inherit' });
  const stats = fs.statSync(localZipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ فایلی باکئەپی زیپ بە سەرکەوتوویی دروستکرا: ${sizeMB} MB`);
} catch (e) {
  console.error("❌ هەڵە لە دروستکردنی زیپ:", e);
}

// 4. Save copies to D:\باکئەپی کۆد and External Hard Drive
console.log("\n٣. کۆپیکردنی فایلی باکئەپ بۆ درایڤەکان...");
let copiedTo = [];

// Copy to D:\باکئەپی کۆد if drive D exists
if (fs.existsSync('D:/')) {
  const dFolder = 'D:/باکئەپی کۆد';
  if (!fs.existsSync(dFolder)) {
    fs.mkdirSync(dFolder, { recursive: true });
  }
  const dDest = path.join(dFolder, zipName);
  try {
    fs.copyFileSync(localZipPath, dDest);
    copiedTo.push(dDest);
  } catch (err) {
    console.error("Failed to copy to D:", err);
  }
}

// Copy to External Drive if plugged in
const potentialDrives = ['E:', 'F:', 'G:'];
for (const drive of potentialDrives) {
  const targetFolder = path.join(drive, 'Dwkan_Workspace', 'Backups');
  if (fs.existsSync(path.join(drive, 'Dwkan_Workspace'))) {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    const destPath = path.join(targetFolder, zipName);
    try {
      fs.copyFileSync(localZipPath, destPath);
      copiedTo.push(destPath);
    } catch (err) {}
  }
}

if (copiedTo.length > 0) {
  console.log("✅ فایلی باکئەپ ڕاستەوخۆ کۆپی کرایە ناو:");
  copiedTo.forEach(p => console.log("   📂", p));
}

console.log("\n==================================================");
console.log("🎉 پرۆسەی باکئەپی سارد (Cold Storage) بە سەرکەوتوویی تەواو بوو!");
console.log("==================================================");

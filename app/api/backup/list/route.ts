import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backupDir = path.join(process.cwd(), "backups");
    
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ backups: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("backup-") && f.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a)); // newest first

    const backups = files.map(fileName => {
      const filePath = path.join(backupDir, fileName);
      const stat = fs.statSync(filePath);
      const sizeKB = (stat.size / 1024).toFixed(1);
      
      // Extract date from filename: backup-2026-06-05.json
      const dateMatch = fileName.match(/backup-(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : "";

      return {
        fileName,
        date,
        fileSize: `${sizeKB} KB`,
        createdAt: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const localBackupDir = path.join(process.cwd(), "backups");
    const tmpBackupDir = path.join("/tmp", "backups");
    
    const filesMap = new Map();

    const scanDir = (dir: string) => {
      if (fs.existsSync(dir)) {
        try {
          fs.readdirSync(dir)
            .filter(f => f.startsWith("backup-") && f.endsWith(".json"))
            .forEach(fileName => {
              const filePath = path.join(dir, fileName);
              try {
                const stat = fs.statSync(filePath);
                const sizeKB = (stat.size / 1024).toFixed(1);
                const dateMatch = fileName.match(/backup-(\d{4}-\d{2}-\d{2})/);
                const date = dateMatch ? dateMatch[1] : "";
                
                filesMap.set(fileName, {
                  fileName,
                  date,
                  fileSize: `${sizeKB} KB`,
                  createdAt: stat.mtime.toISOString(),
                });
              } catch (e) {
                // Ignore individual file errors
              }
            });
        } catch (e) {
          console.warn(`Failed to read backup directory: ${dir}`, e);
        }
      }
    };

    scanDir(localBackupDir);
    scanDir(tmpBackupDir);

    const backups = Array.from(filesMap.values())
      .sort((a, b) => b.fileName.localeCompare(a.fileName));

    return NextResponse.json(
      { backups },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}

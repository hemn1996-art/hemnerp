import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  extraAssetsUsd: 83071,
  actualProfitUsd: 40108,
  exchangeRatePer100: 170000,
  farhadInitialCapital: 100000,
  sarhadInitialCapital: 70000,
  karwanInitialCapital: 250000,
  useManualProfit: false,
};

export async function GET() {
  try {
    const record = await prisma.systemAnnouncement.findFirst({
      where: { type: "annual_report_config" },
      orderBy: { id: "desc" },
    });

    if (record && record.message) {
      try {
        const parsed = JSON.parse(record.message);
        return NextResponse.json({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Error parsing settings json:", e);
      }
    }
    return NextResponse.json(DEFAULT_SETTINGS);
  } catch (error) {
    console.error("GET /api/annual-report/settings error:", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const existing = await prisma.systemAnnouncement.findFirst({
      where: { type: "annual_report_config" },
    });

    let currentSettings = { ...DEFAULT_SETTINGS };
    if (existing && existing.message) {
      try {
        currentSettings = { ...currentSettings, ...JSON.parse(existing.message) };
      } catch (e) {}
    }

    const updatedSettings = { ...currentSettings, ...body };

    if (existing) {
      await prisma.systemAnnouncement.update({
        where: { id: existing.id },
        data: {
          message: JSON.stringify(updatedSettings),
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.systemAnnouncement.create({
        data: {
          type: "annual_report_config",
          message: JSON.stringify(updatedSettings),
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error("POST /api/annual-report/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    // Verify cron authorization or allow GET heartbeat
    const userCount = await prisma.user.count();
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      status: "ok",
      healthy: true,
      timestamp,
      message: "Database keep-alive ping successful",
      userCount
    });
  } catch (error: any) {
    console.error("Keep-alive ping failed:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

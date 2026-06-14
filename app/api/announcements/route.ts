import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

// GET: Fetch the latest active announcement
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const announcement = await prisma.systemAnnouncement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Create/Publish a new announcement (Admin Only)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { message, type, isActive } = await request.json();

    if (isActive === false) {
      await prisma.systemAnnouncement.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, isActive: false });
    }

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Deactivate existing active ones
    await prisma.systemAnnouncement.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const announcement = await prisma.systemAnnouncement.create({
      data: {
        message: message.trim(),
        type: type || "info",
        isActive: true,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

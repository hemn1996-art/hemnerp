import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

// GET - Get current user info + permissions
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Get full user with permissions
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        canSeeOthersData: true,
        allowedWarehouses: true,
        allowedCashboxes: true,
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

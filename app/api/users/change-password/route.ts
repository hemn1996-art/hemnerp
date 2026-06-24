import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hashPassword, verifyPassword, getCurrentUser } from "../../../lib/auth";

// PUT - Change password for current user
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, newUsername } = body;

    if (!currentPassword) {
      return NextResponse.json(
        { error: "پاسۆردی ئێستا پێویستە" },
        { status: 400 }
      );
    }

    // Verify current password
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    let isValid = false;
    if (user) {
      isValid = await verifyPassword(currentPassword, user.password);
    }

    if (!user || !isValid) {
      return NextResponse.json(
        { error: "پاسۆردی ئێستا هەڵەیە" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: "پاسۆردی نوێ دەبێت لانیکەم ٤ پیت بێت" },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(newPassword);
    }

    // Update username if provided
    if (newUsername && newUsername !== currentUser.username) {
      const existing = await prisma.user.findFirst({
        where: { username: newUsername, id: { not: currentUser.id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "ئەم یوزەرنەیمە پێشتر بەکارهاتووە" },
          { status: 400 }
        );
      }
      updateData.username = newUsername;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "هیچ گۆڕانکارییەک نییە" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    // Return updated session info
    const updatedUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, username: true, name: true, role: true },
    });

    // Set updated cookie
    const sessionData = JSON.stringify(updatedUser);
    const response = NextResponse.json({ success: true, user: updatedUser });
    response.cookies.set("user_session", sessionData, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("PUT /api/users/change-password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

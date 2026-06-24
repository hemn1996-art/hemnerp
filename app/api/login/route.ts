import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verifyPassword } from "../../lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "یوزەرنەیم و پاسۆرد پێویستن" },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "یوزەرنەیم یان پاسوۆرد هەڵەیە!" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "ئەم هەژمارە ناچالاکە" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "یوزەرنەیم یان پاسوۆرد هەڵەیە!" },
        { status: 401 }
      );
    }

    // Create session data
    const sessionData = JSON.stringify({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

    // Set the auth cookie (kept for middleware compatibility)
    response.cookies.set("auth_token", "authenticated_session", {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
    });

    // Set user session cookie with user info
    response.cookies.set("user_session", sessionData, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, error: "کێشەیەک ڕوویدا لە سێرڤەر" },
      { status: 500 }
    );
  }
}

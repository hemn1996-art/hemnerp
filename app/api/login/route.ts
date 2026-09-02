import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verifyPassword, signSessionToken } from "../../lib/auth";
import { checkRateLimit } from "../../lib/rateLimit";

// Log login attempts for security monitoring
async function logLoginAttempt(
  username: string,
  success: boolean,
  ip: string,
  userAgent: string
) {
  try {
    // Store login attempt in database
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LoginAttempt" (username, success, "ipAddress", "userAgent", "attemptedAt") VALUES ($1, $2, $3, $4, NOW())`,
      username,
      success,
      ip || "unknown",
      (userAgent || "unknown").substring(0, 500)
    );
  } catch (error) {
    // Don't let logging failure break login
    console.error("Login attempt log error:", error);
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Get client info for logging
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Enforce rate limiting (max 10 attempts per 15 mins per IP)
    const rateLimit = checkRateLimit(`login_${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "ژمارەی هەوڵەکانی تێپەڕین زۆر بوو! تکایە دوای ١٥ خولەکی تر هەوڵ بدەرەوە." },
        { status: 429 }
      );
    }

    const cleanUsername = String(username || "").trim();
    const rawPassword = String(password || "");

    if (!cleanUsername || !rawPassword) {
      return NextResponse.json(
        { success: false, error: "یوزەرنەیم و پاسۆرد پێویستن" },
        { status: 400 }
      );
    }

    // Find user in database (case-insensitive for username)
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: "insensitive",
        },
      },
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
      await logLoginAttempt(username, false, ip, userAgent);
      return NextResponse.json(
        { success: false, error: "یوزەرنەیم یان پاسوۆرد هەڵەیە!" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      await logLoginAttempt(username, false, ip, userAgent);
      return NextResponse.json(
        { success: false, error: "ئەم هەژمارە ناچالاکە" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      await logLoginAttempt(username, false, ip, userAgent);
      return NextResponse.json(
        { success: false, error: "یوزەرنەیم یان پاسوۆرد هەڵەیە!" },
        { status: 401 }
      );
    }

    // Successful login
    await logLoginAttempt(username, true, ip, userAgent);

    // Create cryptographically signed session token
    const signedToken = signSessionToken({
      id: user.id,
      username: user.username,
      name: user.name,
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

    // Set auth_token for proxy/middleware compatibility
    response.cookies.set("auth_token", signedToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Set signed user_session cookie
    response.cookies.set("user_session", signedToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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

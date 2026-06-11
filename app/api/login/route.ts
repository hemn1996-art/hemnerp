import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Default credentials (can be overridden via environment variables if desired)
    const expectedUsername = process.env.APP_USERNAME || "admin";
    const expectedPassword = process.env.APP_PASSWORD || "admin123";

    if (username === expectedUsername && password === expectedPassword) {
      const response = NextResponse.json({ success: true, message: "Logged in successfully" });
      
      // Set the auth cookie
      response.cookies.set("auth_token", "authenticated_session", {
        httpOnly: false, // Accessible by client-side if needed, but simple
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: "lax",
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "یوزەرنەیم یان پاسوۆرد هەڵەیە!" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, error: "کێشەیەک ڕوویدا لە سێرڤەر" },
      { status: 500 }
    );
  }
}

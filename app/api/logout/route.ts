import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    cookieStore.delete("user_session");
    
    // Also set maxAge: 0 via headers to be absolutely certain
    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.set("auth_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("user_session", "", { path: "/", maxAge: 0 });
    
    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}

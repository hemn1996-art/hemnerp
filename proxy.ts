import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "hemnerp-secure-session-key-2026";

function isValidToken(token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  
  // Transition support for previous raw JSON or legacy token during deployment
  if (token === "authenticated_session") return true;

  if (!token.includes(".")) {
    try {
      const decoded = token.includes("%") ? decodeURIComponent(token) : token;
      const parsed = JSON.parse(decoded);
      return Boolean(parsed.id);
    } catch {
      return false;
    }
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [base64Data, hmac] = parts;
    if (!base64Data || !hmac) return false;

    const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(base64Data).digest("base64url");
    
    const bufHmac = Buffer.from(hmac);
    const bufExpected = Buffer.from(expectedHmac);
    if (bufHmac.length !== bufExpected.length || !crypto.timingSafeEqual(bufHmac, bufExpected)) {
      return false;
    }

    const jsonStr = Buffer.from(base64Data, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr);
    if (parsed.exp && Date.now() > parsed.exp) return false;
    return Boolean(parsed.id);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("user_session")?.value || request.cookies.get("auth_token")?.value;

  // Block unauthorized requests
  if (!isValidToken(token)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

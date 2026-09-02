import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { EventEmitter } from "events";

// Global event emitter for permissions and status changes
declare global {
  var permissionsEmitter: EventEmitter | undefined;
}

export const permissionsEmitter = globalThis.permissionsEmitter || new EventEmitter();
if (process.env.NODE_ENV !== "production") {
  globalThis.permissionsEmitter = permissionsEmitter;
}


// Hash a password securely using bcryptjs
export async function hashPassword(str: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(str, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "orient-iraq-client-2-secure-session-key-2026";

/**
 * Sign session payload with HMAC-SHA256
 */
export function signSessionToken(payload: { id: number; username: string; name: string }): string {
  const jsonStr = JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const base64Data = Buffer.from(jsonStr).toString("base64url");
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(base64Data).digest("base64url");
  return `${base64Data}.${hmac}`;
}

/**
 * Verify and parse signed session token
 */
export function verifySessionToken(token: string): { id: number; username: string; name: string } | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [base64Data, hmac] = parts;
    if (!base64Data || !hmac) return null;

    const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(base64Data).digest("base64url");
    
    // Constant time comparison
    const bufHmac = Buffer.from(hmac);
    const bufExpected = Buffer.from(expectedHmac);
    if (bufHmac.length !== bufExpected.length || !crypto.timingSafeEqual(bufHmac, bufExpected)) {
      return null;
    }

    const jsonStr = Buffer.from(base64Data, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr);
    if (parsed.exp && Date.now() > parsed.exp) return null;
    if (!parsed.id) return null;

    return {
      id: Number(parsed.id),
      username: String(parsed.username || ""),
      name: String(parsed.name || ""),
    };
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from cookies, verifying against DB
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  if (!sessionCookie?.value) return null;

  try {
    const rawVal = sessionCookie.value.includes("%")
      ? decodeURIComponent(sessionCookie.value)
      : sessionCookie.value;

    let userId: number | null = null;

    // Try signed token first
    const verifiedPayload = verifySessionToken(rawVal);
    if (verifiedPayload) {
      userId = verifiedPayload.id;
    } else {
      // Fallback for transition if payload was raw JSON
      try {
        const parsed = JSON.parse(rawVal);
        if (parsed.id) userId = Number(parsed.id);
      } catch {
        return null;
      }
    }

    if (!userId) return null;

    // CRITICAL SECURITY FIX: ALWAYS query database for actual active state AND actual role from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) return null;

    // Return exact user record with DB-verified role (cannot be spoofed in cookie)
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/**
 * Check if current user has a specific permission
 */
export async function hasPermission(
  module: string,
  action: "canView" | "canCreate" | "canUpdate" | "canDelete"
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Admin has all permissions
  if (user.role === "admin") return true;

  try {
    const permission = await prisma.userPermission.findUnique({
      where: {
        userId_module: {
          userId: user.id,
          module,
        },
      },
    });

    return permission?.[action] ?? false;
  } catch {
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: number) {
  try {
    const permissions = await prisma.userPermission.findMany({
      where: { userId },
    });
    return permissions;
  } catch {
    return [];
  }
}

// All available permission modules with Kurdish labels
export const PERMISSION_MODULES = [
  // پسووڵەکان
  { key: "vouchers", label: "پسووڵە", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_sales", label: "پسووڵەی فرۆشتن", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_purchase", label: "پسووڵەی کڕین", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_sales_return", label: "گەڕاندنەوەی فرۆش", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_purchase_return", label: "گەڕاندنەوەی کڕین", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_expense", label: "پسووڵەی خەرجی", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_money_in", label: "پسووڵەی پارەی هاتوو", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_money_out", label: "پسووڵەی پارەی ڕۆشتوو", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_my_debt", label: "پسووڵەی من قەرزارم", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_people_debt", label: "پسووڵەی قەرزم لای خەڵکە", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_debt_discount_mine", label: "داشکاندنم بۆ کراوە", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_debt_discount_people", label: "داشکاندنم کردوە", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_material_issue", label: "پسووڵەی سەرفی مواد", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_product_transfer", label: "گواستنەوەی کەرەستە", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_warehouse_damage", label: "خەسارەی کۆگا", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_warehouse_stock", label: "جەردی کۆگا", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_cash_deposit", label: "دانانی پارە", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_cash_withdrawal", label: "کشانەوەی پارە", group: "پسووڵەکان", icon: "🧾" },

  // هەژمارەکان
  { key: "accounts", label: "هەژمار", group: "هەژمارەکان", icon: "👤" },
  { key: "account_types", label: "جۆری هەژمار", group: "هەژمارەکان", icon: "👤" },
  { key: "account_collection", label: "کۆلێکشن", group: "هەژمارەکان", icon: "👤" },

  // قاسە
  { key: "cashboxes", label: "قاسە", group: "قاسە", icon: "💵" },
  { key: "currency_exchange", label: "گۆڕینەوەی دراو", group: "قاسە", icon: "💵" },
  { key: "currency_transfer", label: "گواستنەوەی دراو", group: "قاسە", icon: "💵" },

  // کەرەستە
  { key: "materials", label: "کەرەستە", group: "کەرەستە", icon: "📦" },
  { key: "materials_cost", label: "کۆستی کەرەستە (مایەی کڕین)", group: "کەرەستە", icon: "📦" },
  { key: "categories", label: "کاتیگۆری", group: "کەرەستە", icon: "📦" },
  { key: "brands", label: "براند", group: "کەرەستە", icon: "📦" },
  { key: "packaging", label: "پێچانەوە", group: "کەرەستە", icon: "📦" },
  { key: "price_types", label: "جۆری نرخ", group: "کەرەستە", icon: "📦" },

  // ڕاپۆرتەکان
  { key: "reports_invoices", label: "ڕاپۆرتی پسووڵە", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_debts", label: "ڕاپۆرتی قەرز", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_expenses", label: "ڕاپۆرتی خەرجی", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_profit", label: "ڕاپۆرتی قازانجی گشتی", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_stock", label: "ڕاپۆرتی کۆگا", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_stock_snapshot", label: "ڕاپۆرتی ئاستی کۆگا", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_items", label: "ڕاپۆرتی کەرەستە", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_material_movements", label: "ڕاپۆرتی جوڵەی کەرەستە", group: "ڕاپۆرتەکان", icon: "📈" },
  { key: "reports_balance", label: "ڕاپۆرتی میزانیە", group: "ڕاپۆرتەکان", icon: "📈" },

  // ڕێکخستن
  { key: "settings", label: "ڕێکخستن", group: "ڕێکخستن", icon: "⚙️" },
  { key: "dashboard", label: "داشبۆرد", group: "سیستەم", icon: "📊" },
  { key: "hr", label: "بەڕێوەبردنی کارمەندان", group: "سیستەم", icon: "👥" },
];

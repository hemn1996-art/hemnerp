import { cookies } from "next/headers";
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


// Simple hash function (no external dependency needed)
// For production, consider using bcrypt
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Make it longer and more unique
  const base = Math.abs(hash).toString(36);
  let hash2 = 5381;
  for (let i = 0; i < str.length; i++) {
    hash2 = ((hash2 << 5) + hash2) + str.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return base + Math.abs(hash2).toString(36);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return simpleHash(plain) === hashed;
}

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

/**
 * Get the current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("user_session");
    if (!sessionCookie?.value) return null;

    const decodedValue = sessionCookie.value.includes("%")
      ? decodeURIComponent(sessionCookie.value)
      : sessionCookie.value;

    const session = JSON.parse(decodedValue);
    if (!session.id) return null;

    // Database lookup to verify if the user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { isActive: true },
    });
    if (!user || !user.isActive) return null;

    return {
      id: session.id,
      username: session.username,
      name: session.name,
      role: session.role,
    };
  } catch {
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
  { key: "vouchers_my_debt", label: "پسووڵەی قەرزی من", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_people_debt", label: "پسووڵەی قەرزی خەڵک", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_debt_discount_mine", label: "داشکاندن لە قەرزی من", group: "پسووڵەکان", icon: "🧾" },
  { key: "vouchers_debt_discount_people", label: "داشکاندن لە قەرزی خەڵک", group: "پسووڵەکان", icon: "🧾" },
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

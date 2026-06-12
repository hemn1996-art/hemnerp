"use client";

import { useState, useEffect, type CSSProperties, use } from "react";
import { useStore } from "../../../store/store";

const FONT = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

// Permission modules grouped
const PERMISSION_GROUPS = [
  {
    name: "پسووڵەکان",
    icon: "🧾",
    modules: [
      { key: "vouchers", label: "پسووڵە (گشتی)" },
      { key: "vouchers_sales", label: "پسووڵەی فرۆشتن" },
      { key: "vouchers_purchase", label: "پسووڵەی کڕین" },
      { key: "vouchers_sales_return", label: "گەڕاندنەوەی فرۆش" },
      { key: "vouchers_purchase_return", label: "گەڕاندنەوەی کڕین" },
      { key: "vouchers_expense", label: "پسووڵەی خەرجی" },
      { key: "vouchers_money_in", label: "پسووڵەی پارەی هاتوو" },
      { key: "vouchers_money_out", label: "پسووڵەی پارەی ڕۆشتوو" },
      { key: "vouchers_my_debt", label: "پسووڵەی قەرزی من" },
      { key: "vouchers_people_debt", label: "پسووڵەی قەرزی خەڵک" },
      { key: "vouchers_debt_discount_mine", label: "داشکاندن لە قەرزی من" },
      { key: "vouchers_debt_discount_people", label: "داشکاندن لە قەرزی خەڵک" },
      { key: "vouchers_material_issue", label: "سەرفی مواد" },
      { key: "vouchers_product_transfer", label: "گواستنەوەی کەرەستە" },
      { key: "vouchers_warehouse_damage", label: "خەسارەی کۆگا" },
      { key: "vouchers_warehouse_stock", label: "جەردی کۆگا" },
      { key: "vouchers_cash_deposit", label: "دانانی پارە" },
      { key: "vouchers_cash_withdrawal", label: "کشانەوەی پارە" },
    ],
  },
  {
    name: "هەژمارەکان",
    icon: "👤",
    modules: [
      { key: "accounts", label: "هەژمار" },
      { key: "account_types", label: "جۆری هەژمار" },
      { key: "account_collection", label: "کۆلێکشن" },
    ],
  },
  {
    name: "قاسە",
    icon: "💵",
    modules: [
      { key: "cashboxes", label: "قاسە" },
      { key: "currency_exchange", label: "گۆڕینەوەی دراو" },
      { key: "currency_transfer", label: "گواستنەوەی دراو" },
    ],
  },
  {
    name: "کەرەستە",
    icon: "📦",
    modules: [
      { key: "materials", label: "کەرەستە" },
      { key: "materials_cost", label: "کۆستی کەرەستە (مایەی کڕین)" },
      { key: "categories", label: "کاتیگۆری" },
      { key: "brands", label: "براند" },
      { key: "packaging", label: "پێچانەوە" },
      { key: "price_types", label: "جۆری نرخ" },
    ],
  },
  {
    name: "ڕاپۆرتەکان",
    icon: "📈",
    modules: [
      { key: "reports_invoices", label: "ڕاپۆرتی پسووڵە" },
      { key: "reports_debts", label: "ڕاپۆرتی قەرز" },
      { key: "reports_profit", label: "ڕاپۆرتی قازانجی گشتی" },
      { key: "reports_stock", label: "ڕاپۆرتی کۆگا" },
      { key: "reports_stock_snapshot", label: "ڕاپۆرتی ئاستی کۆگا" },
      { key: "reports_items", label: "ڕاپۆرتی کەرەستە" },
      { key: "reports_material_movements", label: "ڕاپۆرتی جوڵەی کەرەستە" },
      { key: "reports_balance", label: "ڕاپۆرتی میزانیە" },
    ],
  },
  {
    name: "ڕێکخستن و سیستەم",
    icon: "⚙️",
    modules: [
      { key: "dashboard", label: "داشبۆرد" },
      { key: "settings", label: "ڕێکخستن" },
      { key: "hr", label: "بەڕێوەبردنی کارمەندان" },
    ],
  },
];

interface PermMap {
  [module: string]: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
}

export default function PermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const [permissions, setPermissions] = useState<PermMap>({});
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(PERMISSION_GROUPS.map((g) => g.name));
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch user info
        const usersRes = await fetch(`/api/users?_t=${Date.now()}`);
        if (usersRes.ok) {
          const users = await usersRes.json();
          const user = users.find((u: any) => u.id === userId);
          if (user) setUserName(user.name);
        }

        // Fetch existing permissions
        const permRes = await fetch(`/api/users/${userId}/permissions?_t=${Date.now()}`);
        if (permRes.ok) {
          const data = await permRes.json();
          const map: PermMap = {};
          data.forEach((p: any) => {
            map[p.module] = {
              canView: p.canView,
              canCreate: p.canCreate,
              canUpdate: p.canUpdate,
              canDelete: p.canDelete,
            };
          });
          setPermissions(map);
        }
      } catch (err) {
        console.error("Failed to load permissions", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const togglePerm = (module: string, action: keyof PermMap[string]) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        canView: prev[module]?.canView ?? false,
        canCreate: prev[module]?.canCreate ?? false,
        canUpdate: prev[module]?.canUpdate ?? false,
        canDelete: prev[module]?.canDelete ?? false,
        [action]: !(prev[module]?.[action] ?? false),
      },
    }));
    setSaved(false);
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName) ? prev.filter((g) => g !== groupName) : [...prev, groupName]
    );
  };

  const toggleAllInGroup = (modules: { key: string }[], enable: boolean) => {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      modules.forEach((m) => {
        const isReport = m.key.startsWith("reports_");
        newPerms[m.key] = {
          canView: enable,
          canCreate: isReport ? false : enable,
          canUpdate: isReport ? false : enable,
          canDelete: isReport ? false : enable,
        };
      });
      return newPerms;
    });
    setSaved(false);
  };

  const getPermCount = (module: string) => {
    const p = permissions[module];
    if (!p) return 0;
    return [p.canView, p.canCreate, p.canUpdate, p.canDelete].filter(Boolean).length;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert permissions map to array
      const permArray = Object.entries(permissions)
        .filter(([, v]) => v.canView || v.canCreate || v.canUpdate || v.canDelete)
        .map(([moduleKey, v]) => {
          const isReport = moduleKey.startsWith("reports_");
          return {
            module: moduleKey,
            canView: v.canView,
            canCreate: isReport ? false : v.canCreate,
            canUpdate: isReport ? false : v.canUpdate,
            canDelete: isReport ? false : v.canDelete,
          };
        });

      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permArray }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save permissions", err);
    } finally {
      setSaving(false);
    }
  };

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: FONT, direction: "rtl" }}>
        <h2 style={{ color: "#ef4444" }}>⛔ ڕێگەپێدراو نییت</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: FONT, direction: "rtl" }}>
        بارکردن...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", fontFamily: FONT, direction: "rtl", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <button
            onClick={() => window.location.href = "/employees"}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#3b82f6", fontWeight: 700, fontFamily: FONT, marginBottom: 8, display: "block" }}
          >
            ← گەڕانەوە بۆ کارمەندەکان
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>
            🔑 دەسەڵاتەکانی {userName}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            دیاریکردنی دەسەڵاتەکانی ئەم کارمەندە بۆ هەر بەشێکی سیستەم
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && (
            <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 14 }}>✅ خەزنکرا</span>
          )}
          <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
            {saving ? "خەزنکردن..." : "💾 خەزنکردن"}
          </button>
        </div>
      </div>

      {/* Permission Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {PERMISSION_GROUPS.map((group) => {
          const isOpen = openGroups.includes(group.name);
          const totalPerms = group.modules.reduce((sum, m) => sum + getPermCount(m.key), 0);
          const maxPerms = group.modules.reduce((sum, m) => sum + (m.key.startsWith("reports_") ? 1 : 4), 0);

          return (
            <div key={group.name} style={{
              background: "white", borderRadius: 16, overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0",
            }}>
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(group.name)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 20px", cursor: "pointer",
                  background: isOpen ? "#f8fafc" : "white",
                  borderBottom: isOpen ? "2px solid #3b82f6" : "none",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{group.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#1e293b" }}>{group.name}</span>
                  <span style={{
                    background: totalPerms === maxPerms ? "#dcfce7" : totalPerms > 0 ? "#dbeafe" : "#f1f5f9",
                    color: totalPerms === maxPerms ? "#16a34a" : totalPerms > 0 ? "#1d4ed8" : "#94a3b8",
                    padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  }}>
                    {totalPerms}/{maxPerms}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInGroup(group.modules, true); }}
                    style={{ ...smallBtnStyle, background: "#dcfce7", color: "#16a34a" }}
                  >
                    هەموو ✓
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInGroup(group.modules, false); }}
                    style={{ ...smallBtnStyle, background: "#fee2e2", color: "#dc2626" }}
                  >
                    هیچ ✗
                  </button>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Module Rows */}
              {isOpen && (
                <div>
                  {/* Column Headers */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px",
                    padding: "8px 20px", background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>مۆدیوڵ</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textAlign: "center" }}>بینین</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textAlign: "center" }}>دروستکردن</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textAlign: "center" }}>نوێکردنەوە</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textAlign: "center" }}>سڕینەوە</span>
                  </div>

                  {group.modules.map((module, i) => (
                    <div
                      key={module.key}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px",
                        padding: "10px 20px", alignItems: "center",
                        borderBottom: i < group.modules.length - 1 ? "1px solid #f1f5f9" : "none",
                        background: i % 2 === 0 ? "white" : "#fafbfc",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}>
                        {module.label}
                        <span style={{
                          background: getPermCount(module.key) === (module.key.startsWith("reports_") ? 1 : 4) ? "#dcfce7" : getPermCount(module.key) > 0 ? "#e0f2fe" : "#f1f5f9",
                          color: getPermCount(module.key) === (module.key.startsWith("reports_") ? 1 : 4) ? "#16a34a" : getPermCount(module.key) > 0 ? "#0284c7" : "#94a3b8",
                          padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                        }}>
                          {getPermCount(module.key)}/{module.key.startsWith("reports_") ? 1 : 4}
                        </span>
                      </span>
                      {(["canView", "canCreate", "canUpdate", "canDelete"] as const).map((action) => {
                        const isReport = module.key.startsWith("reports_");
                        const isReadOnlyAction = action !== "canView";

                        if (isReport && isReadOnlyAction) {
                          return (
                            <div key={action} style={{ textAlign: "center", color: "#cbd5e1", fontSize: 16 }}>
                              -
                            </div>
                          );
                        }

                        return (
                          <div key={action} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={permissions[module.key]?.[action] ?? false}
                              onChange={() => togglePerm(module.key, action)}
                              style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#3b82f6" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Save Bar */}
      <div style={{
        position: "sticky", bottom: 0, background: "white",
        padding: "16px 0", display: "flex", justifyContent: "flex-start", gap: 12,
        borderTop: "1px solid #e2e8f0", marginTop: 24,
      }}>
        <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
          {saving ? "خەزنکردن..." : "💾 خەزنکردن"}
        </button>
        <button onClick={() => window.location.href = "/employees"} style={cancelBtnStyle}>
          پاشگەزبوونەوە
        </button>
      </div>
    </div>
  );
}

const saveBtnStyle: CSSProperties = {
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 28px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
  boxShadow: "0 2px 8px rgba(22,163,74,0.25)",
};

const cancelBtnStyle: CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
};

const smallBtnStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "4px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
};

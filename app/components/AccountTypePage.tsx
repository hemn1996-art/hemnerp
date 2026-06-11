"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store/store";
import AlertModal from "./AlertModal";

type AccountTypeRow = {
  id: number;
  name: string;
  isActive: boolean;
  showInPurchase?: boolean;
  showInSales?: boolean;
  isBuiltIn?: boolean;
};

type AccountRow = {
  id: number;
  accountTypeId?: number;
};

const defaultTypes: AccountTypeRow[] = [
  {
    id: 1,
    name: "کڕیار",
    isActive: true,
    showInPurchase: false,
    showInSales: true,
    isBuiltIn: true,
  },
  {
    id: 2,
    name: "دابینکەر",
    isActive: true,
    showInPurchase: true,
    showInSales: false,
    isBuiltIn: true,
  },
];

function normalizeTypes(input: any): AccountTypeRow[] {
  const list = Array.isArray(input) ? input : [];
  const cleaned: AccountTypeRow[] = list.map((item: any, index: number) => ({
    id: Number(item?.id ?? index + 1),
    name: String(item?.name ?? "").trim(),
    isActive: item?.isActive !== false,
    showInPurchase: !!(item?.showInPurchase ?? item?.showsInPurch),
    showInSales: !!(item?.showInSales ?? item?.showsInSales),
    isBuiltIn: !!item?.isBuiltIn,
  }));

  const hasCustomer = cleaned.some((x: any) => x.name === "کڕیار" || x.name === "کریار");
  const hasSupplier = cleaned.some((x: any) => x.name === "دابینکەر");

  let next = [...cleaned];

  if (!hasCustomer) {
    next.unshift({
      id: next.length ? Math.max(...next.map((x: any) => x.id)) + 1 : 1,
      name: "کڕیار",
      isActive: true,
      showInPurchase: false,
      showInSales: true,
      isBuiltIn: true,
    });
  }

  if (!hasSupplier) {
    next.push({
      id: next.length ? Math.max(...next.map((x: any) => x.id)) + 1 : 2,
      name: "دابینکەر",
      isActive: true,
      showInPurchase: true,
      showInSales: false,
      isBuiltIn: true,
    });
  }

  // دووبارە لابردنی ناوی بەتاڵ
  next = next.filter((x: any) => x.name);

  // ڕیزکردن بە id
  next.sort((a, b) => a.id - b.id);

  return next;
}

export default function AccountTypePage() {
  const accountTypesStore = useStore((s: any) => s.accountTypes);
  const fetchAccountTypes = useStore((s: any) => s.fetchAccountTypes);
  const accounts = (useStore((s: any) => s.accounts) ?? []) as AccountRow[];
  const fetchAccounts = useStore((s: any) => s.fetchAccounts);

  const addAccountType = useStore((s: any) => s.addAccountType);
  const updateAccountType = useStore((s: any) => s.updateAccountType);
  const deleteAccountType = useStore((s: any) => s.deleteAccountType);

  const [accountTypes, setAccountTypes] = useState<AccountTypeRow[]>([]);
  const [search, setSearch] = useState("");

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "error" | "warning" | "success" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "warning", title: "", message: "" });

  const showAlert = (
    type: "error" | "warning" | "success" | "confirm",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => setAlertConfig({ isOpen: true, type, title, message, onConfirm });

  const closeAlert = () => setAlertConfig((a: any) => ({ ...a, isOpen: false }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    isActive: true,
    showInPurchase: false,
    showInSales: false,
  });

  useEffect(() => {
    fetchAccountTypes();
    fetchAccounts();
  }, []);

  useEffect(() => {
    setAccountTypes(normalizeTypes(accountTypesStore));
  }, [accountTypesStore]);

  const usageMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const type of accountTypes) {
      const usedCount = accounts.filter(
        (acc: any) => Number(acc.accountTypeId) === Number(type.id)
      ).length;
      map.set(type.id, usedCount);
    }
    return map;
  }, [accountTypes, accounts]);

  const filteredTypes = useMemo(() => {
    const q = search.trim();
    if (!q) return accountTypes;
    return accountTypes.filter((item: any) => item.name.includes(q));
  }, [accountTypes, search]);

  /* کڕیار و دابینکەر سیستەمی بوون — ناتوانرێت بسڕدرێنەوە */
  function isProtected(item: AccountTypeRow) {
    if (item.isBuiltIn) return false; // Let the API decide based on name
    const n = item.name.trim();
    return n === "کڕیار" || n === "دابینکەر" || n === "کریار" || n === "کڕیار و دابینکەر";
  }

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      isActive: true,
      showInPurchase: false,
      showInSales: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: AccountTypeRow) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      isActive: item.isActive,
      showInPurchase: !!item.showInPurchase,
      showInSales: !!item.showInSales,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();

    if (!name) {
      showAlert("warning", "ئاگاداری", "تکایە ناوی جۆری هەژمار بنوسە.");
      return;
    }

    const duplicated = accountTypes.some(
      (item: any) =>
        item.id !== editingId &&
        item.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicated) {
      showAlert("warning", "ئاگاداری", "ئەم ناوە پێشتر هەیە.");
      return;
    }

    if (editingId !== null) {
      const success = await updateAccountType({
        id: editingId,
        name,
        isActive: form.isActive,
        showInPurchase: form.showInPurchase,
        showInSales: form.showInSales,
      });
      if (!success) {
        showAlert("error", "هەڵە", "کێشەیەک ڕوویدا لە کاتی نوێکردنەوەی جۆری هەژمار.");
        return;
      }
    } else {
      const success = await addAccountType({
        name,
        isActive: form.isActive,
        showInPurchase: form.showInPurchase,
        showInSales: form.showInSales,
      });
      if (!success) {
        showAlert("error", "هەڵە", "کێشەیەک ڕوویدا لە کاتی زیادکردنی جۆری هەژمار.");
        return;
      }
    }

    closeModal();
  };

  const handleDelete = (item: AccountTypeRow) => {
    if (isProtected(item)) {
      showAlert("error", "شیاوی سڕینەوە نییە", "ئەم جۆرە سیستەمییە و ناتوانرێت بسڕدرێتەوە.");
      return;
    }

    const usedCount = usageMap.get(item.id) || 0;

    if (usedCount > 0) {
      showAlert("error", "شیاوی سڕینەوە نییە", "ئەم جۆرە هەژمارە بەکارهاتووە و ناتوانرێت بسڕدرێتەوە.");
      return;
    }

    showAlert(
      "confirm",
      "دڵنیایت لە سڕینەوە؟",
      `دڵنیایت لە سڕینەوەی "${item.name}" ؟`,
      async () => {
        closeAlert();
        const success = await deleteAccountType(item.id);
        if (!success) {
          showAlert("error", "هەڵە", "سڕینەوەی جۆری هەژمار سەرکەوتوو نەبوو.");
        }
      }
    );
  };

  return (
    <div style={pageWrap}>
      <div style={topBar}>
        <button style={primaryBtn} onClick={openAddModal}>
          زیادکردن
        </button>

        <input
          style={searchInput}
          placeholder="گەڕان"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={card}>
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>ناو</th>
                <th style={th}>بەکارهاتوو</th>
                <th style={th}>لە کڕین دەرکەوێت</th>
                <th style={th}>لە فرۆشتن دەرکەوێت</th>
                <th style={th}>دۆخ</th>
                <th style={th}>چالاکی</th>
              </tr>
            </thead>

            <tbody>
              {filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={emptyTd}>
                    هیچ جۆرێکی هەژمار نەدۆزرایەوە.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((item: any) => {
                  const usedCount = usageMap.get(item.id) || 0;
                  return (
                    <tr key={item.id}>
                      <td style={tdBold}>{item.name}</td>

                      <td style={td}>
                        <span
                          style={{
                            ...badge,
                            background: usedCount > 0 ? "#fef3c7" : "#eef2f7",
                            color: usedCount > 0 ? "#92400e" : "#475569",
                          }}
                        >
                          {usedCount > 0 ? `${usedCount} بەکارهاتوو` : "بەکارهێنراو نیە"}
                        </span>
                      </td>

                      <td style={td}>
                        <span
                          style={{
                            ...smallTag,
                            background: item.showInPurchase ? "#dcfce7" : "#f1f5f9",
                            color: item.showInPurchase ? "#166534" : "#64748b",
                          }}
                        >
                          {item.showInPurchase ? "بەڵێ" : "نەخێر"}
                        </span>
                      </td>

                      <td style={td}>
                        <span
                          style={{
                            ...smallTag,
                            background: item.showInSales ? "#dcfce7" : "#f1f5f9",
                            color: item.showInSales ? "#166534" : "#64748b",
                          }}
                        >
                          {item.showInSales ? "بەڵێ" : "نەخێر"}
                        </span>
                      </td>

                      <td style={td}>
                        <span
                          style={{
                            ...badge,
                            background: item.isActive ? "#dcfce7" : "#fee2e2",
                            color: item.isActive ? "#166534" : "#b91c1c",
                          }}
                        >
                          {item.isActive ? "چالاک" : "ناچالاک"}
                        </span>
                      </td>

                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <button
                            style={editBtn}
                            onClick={() => openEditModal(item)}
                          >
                            گۆڕانکاری
                          </button>

                          {/* سڕینەوە تەنھا ئەگەر نەسیستەمیبێت و بەکارنەهاتووە */}
                          {!isProtected(item) && usedCount === 0 ? (
                            <button
                              style={deleteBtn}
                              onClick={() => handleDelete(item)}
                              title="سڕینەوە"
                            >
                              ×
                            </button>
                          ) : (
                            <span style={{ display: "inline-block", width: 28 }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalHeader}>
              <h3 style={{ margin: 0, fontSize: 20 }}>
                {editingId !== null ? "گۆڕانکاری جۆری هەژمار" : "زیادکردنی جۆری هەژمار"}
              </h3>

              <button style={closeBtn} onClick={closeModal}>
                ×
              </button>
            </div>

            <div style={formGrid}>
              <div style={fieldWrap}>
                <label style={label}>ناو</label>
                <input
                  style={input}
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="ناوی جۆری هەژمار"
                />
              </div>

              <div style={checkWrap}>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.showInPurchase}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        showInPurchase: e.target.checked,
                      }))
                    }
                  />
                  <span>ئەم جۆرە هەژمارە لە پسوڵەی کڕین دەرکەوێت</span>
                </label>
              </div>

              <div style={checkWrap}>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.showInSales}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        showInSales: e.target.checked,
                      }))
                    }
                  />
                  <span>ئەم جۆرە هەژمارە لە پسوڵەی فرۆشتن دەرکەوێت</span>
                </label>
              </div>

              <div style={checkWrap}>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  <span>چالاک</span>
                </label>
              </div>
            </div>

            <div style={modalFooter}>
              <button style={secondaryBtn} onClick={closeModal}>
                پاشگەزبوونەوە
              </button>
              <button style={primaryBtn} onClick={handleSave}>
                خەزنکردن
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

/* styles */
const pageWrap: React.CSSProperties = {
  width: "100%",
  padding: 16,
  boxSizing: "border-box",
};

const topBar: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  marginBottom: 16,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  overflow: "hidden",
};

const tableWrap: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 900,
};

const th: React.CSSProperties = {
  background: "#0f172a",
  color: "#fff",
  padding: "12px 10px",
  fontWeight: 700,
  fontSize: 14,
  textAlign: "center",
  border: "1px solid #e5e7eb",
};

const td: React.CSSProperties = {
  padding: "12px 10px",
  border: "1px solid #e5e7eb",
  textAlign: "center",
  fontSize: 14,
  color: "#0f172a",
};

const tdBold: React.CSSProperties = {
  ...td,
  fontWeight: 700,
};

const emptyTd: React.CSSProperties = {
  padding: 22,
  textAlign: "center",
  color: "#64748b",
  border: "1px solid #e5e7eb",
};

const badge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const smallTag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 48,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const actionsWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
};

const primaryBtn: React.CSSProperties = {
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#1e293b",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const editBtn: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  fontSize: 20,
  lineHeight: "20px",
  fontWeight: 700,
};

const searchInput: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  fontSize: 14,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
  padding: 16,
};

const modalBox: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  background: "#fff",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 18px",
  borderBottom: "1px solid #e5e7eb",
};

const closeBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "none",
  background: "#f1f5f9",
  color: "#0f172a",
  fontSize: 22,
  cursor: "pointer",
};

const formGrid: React.CSSProperties = {
  padding: 18,
  display: "grid",
  gap: 14,
};

const fieldWrap: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const label: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#334155",
};

const input: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
};

const checkWrap: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "12px 14px",
  background: "#fafafa",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  fontSize: 14,
  color: "#0f172a",
  fontWeight: 600,
};

const modalFooter: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  padding: "16px 18px",
  borderTop: "1px solid #e5e7eb",
};
"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useStore } from "../store/store";
import AlertModal from "./AlertModal";

/* ── Types ── */
export type AttributeItem = {
  id: number;
  name: string;
  isActive: boolean;
};

export type AttributeType = "category" | "brand" | "packaging" | "priceType";

const STORAGE_KEY: Record<AttributeType, string> = {
  category:  "__erp_categories",
  brand:     "__erp_brands",
  packaging: "__erp_packaging",
  priceType: "__erp_price_types",
};

const LABELS: Record<AttributeType, { singular: string; plural: string }> = {
  category:  { singular: "کاتێگۆری", plural: "کاتێگۆرییەکان" },
  brand:     { singular: "براند",    plural: "براندەکان" },
  packaging: { singular: "پێچانەوە", plural: "پێچانەوەکان" },
  priceType: { singular: "جۆری نرخ", plural: "جۆرەکانی نرخ" },
};

function loadItems(type: AttributeType): AttributeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY[type]);
    if (raw) return JSON.parse(raw) as AttributeItem[];
  } catch {}
  
  // Defaults
  if (type === "category") return [{ id: 1, name: "گشتی", isActive: true }];
  if (type === "brand") return [{ id: 1, name: "بێ براند", isActive: true }];
  if (type === "packaging") return [{ id: 1, name: "دانە", isActive: true }, { id: 2, name: "کارتۆن", isActive: true }];
  if (type === "priceType") return [{ id: 1, name: "تاک", isActive: true }, { id: 2, name: "کۆ", isActive: true }];
  
  return [];
}

function saveItems(type: AttributeType, items: AttributeItem[]) {
  try { localStorage.setItem(STORAGE_KEY[type], JSON.stringify(items)); } catch {}
}

/* ── Main Component ── */
export default function ProductAttributePage({ type }: { type: AttributeType }) {
  const labels = LABELS[type];

  const [items,    setItems]    = useState<AttributeItem[]>(() => loadItems(type));
  const [search,   setSearch]   = useState("");
  const [showModal,setShowModal]= useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", isActive: true });
  const [toast, setToast] = useState("");

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

  /* ── Check usage (optional) ── */
  const products = useStore((s) => (s as any).products ?? []) as any[];
  const usedNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (type === "category"  && p.category)  set.add(String(p.category).trim());
      if (type === "brand"     && p.brand)     set.add(String(p.brand).trim());
      if (type === "packaging" && p.packaging) set.add(String(p.packaging).trim());
      // priceType usage is usually inside pricing arrays, skipping deep check for now
    }
    return set;
  }, [products, type]);

  function isUsed(item: AttributeItem) {
    return usedNames.has(item.name.trim());
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function sync(next: AttributeItem[]) {
    setItems(next);
    saveItems(type, next);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function openAdd() {
    setEditId(null);
    setForm({ name: "", isActive: true });
    setShowModal(true);
  }

  function openEdit(item: AttributeItem) {
    setEditId(item.id);
    setForm({ name: item.name, isActive: item.isActive });
    setShowModal(true);
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) { showToast("تکایە ناو بنووسە."); return; }

    const dup = items.find(i => i.id !== editId && i.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) { showToast("ئەم ناوە پێشتر هەیە."); return; }

    if (editId !== null) {
      const next = items.map(i => i.id === editId ? { ...i, name, isActive: form.isActive } : i);
      sync(next);
      showToast("نوێکرایەوە ✅");
    } else {
      const newId = items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
      sync([...items, { id: newId, name, isActive: form.isActive }]);
      showToast("زیادکرا ✅");
    }
    setShowModal(false);
  }

  function handleDelete(item: AttributeItem) {
    showAlert(
      "confirm",
      "دڵنیایت لە سڕینەوە؟",
      `دڵنیایت لە سڕینەوەی "${item.name}"؟`,
      () => {
        closeAlert();
        sync(items.filter(i => i.id !== item.id));
        showToast("سڕایەوە ✅");
      }
    );
  }

  return (
    <div style={page}>
      {/* Toast */}
      {toast && (
        <div style={toastBar}>
          <span>{toast}</span>
          <button style={toastClose} onClick={() => setToast("")}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
            title="گەورەکردنی سایدبار"
          >
            ☰
          </button>
          <div>
            <h1 style={title}>{labels.plural}</h1>
            <p style={subtitle}>بەڕێوەبردنی {labels.plural}</p>
          </div>
        </div>
        <button style={primaryBtn} onClick={openAdd}>زیادکردن</button>
      </div>

      {/* Search + count */}
      <div style={toolbar}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`گەڕان بە ناوی ${labels.singular}...`}
          style={searchInput}
        />
        <div style={countBadge}>کۆی: {filtered.length}</div>
      </div>

      {/* Table */}
      <div style={tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>ناو</th>
                <th style={th}>دۆخ</th>
                <th style={th}>چالاکی</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={emptyCell}>هیچ دانەیەک نەدۆزرایەوە.</td></tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={tdCenter}>{idx + 1}</td>
                    <td style={{ ...tdCenter, fontWeight: 700 }}>{item.name}</td>
                    <td style={tdCenter}>
                      <span style={item.isActive !== false ? activeBadge : inactiveBadge}>
                        {item.isActive !== false ? "چالاک" : "ناچالاک"}
                      </span>
                    </td>
                    <td style={tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button style={editBtn} onClick={() => openEdit(item)}>گۆڕانکاری</button>
                        {!isUsed(item) && (
                          <button style={deleteBtn} onClick={() => handleDelete(item)} title="سڕینەوە">×</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {editId ? `گۆڕانکاری ${labels.singular}` : `زیادکردنی ${labels.singular}`}
              </h2>
              <button style={closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            <div style={{ padding: 18, display: "grid", gap: 14 }}>
              <div>
                <label style={fieldLabel}>ناوی {labels.singular}</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                  placeholder={`ناوی ${labels.singular}`}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                />
                <span style={{ fontWeight: 700 }}>چالاک</span>
              </label>
            </div>

            <div style={modalFooter}>
              <button style={secondaryBtn} onClick={() => setShowModal(false)}>پاشگەزبوونەوە</button>
              <button style={primaryBtn} onClick={handleSave}>خەزنکردن</button>
            </div>
          </div>
        </div>
      )}
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

/* ── Styles ── */
const font = '"Speda","Segoe UI",Tahoma,Arial,sans-serif';
const page: CSSProperties    = { direction: "rtl", fontFamily: font, padding: 16, color: "#111827" };
const header: CSSProperties  = { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, marginBottom: 14 };
const title: CSSProperties   = { margin: 0, fontSize: 24, fontWeight: 900 };
const subtitle: CSSProperties= { margin: "4px 0 0", color: "#6b7280", fontSize: 13 };
const toolbar: CSSProperties = { display: "flex", gap: 10, alignItems: "center", marginBottom: 12 };
const searchInput: CSSProperties = { flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, fontFamily: font, outline: "none" };
const countBadge: CSSProperties  = { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999, padding: "6px 14px", fontWeight: 700, fontSize: 13 };
const tableCard: CSSProperties   = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" };
const table: CSSProperties       = { width: "100%", borderCollapse: "collapse", minWidth: 500 };
const th: CSSProperties          = { background: "#0f172a", color: "#fff", padding: "11px 10px", fontWeight: 700, fontSize: 13, textAlign: "center", border: "1px solid #1e293b" };
const tdCenter: CSSProperties    = { padding: "10px 8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: 13 };
const emptyCell: CSSProperties   = { padding: 24, textAlign: "center", color: "#64748b" };
const activeBadge: CSSProperties   = { display: "inline-block", padding: "3px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 12 };
const inactiveBadge: CSSProperties = { display: "inline-block", padding: "3px 10px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 12 };
const primaryBtn: CSSProperties  = { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontFamily: font };
const secondaryBtn: CSSProperties= { background: "#fff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontFamily: font };
const editBtn: CSSProperties    = { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12 };
const deleteBtn: CSSProperties  = { width: 28, height: 28, borderRadius: "50%", border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 18, lineHeight: "20px", fontWeight: 700, cursor: "pointer" };
const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 };
const modalBox: CSSProperties     = { width: "100%", maxWidth: 480, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.18)" };
const modalHeader: CSSProperties  = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e5e7eb" };
const modalFooter: CSSProperties  = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 18px", borderTop: "1px solid #e5e7eb" };
const closeBtn: CSSProperties     = { width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f1f5f9", color: "#0f172a", fontSize: 20, cursor: "pointer" };
const fieldLabel: CSSProperties   = { display: "block", fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 6 };
const inputStyle: CSSProperties   = { width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box" };
const toastBar: CSSProperties     = { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "#fff", borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 12, zIndex: 9999, fontFamily: font, fontWeight: 700 };
const toastClose: CSSProperties   = { background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" };

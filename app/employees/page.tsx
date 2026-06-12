"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useStore } from "../store/store";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  phone?: string | null;
  canSeeOthersData?: boolean;
  allowedWarehouses?: string | null;
  allowedCashboxes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const FONT = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "employee",
    isActive: true,
    phone: "",
    canSeeOthersData: true,
    allowedWarehouses: [] as number[],
    allowedCashboxes: [] as number[],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const currentUser = useStore((s) => s.currentUser);
  
  const warehouses = useStore((s) => s.warehouses);
  const fetchWarehouses = useStore((s) => s.fetchWarehouses);
  const cashboxes = useStore((s) => s.cashboxes);
  const fetchCashboxes = useStore((s) => s.fetchCashboxes);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/users?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
    fetchCashboxes();
  }, []);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      if (editUser) {
        // Update
        const body: any = {
          id: editUser.id,
          name: form.name,
          role: form.role,
          isActive: form.isActive,
          phone: form.phone || "",
          canSeeOthersData: form.canSeeOthersData,
          allowedWarehouses: form.allowedWarehouses.join(","),
          allowedCashboxes: form.allowedCashboxes.join(","),
        };
        if (form.username !== editUser.username) body.username = form.username;
        if (form.password) body.password = form.password;
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "هەڵە"); setSaving(false); return; }
      } else {
        // Create
        if (!form.username || !form.password || !form.name) {
          setError("هەموو خانەکان پڕ بکەرەوە");
          setSaving(false);
          return;
        }
        const body = {
          username: form.username,
          password: form.password,
          name: form.name,
          role: form.role,
          isActive: form.isActive,
          phone: form.phone || "",
          canSeeOthersData: form.canSeeOthersData,
          allowedWarehouses: form.allowedWarehouses.join(","),
          allowedCashboxes: form.allowedCashboxes.join(","),
        };
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "هەڵە"); setSaving(false); return; }
      }
      setShowModal(false);
      setEditUser(null);
      setForm({
        username: "",
        password: "",
        name: "",
        role: "employee",
        isActive: true,
        phone: "",
        canSeeOthersData: true,
        allowedWarehouses: [],
        allowedCashboxes: [],
      });
      fetchUsers();
    } catch {
      setError("کێشەیەک ڕوویدا");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("دڵنیایت لە سڕینەوەی ئەم کارمەندە؟")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const toggleUserActive = async (user: User) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "کێشەیەک ڕوویدا");
      }
    } catch (err) {
      console.error("Failed to toggle user status", err);
      alert("کێشەیەک ڕوویدا");
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      username: user.username,
      password: "",
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone || "",
      canSeeOthersData: user.canSeeOthersData !== undefined ? !!user.canSeeOthersData : true,
      allowedWarehouses: user.allowedWarehouses ? user.allowedWarehouses.split(",").filter(Boolean).map(Number) : [],
      allowedCashboxes: user.allowedCashboxes ? user.allowedCashboxes.split(",").filter(Boolean).map(Number) : [],
    });
    setError("");
    setShowModal(true);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({
      username: "",
      password: "",
      name: "",
      role: "employee",
      isActive: true,
      phone: "",
      canSeeOthersData: true,
      allowedWarehouses: [],
      allowedCashboxes: [],
    });
    setError("");
    setShowModal(true);
  };

  if (currentUser && currentUser.role !== "admin") {
    return <EmployeeProfileForm currentUser={currentUser} />;
  }

  return (
    <div style={{ padding: "24px 32px", fontFamily: FONT, direction: "rtl", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>
            👥 بەڕێوەبردنی کارمەندان
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            زیادکردن و بەڕێوەبردنی کارمەندان و دەسەڵاتەکانیان
          </p>
        </div>
        <button onClick={openCreate} style={addBtnStyle}>
          + زیادکردنی کارمەند
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: "white", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0d1e3d", color: "white" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>ناوی بەکارهێنەر</th>
              <th style={thStyle}>یوزەرنەیم</th>
              <th style={thStyle}>ڕۆڵ</th>
              <th style={thStyle}>چالاکی</th>
              <th style={thStyle}>بەرواری دروستکردن</th>
              <th style={thStyle}>کردارەکان</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>بارکردن...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>هیچ کارمەندێک نییە</td></tr>
            ) : (
              users.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{user.name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: "#f1f5f9", padding: "3px 10px", borderRadius: 8,
                      fontSize: 13, fontFamily: "monospace", color: "#334155",
                    }}>
                      {user.username}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      background: user.role === "admin" ? "#dbeafe" : "#f0fdf4",
                      color: user.role === "admin" ? "#1d4ed8" : "#16a34a",
                      padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    }}>
                      {user.role === "admin" ? "بەڕێوبەر" : "کارمەند"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {user.role === "admin" ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#dcfce7",
                        color: "#16a34a",
                        padding: "6px 14px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 700,
                      }}>
                        <span style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                          background: "#22c55e",
                        }} />
                        چالاک
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleUserActive(user)}
                        style={{
                          background: user.isActive ? "#dcfce7" : "#fee2e2",
                          color: user.isActive ? "#16a34a" : "#dc2626",
                          border: "none",
                          borderRadius: 12,
                          padding: "6px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.2s",
                          fontFamily: FONT,
                        }}
                        title={user.isActive ? "کلیک بکە بۆ ناچالاککردن" : "کلیک بکە بۆ چالاککردن"}
                      >
                        <span style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                          background: user.isActive ? "#22c55e" : "#ef4444",
                        }} />
                        {user.isActive ? "چالاک" : "ناچالاک"}
                      </button>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>
                    {new Date(user.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                      <button onClick={() => openEdit(user)} style={actionBtnStyle} title="نوێکردنەوە">✏️</button>
                      <button
                        onClick={() => window.location.href = `/employees/${user.id}/permissions`}
                        style={{ ...actionBtnStyle, background: "#dbeafe", color: "#1d4ed8" }}
                        title="دەسەڵاتەکان"
                      >🔑</button>
                      {user.role !== "admin" && (
                        <button onClick={() => handleDelete(user.id)} style={{ ...actionBtnStyle, background: "#fee2e2", color: "#dc2626" }} title="سڕینەوە">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", fontSize: 13, color: "#64748b", textAlign: "left" }}>
          کۆی گشتی: {users.length}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 900, color: "#1e293b" }}>
              {editUser ? `نوێکردنەوەی ${editUser.name}` : "زیادکردنی کارمەندی نوێ"}
            </h3>

            {error && <div style={errorStyle}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>ناو</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  placeholder="ناوی کارمەند"
                />
              </div>
              <div>
                <label style={labelStyle}>یوزەرنەیم</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  style={inputStyle}
                  placeholder="username"
                  dir="ltr"
                />
              </div>
              <div>
                <label style={labelStyle}>{editUser ? "پاسۆردی نوێ (بەتاڵ = بەبێ گۆڕان)" : "پاسۆرد"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={inputStyle}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              <div>
                <label style={labelStyle}>ڕۆڵ</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={inputStyle}
                >
                  <option value="employee">کارمەند</option>
                  <option value="admin">بەڕێوبەر</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>ژمارەی مۆبایل</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={inputStyle}
                  placeholder="0770XXXXXXX"
                  dir="ltr"
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={form.canSeeOthersData}
                  onChange={(e) => setForm({ ...form, canSeeOthersData: e.target.checked })}
                  id="canSeeOthersDataCheck"
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label htmlFor="canSeeOthersDataCheck" style={{ fontSize: 14, fontWeight: 700, cursor: "pointer" }}>بینینی داتای کارمەندانی تر</label>
              </div>
              <div>
                <label style={labelStyle}>کۆگاکانی ڕێگەپێدراو (ئەگەر بەتاڵ بێت هیچ کۆگایەک نابینێت)</label>
                <div style={{
                  maxHeight: 120, overflowY: "auto", border: "1px solid #d1d5db",
                  borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8
                }}>
                  {warehouses.map((w: any) => {
                    const checked = form.allowedWarehouses.includes(w.id);
                    return (
                      <label key={w.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newWh = e.target.checked
                              ? [...form.allowedWarehouses, w.id]
                              : form.allowedWarehouses.filter((id) => id !== w.id);
                            setForm({ ...form, allowedWarehouses: newWh });
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        {w.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>قاسەکانی ڕێگەپێدراو (ئەگەر بەتاڵ بێت هیچ قاسەیەک نابینێت)</label>
                <div style={{
                  maxHeight: 120, overflowY: "auto", border: "1px solid #d1d5db",
                  borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8
                }}>
                  {cashboxes.map((c: any) => {
                    const checked = form.allowedCashboxes.includes(c.id);
                    return (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newCb = e.target.checked
                              ? [...form.allowedCashboxes, c.id]
                              : form.allowedCashboxes.filter((id) => id !== c.id);
                            setForm({ ...form, allowedCashboxes: newCb });
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  id="isActiveCheck"
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label htmlFor="isActiveCheck" style={{ fontSize: 14, fontWeight: 700, cursor: "pointer" }}>چالاک</label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-start" }}>
              <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
                {saving ? "خەزنکردن..." : "💾 خەزنکردن"}
              </button>
              <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const thStyle: CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: FONT,
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};

const tdStyle: CSSProperties = {
  padding: "12px 16px",
  textAlign: "right",
  fontSize: 14,
  fontFamily: FONT,
  verticalAlign: "middle",
};

const addBtnStyle: CSSProperties = {
  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
  boxShadow: "0 2px 8px rgba(29,78,216,0.25)",
};

const actionBtnStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 14,
  background: "#f1f5f9",
  transition: "all 0.15s",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalStyle: CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: "32px",
  width: "100%",
  maxWidth: 460,
  maxHeight: "90vh",
  overflowY: "auto",
  fontFamily: FONT,
  direction: "rtl",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
};

const errorStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#dc2626",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 16,
};

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

function EmployeeProfileForm({ currentUser }: { currentUser: any }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) setNewUsername(currentUser.username);
  }, [currentUser]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    
    if (!currentPassword) {
      setError("پاسۆردی ئێستا داغڵ بکە");
      return;
    }
    if (newPassword && newPassword !== newPassword2) {
      setError("پاسۆردی نوێ یەکناگرنەوە");
      return;
    }
    if (!newPassword && newUsername === currentUser?.username) {
      setError("هیچ گۆڕانکارییەک نییە");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword || undefined,
          newUsername: newUsername !== currentUser?.username ? newUsername : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("بە سەرکەوتوویی گۆڕدرا!");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(data.error || "هەڵە");
      }
    } catch {
      setError("کێشەیەک ڕوویدا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "40px 24px", fontFamily: FONT, direction: "rtl", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 450, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#1e293b", textAlign: "center" }}>
          👤 ڕێکخستنی هەژمارەکەم
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b", textAlign: "center" }}>
          لێرەوە دەتوانیت یوزەرنەیم و پاسۆردی خۆت بگۆڕیت
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{error}</div>
        )}
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", color: "#16a34a", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{success}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>ناوی بەکارهێنەر (یوزەرنەیم)</label>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              style={inputStyle}
              dir="ltr"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>پاسۆردی ئێستا *</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
              dir="ltr"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>پاسۆردی نوێ (بەتاڵ بێت ناگۆڕێت)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              dir="ltr"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>دووبارەکردنەوەی پاسۆردی نوێ</label>
            <input
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              style={inputStyle}
              dir="ltr"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", marginTop: 24, background: "linear-gradient(135deg, #0d1e3d, #1e293b)", color: "white",
          border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: FONT
        }}>
          {saving ? "خەزنکردن..." : "💾 خەزنکردنی گۆڕانکارییەکان"}
        </button>
      </div>
    </div>
  );
}

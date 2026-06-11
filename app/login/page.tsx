"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Set cookie on client side as well for safety
        document.cookie = "auth_token=authenticated_session; path=/; max-age=604800; SameSite=Lax";
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "چوونەژوورەوە سەرکەوتوو نەبوو");
      }
    } catch (err) {
      setError("پەیوەندی لەکارکەوت، تکایە دووبارە هەوڵ بدەرەوە");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={loginCard}>
        <div style={logoWrapper}>
          <div style={logoGlow}></div>
          <span style={logoIcon}>🔐</span>
        </div>
        <h2 style={title}>چوونەژوورەوە بۆ سیستەم</h2>
        <p style={subtitle}>تکایە یوزەرنەیم و پاسوۆردەکەت داغڵ بکە</p>

        {error && <div style={errorAlert}>{error}</div>}

        <form onSubmit={handleLogin} style={form}>
          <div style={inputGroup}>
            <label style={label}>یوزەرنەیمی بەڕێوبەر</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={input}
              required
              disabled={isLoading}
            />
          </div>

          <div style={inputGroup}>
            <label style={label}>پاسوۆردی دەستپێگەیشتن</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={input}
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" style={loginBtn} disabled={isLoading}>
            {isLoading ? "کۆنترۆڵکردن..." : "چوونەژوورەوە"}
          </button>
        </form>
      </div>
    </div>
  );
}

const appFont = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

const container: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)",
  fontFamily: appFont,
  direction: "rtl",
  padding: 20,
};

const loginCard: CSSProperties = {
  background: "rgba(30, 41, 59, 0.7)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 24,
  padding: "40px 32px",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
  textAlign: "center",
};

const logoWrapper: CSSProperties = {
  position: "relative",
  width: 70,
  height: 70,
  margin: "0 auto 20px",
  background: "rgba(59, 130, 246, 0.1)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(59, 130, 246, 0.3)",
};

const logoGlow: CSSProperties = {
  position: "absolute",
  inset: -4,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
  filter: "blur(4px)",
};

const logoIcon: CSSProperties = {
  fontSize: 32,
  zIndex: 2,
};

const title: CSSProperties = {
  color: "#f8fafc",
  fontSize: 22,
  fontWeight: 900,
  margin: "0 0 8px 0",
};

const subtitle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  margin: "0 0 24px 0",
};

const errorAlert: CSSProperties = {
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#f87171",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 20,
  textAlign: "right",
};

const form: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const inputGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textAlign: "right",
};

const label: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 700,
  paddingRight: 4,
};

const input: CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  padding: "12px 16px",
  color: "#f8fafc",
  fontSize: 15,
  outline: "none",
  fontFamily: appFont,
};

const loginBtn: CSSProperties = {
  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  border: 0,
  borderRadius: 12,
  padding: "14px",
  color: "white",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 10,
  boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)",
  fontFamily: appFont,
};

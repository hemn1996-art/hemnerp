"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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
        setLoginSuccess(true);
        document.cookie = "auth_token=authenticated_session; path=/; max-age=604800; SameSite=Lax";
        if (data.user) {
          document.cookie = `user_session=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=604800; SameSite=Lax`;
        }
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 800);
      } else {
        setError(data.error || "یوزەرنەیم یان پاسوۆرد هەڵەیە");
      }
    } catch (err) {
      setError("پەیوەندی لەکارکەوت، تکایە دووبارە هەوڵ بدەرەوە");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(80px, -60px) scale(1.1); }
          50% { transform: translate(-40px, -120px) scale(0.95); }
          75% { transform: translate(60px, -30px) scale(1.05); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-70px, 50px) scale(1.08); }
          50% { transform: translate(50px, 80px) scale(0.92); }
          75% { transform: translate(-30px, -40px) scale(1.12); }
        }
        @keyframes float-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(100px, -80px) scale(1.15); }
          66% { transform: translate(-60px, 60px) scale(0.9); }
        }
        @keyframes card-enter {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes success-scale {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes grid-line-h {
          0% { opacity: 0; transform: scaleX(0); }
          50% { opacity: 0.08; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(0); }
        }
        @keyframes particle-float {
          0% { opacity: 0; transform: translateY(0) scale(0); }
          20% { opacity: 1; transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-200px) scale(0); }
        }
        @keyframes border-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes text-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* === Accounting Chart Animations === */
        @keyframes bar-grow-1 {
          0%, 100% { height: 30%; }
          50% { height: 75%; }
        }
        @keyframes bar-grow-2 {
          0%, 100% { height: 50%; }
          50% { height: 90%; }
        }
        @keyframes bar-grow-3 {
          0%, 100% { height: 40%; }
          50% { height: 65%; }
        }
        @keyframes bar-grow-4 {
          0%, 100% { height: 60%; }
          50% { height: 85%; }
        }
        @keyframes bar-grow-5 {
          0%, 100% { height: 25%; }
          50% { height: 70%; }
        }
        @keyframes line-chart-draw {
          0% { stroke-dashoffset: 300; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes chart-dot-move {
          0% { cx: 10; cy: 70; }
          20% { cx: 40; cy: 40; }
          40% { cx: 70; cy: 55; }
          60% { cx: 100; cy: 25; }
          80% { cx: 130; cy: 35; }
          100% { cx: 160; cy: 15; }
        }
        @keyframes pie-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float-icon {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.12; }
          50% { transform: translateY(-15px) rotate(5deg); opacity: 0.22; }
        }
        @keyframes float-icon-alt {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
          50% { transform: translateY(-20px) rotate(-5deg); opacity: 0.2; }
        }
        @keyframes data-flow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes counter-tick {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        @keyframes donut-spin {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -251; }
        }

        .login-page-root * {
          box-sizing: border-box;
        }
        .login-page-root input:-webkit-autofill,
        .login-page-root input:-webkit-autofill:hover,
        .login-page-root input:-webkit-autofill:focus {
          -webkit-text-fill-color: #e2e8f0 !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(15, 23, 42, 0.9) inset !important;
          transition: background-color 5000s ease-in-out 0s;
          font-family: "Speda", "Segoe UI", Tahoma, Arial, sans-serif !important;
        }
      `}</style>

      <div className="login-page-root" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#050a18",
        fontFamily: '"Speda", "Segoe UI", Tahoma, Arial, sans-serif',
        direction: "rtl",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}>

        {/* === Background Grid Pattern === */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          zIndex: 0,
        }} />

        {/* === Animated Gradient Orbs === */}
        <div style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          top: "-10%",
          right: "-5%",
          animation: "float-orb-1 20s ease-in-out infinite",
          filter: "blur(60px)",
          zIndex: 0,
        }} />
        <div style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)",
          bottom: "-8%",
          left: "-3%",
          animation: "float-orb-2 25s ease-in-out infinite",
          filter: "blur(50px)",
          zIndex: 0,
        }} />
        <div style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)",
          top: "40%",
          left: "50%",
          animation: "float-orb-3 18s ease-in-out infinite",
          filter: "blur(40px)",
          zIndex: 0,
        }} />

        {/* === Floating Particles === */}
        {mounted && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            borderRadius: "50%",
            background: `rgba(${100 + Math.random() * 100}, ${100 + Math.random() * 100}, 241, ${0.2 + Math.random() * 0.3})`,
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 30}%`,
            animation: `particle-float ${6 + Math.random() * 10}s ease-out infinite`,
            animationDelay: `${Math.random() * 8}s`,
            zIndex: 0,
          }} />
        ))}

        {/* === Animated Accounting Charts - Right Side === */}
        {mounted && (
          <div style={{
            position: "absolute",
            right: "5%",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            opacity: 0.9,
            display: "flex",
            flexDirection: "column",
            gap: 30,
            alignItems: "center",
          }}>
            {/* Bar Chart */}
            <svg width="180" height="130" viewBox="0 0 180 130" fill="none" style={{ filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.15))" }}>
              {/* Chart grid lines */}
              <line x1="25" y1="110" x2="170" y2="110" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="1" />
              <line x1="25" y1="85" x2="170" y2="85" stroke="rgba(99, 102, 241, 0.05)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="25" y1="60" x2="170" y2="60" stroke="rgba(99, 102, 241, 0.05)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="25" y1="35" x2="170" y2="35" stroke="rgba(99, 102, 241, 0.05)" strokeWidth="0.5" strokeDasharray="4 4" />
              {/* Animated bars */}
              {[0,1,2,3,4,5].map(i => (
                <rect
                  key={`bar-${i}`}
                  x={30 + i * 24}
                  width="16"
                  rx="4"
                  fill={`url(#barGrad${i % 3})`}
                  style={{
                    y: `${110 - [55, 75, 45, 65, 35, 80][i]}px`,
                    height: `${[55, 75, 45, 65, 35, 80][i]}px`,
                    animation: `bar-grow-${(i % 5) + 1} ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                    transformOrigin: "bottom",
                  }}
                />
              ))}
              <defs>
                <linearGradient id="barGrad0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Y-axis labels */}
              <text x="18" y="113" fill="rgba(148, 163, 184, 0.3)" fontSize="7" textAnchor="end">0</text>
              <text x="18" y="63" fill="rgba(148, 163, 184, 0.3)" fontSize="7" textAnchor="end">50</text>
              <text x="18" y="38" fill="rgba(148, 163, 184, 0.3)" fontSize="7" textAnchor="end">100</text>
            </svg>

            {/* Donut/Ring Chart */}
            <svg width="90" height="90" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0 0 15px rgba(168, 85, 247, 0.1))" }}>
              <circle cx="50" cy="50" r="38" stroke="rgba(99, 102, 241, 0.08)" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r="38" stroke="url(#donutGrad)" strokeWidth="8" fill="none"
                strokeDasharray="160 251" strokeLinecap="round"
                style={{ animation: "donut-spin 12s linear infinite", transformOrigin: "center" }} />
              <circle cx="50" cy="50" r="38" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="8" fill="none"
                strokeDasharray="60 251" strokeDashoffset="-170" strokeLinecap="round" />
              <text x="50" y="48" textAnchor="middle" fill="rgba(129, 140, 248, 0.4)" fontSize="12" fontWeight="bold">67%</text>
              <text x="50" y="60" textAnchor="middle" fill="rgba(148, 163, 184, 0.25)" fontSize="7">قازانج</text>
              <defs>
                <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* === Animated Accounting Charts - Left Side === */}
        {mounted && (
          <div style={{
            position: "absolute",
            left: "5%",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            opacity: 0.9,
            display: "flex",
            flexDirection: "column",
            gap: 30,
            alignItems: "center",
          }}>
            {/* Line Chart with moving dot */}
            <svg width="180" height="110" viewBox="0 0 180 110" fill="none" style={{ filter: "drop-shadow(0 0 20px rgba(56, 189, 248, 0.1))" }}>
              {/* Grid */}
              <line x1="10" y1="95" x2="170" y2="95" stroke="rgba(99, 102, 241, 0.08)" strokeWidth="0.5" />
              <line x1="10" y1="70" x2="170" y2="70" stroke="rgba(99, 102, 241, 0.04)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="10" y1="45" x2="170" y2="45" stroke="rgba(99, 102, 241, 0.04)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="10" y1="20" x2="170" y2="20" stroke="rgba(99, 102, 241, 0.04)" strokeWidth="0.5" strokeDasharray="3 3" />
              {/* Area fill */}
              <path d="M10 70 Q40 40, 55 55 T100 30 T140 40 T170 18 V95 H10 Z" fill="url(#areaGrad)" />
              {/* Line */}
              <path d="M10 70 Q40 40, 55 55 T100 30 T140 40 T170 18" stroke="url(#lineGrad)" strokeWidth="2" fill="none" strokeLinecap="round"
                strokeDasharray="300" style={{ animation: "line-chart-draw 4s ease-out forwards" }} />
              {/* Moving dot */}
              <circle r="4" fill="#818cf8" style={{ animation: "chart-dot-move 6s ease-in-out infinite" }}>
                <animate attributeName="cx" values="10;40;70;100;130;160;10" dur="6s" repeatCount="indefinite" />
                <animate attributeName="cy" values="70;45;55;30;40;18;70" dur="6s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="rgba(129, 140, 248, 0.2)" style={{ animation: "chart-dot-move 6s ease-in-out infinite" }}>
                <animate attributeName="cx" values="10;40;70;100;130;160;10" dur="6s" repeatCount="indefinite" />
                <animate attributeName="cy" values="70;45;55;30;40;18;70" dur="6s" repeatCount="indefinite" />
              </circle>
              {/* Data point dots */}
              {[[10,70],[40,45],[70,55],[100,30],[140,40],[170,18]].map(([cx,cy], i) => (
                <circle key={`dp-${i}`} cx={cx} cy={cy} r="2.5" fill="rgba(129, 140, 248, 0.3)" stroke="rgba(129, 140, 248, 0.15)" strokeWidth="1" />
              ))}
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(129, 140, 248, 0.12)" />
                  <stop offset="100%" stopColor="rgba(129, 140, 248, 0)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Mini KPI Cards */}
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "داهات", val: "$12.4K", color: "#34d399" },
                { label: "خەرجی", val: "$8.2K", color: "#f97316" },
              ].map((kpi, i) => (
                <div key={`kpi-${i}`} style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(99, 102, 241, 0.08)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  textAlign: "center",
                  backdropFilter: "blur(8px)",
                  animation: `float-icon ${5 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}>
                  <div style={{ fontSize: 8, color: "rgba(148, 163, 184, 0.4)", fontWeight: 700 }}>{kpi.label}</div>
                  <div style={{ fontSize: 14, color: kpi.color, fontWeight: 900, opacity: 0.4, marginTop: 2 }}>{kpi.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === Floating Financial Icons === */}
        {mounted && (
          <>
            {/* Dollar sign */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(129, 140, 248, 0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", top: "12%", left: "18%", animation: "float-icon 7s ease-in-out infinite", zIndex: 1 }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            {/* Trending up */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(52, 211, 153, 0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", top: "20%", right: "22%", animation: "float-icon-alt 8s ease-in-out infinite", animationDelay: "1s", zIndex: 1 }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            {/* Calculator */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(192, 132, 252, 0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", bottom: "22%", right: "30%", animation: "float-icon 9s ease-in-out infinite", animationDelay: "2s", zIndex: 1 }}>
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
              <line x1="8" y1="11" x2="8" y2="11.01" />
              <line x1="12" y1="11" x2="12" y2="11.01" />
              <line x1="16" y1="11" x2="16" y2="11.01" />
              <line x1="8" y1="15" x2="8" y2="15.01" />
              <line x1="12" y1="15" x2="12" y2="15.01" />
            </svg>
            {/* Wallet */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", bottom: "30%", left: "20%", animation: "float-icon-alt 6s ease-in-out infinite", animationDelay: "0.5s", zIndex: 1 }}>
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
            </svg>
            {/* Pie chart icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", top: "70%", right: "15%", animation: "float-icon 10s ease-in-out infinite", animationDelay: "3s", zIndex: 1 }}>
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            {/* Receipt */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(251, 146, 60, 0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", top: "15%", right: "40%", animation: "float-icon-alt 8s ease-in-out infinite", animationDelay: "4s", zIndex: 1 }}>
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
              <path d="M8 10h8" />
              <path d="M8 14h4" />
            </svg>
          </>
        )}

        {/* === Login Card === */}
        <div style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 460,
          animation: mounted ? "card-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
          opacity: mounted ? 1 : 0,
        }}>

          {/* Card border glow */}
          <div style={{
            position: "absolute",
            inset: -1,
            borderRadius: 28,
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(14, 165, 233, 0.1), rgba(168, 85, 247, 0.2))",
            animation: "border-glow 4s ease-in-out infinite",
            zIndex: -1,
          }} />

          <div style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
            borderRadius: 28,
            padding: "48px 40px 40px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 80px -20px rgba(99, 102, 241, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
            textAlign: "center",
            ...(loginSuccess ? { animation: "success-scale 0.5s ease" } : {}),
            ...(error ? { animation: "shake 0.5s ease" } : {}),
          }}>

            {/* Logo / Brand */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 32,
            }}>
              {/* Logo icon container */}
              <div style={{
                position: "relative",
                width: 80,
                height: 80,
                marginBottom: 20,
              }}>
                {/* Pulse ring */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  animation: "logo-pulse 3s ease-in-out infinite",
                }} />
                {/* Logo circle */}
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Shimmer effect */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                    animation: "shimmer 3s ease-in-out infinite",
                  }} />
                  {/* Shield SVG icon */}
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="url(#logo-gradient)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", zIndex: 2 }}>
                    <defs>
                      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>

              {/* Brand name */}
              <h1 style={{
                margin: "0 0 4px 0",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "2px",
                background: "linear-gradient(135deg, #818cf8, #c084fc, #38bdf8, #818cf8)",
                backgroundSize: "300% 300%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "text-gradient-shift 6s ease infinite",
                lineHeight: 1.2,
              }}>
                HEMN ERP
              </h1>

              {/* Tagline */}
              <p style={{
                margin: "4px 0 0 0",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(148, 163, 184, 0.7)",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}>
                Enterprise Resource Planning
              </p>

              {/* Divider line */}
              <div style={{
                width: 60,
                height: 2,
                borderRadius: 2,
                background: "linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent)",
                margin: "20px auto 0",
              }} />
            </div>

            {/* Title */}
            <h2 style={{
              color: "#e2e8f0",
              fontSize: 20,
              fontWeight: 800,
              margin: "0 0 6px 0",
            }}>
              چوونەژوورەوە بۆ سیستەم
            </h2>
            <p style={{
              color: "#64748b",
              fontSize: 13,
              margin: "0 0 28px 0",
              fontWeight: 500,
            }}>
              تکایە زانیارییەکانت داغڵ بکە بۆ دەستپێگەیشتن
            </p>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#f87171",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 20,
                textAlign: "right",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success feedback */}
            {loginSuccess && (
              <div style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#34d399",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 20,
                textAlign: "right",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>سەرکەوتوو بوو! ئاراستەکردن...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Username Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "right" }}>
                <label style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                  paddingRight: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  ناو بەکارهێنەر
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="username"
                    required
                    disabled={isLoading || loginSuccess}
                    style={{
                      width: "100%",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: `1.5px solid ${focusedField === "username" ? "rgba(99, 102, 241, 0.5)" : "rgba(255, 255, 255, 0.06)"}`,
                      borderRadius: 14,
                      padding: "14px 18px",
                      color: "#e2e8f0",
                      fontSize: 15,
                      outline: "none",
                      fontFamily: '"Speda", "Segoe UI", Tahoma, Arial, sans-serif',
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: focusedField === "username"
                        ? "0 0 0 3px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(0, 0, 0, 0.2)"
                        : "0 2px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  {/* Focus indicator line */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    right: "10%",
                    width: focusedField === "username" ? "80%" : "0%",
                    height: 2,
                    borderRadius: 2,
                    background: "linear-gradient(90deg, #818cf8, #c084fc)",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "right" }}>
                <label style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                  paddingRight: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  پاسوۆرد
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading || loginSuccess}
                    style={{
                      width: "100%",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: `1.5px solid ${focusedField === "password" ? "rgba(99, 102, 241, 0.5)" : "rgba(255, 255, 255, 0.06)"}`,
                      borderRadius: 14,
                      padding: "14px 18px",
                      paddingLeft: 48,
                      color: "#e2e8f0",
                      fontSize: 15,
                      outline: "none",
                      fontFamily: '"Speda", "Segoe UI", Tahoma, Arial, sans-serif',
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: focusedField === "password"
                        ? "0 0 0 3px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(0, 0, 0, 0.2)"
                        : "0 2px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: showPassword ? "#818cf8" : "#475569",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      outline: "none",
                      transition: "color 0.2s ease",
                      zIndex: 10,
                    }}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                  {/* Focus indicator line */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    right: "10%",
                    width: focusedField === "password" ? "80%" : "0%",
                    height: 2,
                    borderRadius: 2,
                    background: "linear-gradient(90deg, #818cf8, #c084fc)",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || loginSuccess}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: loginSuccess
                    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)",
                  backgroundSize: "200% 200%",
                  border: "none",
                  borderRadius: 14,
                  padding: "15px 24px",
                  color: "white",
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: isLoading || loginSuccess ? "not-allowed" : "pointer",
                  marginTop: 4,
                  boxShadow: loginSuccess
                    ? "0 8px 24px rgba(16, 185, 129, 0.3)"
                    : "0 8px 24px rgba(99, 102, 241, 0.25), 0 2px 8px rgba(0, 0, 0, 0.2)",
                  fontFamily: '"Speda", "Segoe UI", Tahoma, Arial, sans-serif',
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity: isLoading ? 0.85 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  letterSpacing: 0.5,
                }}
              >
                {/* Button shimmer */}
                {!isLoading && !loginSuccess && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                    animation: "shimmer 3s ease-in-out infinite",
                  }} />
                )}

                {isLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>چاوەڕوان بە</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "white",
                          animation: `dot-pulse 1s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                ) : loginSuccess ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>سەرکەوتوو بوو</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 2 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    <span>چوونەژوورەوە</span>
                  </div>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid rgba(255, 255, 255, 0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px rgba(34, 197, 94, 0.4)",
              }} />
              <span style={{
                color: "#475569",
                fontSize: 11,
                fontWeight: 600,
              }}>
                سیستەم چالاکە · وەشانی ٧.١
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState, CSSProperties } from "react";

interface GeneralSettings {
  companyName?: string;
  about?: string;
  address?: string;
  phones?: string[];
  logo?: string;
  hideZeroBalance?: boolean;
}

export default function PrintHeader() {
  const [settings, setSettings] = useState<GeneralSettings>({
    companyName: "سەنتەری کارەبای لەندەن",
    about: "",
    address: "سلێمانی کۆگانی ژووری بازرگانی 456",
    phones: ["07501734006", "07701403038"],
    logo: "",
    hideZeroBalance: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {}
    }
  }, []);

  return (
    <div style={headerContainer}>
      {/* Left Column: Address */}
      <div style={leftCol}>
        <div style={addressText}>
          {settings.address || "سلێمانی کۆگانی ژووری بازرگانی 456"}
        </div>
      </div>

      {/* Center Column: Company Name & About & Logo */}
      <div style={centerCol}>
        {settings.logo && (
          <img src={settings.logo} alt="Logo" style={logoStyle} />
        )}
        <h1 style={companyNameStyle}>
          {settings.companyName || "سەنتەری کارەبای لەندەن"}
        </h1>
        {settings.about && (
          <p style={companyAboutStyle}>
            {settings.about}
          </p>
        )}
      </div>

      {/* Right Column: Phone numbers */}
      <div style={rightCol}>
        {settings.phones && settings.phones.map((phone, idx) => (
          <div key={idx} style={phoneText}>{phone}</div>
        ))}
      </div>
    </div>
  );
}

export function PrintWatermark() {
  const [companyName, setCompanyName] = useState("سەنتەری کارەبای لەندەن");

  useEffect(() => {
    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
      } catch (e) {}
    }
  }, []);

  return (
    <div style={watermarkStyle}>
      {companyName}
    </div>
  );
}

/* Inline Styles to ensure compatibility and isolate print styling */
const headerContainer: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  borderBottom: "2px solid #e5e7eb",
  paddingBottom: "12px",
  marginBottom: "16px",
  width: "100%",
  boxSizing: "border-box",
  direction: "rtl",
};

const leftCol: CSSProperties = {
  width: "35%",
  textAlign: "left",
  fontSize: "12px",
  color: "#374151",
};

const addressText: CSSProperties = {
  direction: "rtl",
  textAlign: "right",
  whiteSpace: "pre-line",
  lineHeight: "1.6",
  fontWeight: "bold",
  fontSize: "13px",
};

const centerCol: CSSProperties = {
  width: "30%",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const logoStyle: CSSProperties = {
  maxHeight: "55px",
  maxWidth: "110px",
  marginBottom: "4px",
  objectFit: "contain",
};

const companyNameStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 900,
  margin: "0 0 4px 0",
  color: "#000",
  whiteSpace: "nowrap",
};

const companyAboutStyle: CSSProperties = {
  fontSize: "12px",
  margin: 0,
  color: "#4b5563",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const rightCol: CSSProperties = {
  width: "35%",
  textAlign: "right",
  fontSize: "13px",
  color: "#374151",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontWeight: "bold",
  fontFamily: "monospace",
};

const phoneText: CSSProperties = {
  direction: "ltr",
  textAlign: "right",
};

const watermarkStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%) rotate(-15deg)",
  fontSize: "64px",
  fontWeight: "bold",
  color: "rgba(156, 163, 175, 0.06)",
  pointerEvents: "none",
  whiteSpace: "nowrap",
  zIndex: 0,
  userSelect: "none",
};

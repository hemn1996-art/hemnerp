const fs = require('fs');

const filePath = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components/PurchasePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const badSection = /function StatBox\(\{[\s\S]*?value\}[\s\S]*?bold\?: boolean;[\s\S]*?\}\) \{[\s\S]*?return \([\s\S]*?printSummaryLine[\s\S]*?<\/div>[\s\S]*?\);\s*\r?\n\}/;

const replacement = `function StatBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div style={statBox}>
      <div style={{ color: "#374151", fontWeight: 700 }}>{title}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={summaryItem}>
      <div style={{ color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontWeight: strong ? 900 : 700,
          fontSize: strong ? 19 : 15,
          color: strong ? "#0f172a" : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PrintInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={printInfoRow}>
      <b>{label}:</b>
      <span>{value}</span>
    </div>
  );
}

function PrintSummaryLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div style={printSummaryLine}>
      <span style={{ fontWeight: bold ? 900 : 700 }}>{label}</span>
      <span style={{ fontWeight: bold ? 900 : 500 }}>{value}</span>
    </div>
  );
}`;

if (content.match(badSection)) {
  content = content.replace(badSection, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed StatBox and helper functions!");
} else {
  console.error("Could not match the bad section.");
}

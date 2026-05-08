import {
  getCategoryLabel,
  getRiskLabel,
  getSeverityLabel,
  normalizeCategory,
  normalizeRisk,
  normalizeSeverity,
} from "../utils/display";

function Badge({ type = "default", value }) {
  const normalized = getNormalizedValue(type, value);
  const label = getLabel(type, value);

  return <span style={{ ...badgeStyle, ...paletteStyle(normalized) }}>{label}</span>;
}

function getNormalizedValue(type, value) {
  if (type === "risk") return normalizeRisk(value);
  if (type === "severity") return normalizeSeverity(value);
  if (type === "category") return normalizeCategory(value);
  return "default";
}

function getLabel(type, value) {
  if (type === "risk") return getRiskLabel(value);
  if (type === "severity") return getSeverityLabel(value);
  if (type === "category") return getCategoryLabel(value);
  return value || "-";
}

function paletteStyle(value) {
  return {
    low: { background: "#064e3b", color: "#bbf7d0", borderColor: "#047857" },
    medium: { background: "#78350f", color: "#fde68a", borderColor: "#b45309" },
    high: { background: "#7f1d1d", color: "#fecaca", borderColor: "#b91c1c" },
    critical: { background: "#4c0519", color: "#fbcfe8", borderColor: "#be123c" },
    security: { background: "#312e81", color: "#c7d2fe", borderColor: "#4f46e5" },
    validation: { background: "#164e63", color: "#a5f3fc", borderColor: "#0891b2" },
    documentation: { background: "#365314", color: "#d9f99d", borderColor: "#65a30d" },
    performance: { background: "#713f12", color: "#fef3c7", borderColor: "#ca8a04" },
    rest_design: { background: "#1e3a8a", color: "#bfdbfe", borderColor: "#2563eb" },
    maintainability: { background: "#581c87", color: "#e9d5ff", borderColor: "#9333ea" },
    observability: { background: "#134e4a", color: "#ccfbf1", borderColor: "#0d9488" },
  }[value] || { background: "#1e293b", color: "#cbd5e1", borderColor: "#334155" };
}

const badgeStyle = {
  border: "1px solid",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1,
  padding: "6px 9px",
  whiteSpace: "nowrap",
};

export default Badge;

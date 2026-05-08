import Badge from "./Badge";
import MetricCard from "./MetricCard";
import { normalizeDisplayScore, normalizeRisk } from "../utils/display";

function DashboardStats({ history, sectionStyle }) {
  const audits = Array.isArray(history) ? history : [];
  const total = audits.length;
  const lowRisk = countRisk(audits, "low");
  const mediumRisk = countRisk(audits, "medium");
  const highRisk = countRisk(audits, "high");
  const criticalRisk = countRisk(audits, "critical");
  const scores = audits
    .map((audit) => normalizeDisplayScore(audit?.average_score ?? audit?.score))
    .filter((score) => typeof score === "number");
  const averageScore = scores.length > 0
    ? normalizeDisplayScore(scores.reduce((acc, score) => acc + score, 0) / scores.length)
    : "-";
  const totalEndpoints = audits.reduce((acc, audit) => {
    if (typeof audit?.total_endpoints === "number") return acc + audit.total_endpoints;
    if (Array.isArray(audit?.endpoints)) return acc + audit.endpoints.length;
    return acc;
  }, 0);
  const mostFrequentRisk = getMostFrequentRisk(audits);
  const latestAudit = audits[0]?.name || "Sin auditorías todavía";

  return (
    <section>
      <h2 style={sectionStyle}>Dashboard ejecutivo</h2>
      <div style={dashboardGridStyle}>
        <MetricCard title="Auditorías" value={total} style={metricCardStyle} />
        <MetricCard title="Score medio" value={averageScore === "-" ? "-" : `${averageScore}/100`} style={metricCardStyle} />
        <MetricCard title="Endpoints aprox." value={totalEndpoints} style={metricCardStyle} />
        <MetricCard title="Última auditoría" value={latestAudit} style={metricCardStyle} compact />
      </div>

      <div style={riskPanelStyle}>
        <div style={riskCountStyle}><Badge type="risk" value="low" /> <strong>{lowRisk}</strong></div>
        <div style={riskCountStyle}><Badge type="risk" value="medium" /> <strong>{mediumRisk}</strong></div>
        <div style={riskCountStyle}><Badge type="risk" value="high" /> <strong>{highRisk}</strong></div>
        <div style={riskCountStyle}><Badge type="risk" value="critical" /> <strong>{criticalRisk}</strong></div>
        <div style={riskCountStyle}>Riesgo más frecuente: <Badge type="risk" value={mostFrequentRisk} /></div>
      </div>
    </section>
  );
}

function countRisk(audits, risk) {
  return audits.filter((audit) => normalizeRisk(audit?.global_risk_level || audit?.risk_level) === risk).length;
}

function getMostFrequentRisk(audits) {
  if (audits.length === 0) {
    return "unknown";
  }

  const counts = audits.reduce((acc, audit) => {
    const risk = normalizeRisk(audit?.global_risk_level || audit?.risk_level);
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
}

const dashboardGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  marginTop: 18,
};

const metricCardStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  minHeight: 105,
  padding: 18,
};

const riskPanelStyle = {
  alignItems: "center",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 14,
  padding: 14,
};

const riskCountStyle = {
  alignItems: "center",
  color: "#cbd5e1",
  display: "inline-flex",
  gap: 8,
};

export default DashboardStats;

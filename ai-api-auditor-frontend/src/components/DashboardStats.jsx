import MetricCard from "./MetricCard";

function DashboardStats({ history, getRiskLabel, getColor, statsStyle, miniCardStyle, sectionStyle }) {
  const audits = Array.isArray(history) ? history : [];
  const total = audits.length;
  const lowRisk = audits.filter((audit) => audit?.risk_level === "low").length;
  const mediumRisk = audits.filter((audit) => audit?.risk_level === "medium").length;
  const highRisk = audits.filter((audit) => audit?.risk_level === "high").length;
  const scores = audits.map((audit) => audit?.score).filter((score) => typeof score === "number");
  const averageScore = scores.length > 0
    ? (scores.reduce((acc, score) => acc + score, 0) / scores.length).toFixed(1)
    : "-";

  return (
    <>
      <h2 style={sectionStyle}>Resumen del historial</h2>
      <div style={statsStyle}>
        <MetricCard title="Auditorías" value={total} style={miniCardStyle} />
        <MetricCard title={getRiskLabel("low")} value={lowRisk} color={getColor("low")} style={miniCardStyle} />
        <MetricCard title={getRiskLabel("medium")} value={mediumRisk} color={getColor("medium")} style={miniCardStyle} />
        <MetricCard title={getRiskLabel("high")} value={highRisk} color={getColor("high")} style={miniCardStyle} />
        <MetricCard title="Media histórica" value={averageScore} style={miniCardStyle} />
      </div>
    </>
  );
}

export default DashboardStats;

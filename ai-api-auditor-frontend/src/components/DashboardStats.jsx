import Badge from "./Badge";
import EmptyState from "./EmptyState";
import MetricCard from "./MetricCard";
import {
  getCategoryLabel,
  normalizeCategory,
  normalizeDisplayScore,
  normalizeRisk,
} from "../utils/display";

const riskOrder = ["low", "medium", "high", "critical"];
const issueCategories = ["security", "validation", "documentation", "performance", "rest_design", "maintainability"];

function DashboardStats({ history, sectionStyle }) {
  const audits = Array.isArray(history) ? history : [];
  const total = audits.length;
  const lowRisk = countRisk(audits, "low");
  const mediumRisk = countRisk(audits, "medium");
  const highRisk = countRisk(audits, "high");
  const criticalRisk = countRisk(audits, "critical");
  const riskCounts = { low: lowRisk, medium: mediumRisk, high: highRisk, critical: criticalRisk };
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
  const latestAudit = audits[0];
  const latestAuditLabel = latestAudit?.name || "Sin auditorías todavía";
  const topIssues = getIssueCategoryCounts(audits);
  const recentAudits = audits.slice(0, 3);

  return (
    <section>
      <h2 style={sectionStyle}>Dashboard ejecutivo</h2>
      <div style={dashboardGridStyle}>
        <MetricCard title="Auditorías" value={total} style={metricCardStyle} />
        <MetricCard title="Score medio" value={averageScore === "-" ? "-" : `${averageScore}/100`} style={metricCardStyle} />
        <MetricCard title="Endpoints analizados" value={totalEndpoints} style={metricCardStyle} />
        <MetricCard title="Última auditoría" value={latestAuditLabel} style={metricCardStyle} compact />
      </div>

      <div style={insightGridStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h3 style={panelTitleStyle}>Distribución de riesgos</h3>
              <p style={mutedStyle}>Porcentaje sobre auditorías registradas</p>
            </div>
            <div style={riskCountStyle}>Riesgo más frecuente: <Badge type="risk" value={mostFrequentRisk} /></div>
          </div>

          <div style={stackedBarStyle} aria-label="Distribución visual de riesgos">
            {riskOrder.map((risk) => {
              const percentage = getPercentage(riskCounts[risk], total);
              return (
                <div
                  key={risk}
                  title={`${risk}: ${percentage}%`}
                  style={{ ...stackSegmentStyle, ...riskSegmentColor(risk), width: `${percentage}%` }}
                />
              );
            })}
          </div>

          <div style={riskRowsStyle}>
            {riskOrder.map((risk) => {
              const count = riskCounts[risk];
              const percentage = getPercentage(count, total);
              return (
                <div key={risk} style={barRowStyle}>
                  <div style={barLabelStyle}><Badge type="risk" value={risk} /> <strong>{count}</strong></div>
                  <div style={barTrackStyle}>
                    <div style={{ ...barFillStyle, ...riskSegmentColor(risk), width: `${percentage}%` }} />
                  </div>
                  <span style={percentageStyle}>{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Top problemas detectados</h3>
          <p style={mutedStyle}>Issues agrupados por categoría</p>
          <div style={riskRowsStyle}>
            {issueCategories.map((category) => {
              const count = topIssues[category] || 0;
              const max = Math.max(...issueCategories.map((item) => topIssues[item] || 0), 1);
              const percentage = Math.round((count / max) * 100);
              return (
                <div key={category} style={barRowStyle}>
                  <span style={categoryLabelStyle}>{getCategoryLabel(category)}</span>
                  <div style={barTrackStyle}>
                    <div style={{ ...barFillStyle, background: "linear-gradient(90deg, #6366f1, #22d3ee)", width: `${percentage}%` }} />
                  </div>
                  <strong style={percentageStyle}>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Últimas auditorías</h3>
        {recentAudits.length === 0 ? (
          <EmptyState
            compact
            title="Dashboard sin datos todavía"
            description="Aún no hay auditorías para alimentar métricas ejecutivas."
            action="Pega una especificación OpenAPI y lanza tu primer análisis."
          />
        ) : (
          <div style={recentGridStyle}>
            {recentAudits.map((audit, index) => (
              <article key={audit?.id || audit?.name || index} style={recentCardStyle}>
                <div>
                  <h4 style={recentTitleStyle}>{audit?.name || "Auditoría sin nombre"}</h4>
                  <p style={mutedStyle}>Score {formatScore(audit)}/100</p>
                </div>
                <div style={recentBadgesStyle}>
                  <Badge type="risk" value={audit?.global_risk_level || audit?.risk_level} />
                  <Badge type="status" value={audit?.status} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Comparación de evolución</h3>
        {audits.length < 2 ? (
          <EmptyState
            compact
            title="Comparación no disponible"
            description="Necesitas al menos dos auditorías para comparar evolución."
            action="Ejecuta otra auditoría para medir cambios de score, riesgo y problemas."
          />
        ) : (
          <div style={comparisonGridStyle}>
            <MetricCard title="Auditoría actual" value={audits[0]?.name || "Actual"} style={comparisonCardStyle} compact />
            <MetricCard title="Auditoría previa" value={audits[1]?.name || "Previa"} style={comparisonCardStyle} compact />
            <MetricCard title="Cambio de score" value={formatScoreDelta(audits[0], audits[1])} style={comparisonCardStyle} />
          </div>
        )}
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

function getPercentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getIssueCategoryCounts(audits) {
  return audits.reduce((acc, audit) => {
    const issues = [
      ...(Array.isArray(audit?.issues) ? audit.issues : []),
      ...(Array.isArray(audit?.endpoints) ? audit.endpoints.flatMap((endpoint) => endpoint?.issues || []) : []),
    ];

    issues.forEach((issue) => {
      const category = normalizeCategory(issue?.category || "maintainability");
      acc[category] = (acc[category] || 0) + 1;
    });

    return acc;
  }, {});
}

function formatScore(audit) {
  return normalizeDisplayScore(audit?.average_score ?? audit?.score);
}

function formatScoreDelta(currentAudit, previousAudit) {
  const current = formatScore(currentAudit);
  const previous = formatScore(previousAudit);
  if (typeof current !== "number" || typeof previous !== "number") return "-";
  const delta = current - previous;
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

function riskSegmentColor(risk) {
  return {
    low: { background: "#22c55e" },
    medium: { background: "#eab308" },
    high: { background: "#ef4444" },
    critical: { background: "#e11d48" },
  }[risk] || { background: "#64748b" };
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

const insightGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  marginTop: 14,
};

const panelStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  marginTop: 14,
  padding: 18,
};

const panelHeaderStyle = {
  alignItems: "flex-start",
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const panelTitleStyle = {
  margin: 0,
};

const mutedStyle = {
  color: "#94a3b8",
  fontSize: 13,
  margin: "6px 0 0",
};

const riskCountStyle = {
  alignItems: "center",
  color: "#cbd5e1",
  display: "inline-flex",
  gap: 8,
};

const stackedBarStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 999,
  display: "flex",
  height: 16,
  marginTop: 18,
  overflow: "hidden",
};

const stackSegmentStyle = {
  minWidth: 0,
  transition: "width 240ms ease",
};

const riskRowsStyle = {
  display: "grid",
  gap: 12,
  marginTop: 16,
};

const barRowStyle = {
  alignItems: "center",
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(118px, 160px) 1fr 48px",
};

const barLabelStyle = {
  alignItems: "center",
  display: "flex",
  gap: 8,
};

const categoryLabelStyle = {
  color: "#cbd5e1",
  fontWeight: 700,
};

const barTrackStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 999,
  height: 9,
  overflow: "hidden",
};

const barFillStyle = {
  borderRadius: 999,
  height: "100%",
  transition: "width 240ms ease",
};

const percentageStyle = {
  color: "#cbd5e1",
  fontSize: 13,
  textAlign: "right",
};

const recentGridStyle = {
  display: "grid",
  gap: 12,
  marginTop: 14,
};

const recentCardStyle = {
  alignItems: "center",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  padding: 14,
};

const recentTitleStyle = {
  margin: 0,
};

const recentBadgesStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "flex-end",
};

const comparisonGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  marginTop: 14,
};

const comparisonCardStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 14,
};

export default DashboardStats;

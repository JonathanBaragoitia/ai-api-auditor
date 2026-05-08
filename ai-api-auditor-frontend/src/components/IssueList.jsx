function IssueList({ issues, translate }) {
  const normalizedIssues = Array.isArray(issues) ? issues : [];

  if (normalizedIssues.length === 0) {
    return <p style={{ opacity: 0.6 }}>Sin problemas detectados</p>;
  }

  return (
    <div style={listStyle}>
      {normalizedIssues.map((issue, index) => (
        <article key={index} style={issueStyle}>
          {typeof issue === "string" ? (
            <p style={legacyTextStyle}>{translate(issue)}</p>
          ) : (
            <>
              <div style={headerStyle}>
                <strong>{translate(issue?.title)}</strong>
                <div style={tagGroupStyle}>
                  <span style={severityStyle(issue?.severity)}>{translateSeverity(issue?.severity)}</span>
                  <span style={categoryStyle}>{translateCategory(issue?.category)}</span>
                </div>
              </div>

              {issue?.evidence && (
                <p style={textStyle}><b>Evidencia:</b> {translate(issue.evidence)}</p>
              )}

              {issue?.recommendation && (
                <p style={textStyle}><b>Recomendación:</b> {translate(issue.recommendation)}</p>
              )}
            </>
          )}
        </article>
      ))}
    </div>
  );
}

const translateSeverity = (severity) => ({
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
})[severity] || "Media";

const translateCategory = (category) => ({
  security: "Seguridad",
  validation: "Validación",
  documentation: "Documentación",
  performance: "Rendimiento",
  rest_design: "Diseño REST",
  maintainability: "Mantenibilidad",
  observability: "Observabilidad",
})[category] || "General";

const severityStyle = (severity) => ({
  ...tagStyle,
  background: {
    low: "#064e3b",
    medium: "#78350f",
    high: "#7f1d1d",
    critical: "#4c0519",
  }[severity] || "#334155",
  color: "white",
});

const listStyle = {
  display: "grid",
  gap: 10,
};

const issueStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 12,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const tagGroupStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const tagStyle = {
  borderRadius: 999,
  fontSize: 12,
  padding: "4px 8px",
};

const categoryStyle = {
  ...tagStyle,
  background: "#1e293b",
  color: "#cbd5e1",
  border: "1px solid #334155",
};

const textStyle = {
  margin: "8px 0 0",
  color: "#cbd5e1",
  lineHeight: 1.45,
};

const legacyTextStyle = {
  margin: 0,
  color: "#cbd5e1",
};

export default IssueList;

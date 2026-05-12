import Badge from "./Badge";

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
                  <Badge type="severity" value={issue?.severity} />
                  <Badge type="category" value={issue?.category} />
                </div>
              </div>

              {issue?.evidence && (
                <p style={textStyle}><b>Evidencia:</b> {translate(issue.evidence)}</p>
              )}

              {Number(issue?.occurrences) > 1 && (
                <p style={compactMetaStyle}>{issue.occurrences} endpoints afectados</p>
              )}

              {Array.isArray(issue?.affected_endpoints) && issue.affected_endpoints.length > 0 && (
                <details style={endpointDetailsStyle}>
                  <summary style={endpointSummaryStyle}>Ver endpoints afectados</summary>
                  <div style={endpointGridStyle}>
                    {issue.affected_endpoints.map((endpoint, endpointIndex) => (
                      <span key={`${formatEndpoint(endpoint)}-${endpointIndex}`} style={endpointPillStyle}>
                        {formatEndpoint(endpoint)}
                      </span>
                    ))}
                  </div>
                </details>
              )}

              {issue?.recommendation && (
                <p style={textStyle}><b>Recomendación:</b> {translate(issue.recommendation)}</p>
              )}

              {issue?.fix_suggestion && (
                <details style={fixDetailsStyle}>
                  <summary style={fixSummaryStyle}>Sugerencias de corrección</summary>
                  <div style={fixCardStyle}>
                    <div style={headerStyle}>
                      <strong>{translate(issue.fix_suggestion.title)}</strong>
                      <span style={priorityStyle}>Prioridad {translate(issue.fix_suggestion.priority)}</span>
                    </div>
                    {issue.fix_suggestion.explanation && (
                      <p style={textStyle}>{translate(issue.fix_suggestion.explanation)}</p>
                    )}
                    {issue.fix_suggestion.openapi_example && (
                      <CodeExample title="Ejemplo OpenAPI" value={issue.fix_suggestion.openapi_example} />
                    )}
                    {issue.fix_suggestion.error_response_example && (
                      <CodeExample title="Ejemplo de error" value={issue.fix_suggestion.error_response_example} />
                    )}
                  </div>
                </details>
              )}
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function CodeExample({ title, value }) {
  return (
    <div style={codeBlockWrapperStyle}>
      <p style={codeTitleStyle}>{title}</p>
      <pre style={codeBlockStyle}><code>{formatCodeValue(value)}</code></pre>
    </div>
  );
}

function formatCodeValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function formatEndpoint(endpoint) {
  if (typeof endpoint === "string") return endpoint;
  return [endpoint?.method, endpoint?.path].filter(Boolean).join(" ") || "Endpoint afectado";
}

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

const textStyle = {
  margin: "8px 0 0",
  color: "#cbd5e1",
  lineHeight: 1.45,
};

const compactMetaStyle = {
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 700,
  margin: "8px 0 0",
};

const endpointDetailsStyle = {
  marginTop: 10,
};

const endpointSummaryStyle = {
  color: "#bfdbfe",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const endpointGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
};

const endpointPillStyle = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 999,
  color: "#cbd5e1",
  fontSize: 12,
  padding: "5px 8px",
};

const legacyTextStyle = {
  margin: 0,
  color: "#cbd5e1",
};

const fixDetailsStyle = {
  marginTop: 10,
};

const fixSummaryStyle = {
  color: "#bfdbfe",
  cursor: "pointer",
  fontWeight: 700,
};

const fixCardStyle = {
  background: "rgba(30, 41, 59, 0.72)",
  border: "1px solid #334155",
  borderRadius: 10,
  marginTop: 10,
  padding: 12,
};

const priorityStyle = {
  background: "#312e81",
  border: "1px solid #4f46e5",
  borderRadius: 999,
  color: "#c7d2fe",
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 8px",
};

const codeBlockWrapperStyle = {
  marginTop: 10,
};

const codeTitleStyle = {
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 700,
  margin: "0 0 6px",
};

const codeBlockStyle = {
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: 10,
  color: "#e2e8f0",
  margin: 0,
  overflowX: "auto",
  padding: 12,
  whiteSpace: "pre-wrap",
};

export default IssueList;

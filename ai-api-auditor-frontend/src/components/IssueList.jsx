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

const legacyTextStyle = {
  margin: 0,
  color: "#cbd5e1",
};

export default IssueList;

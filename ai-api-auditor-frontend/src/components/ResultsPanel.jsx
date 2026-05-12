import AIObservationCards from "./AIObservationCards";
import Badge from "./Badge";
import EmptyState from "./EmptyState";
import IssueList from "./IssueList";
import RecommendationList from "./RecommendationList";
import { formatCompactNumber, formatScoreValue } from "../utils/display";

function ResultsPanel({
  result,
  sectionStyle,
  cardStyle,
  rowStyle,
  getFriendlyEndpointName,
  getColor,
  getRiskLabel,
  translate,
}) {
  const endpoints = Array.isArray(result?.endpoints) ? result.endpoints : null;
  const isFailed = result?.status === "failed";

  return (
    <>
      <div style={headingRowStyle}>
        <h2 style={sectionStyle}>Endpoints analizados</h2>
        <Badge type="status" value={result?.status} />
      </div>

      {typeof result?.analysis_time_ms === "number" && (
        <p style={mutedTextStyle}>Tiempo de análisis: {formatCompactNumber(result.analysis_time_ms / 1000)} s</p>
      )}

      {isFailed && (
        <div style={errorCardStyle} role="alert">
          <strong>Auditoría fallida</strong>
          <p>{translate(result?.error_message) || "No se pudo completar la auditoría."}</p>
        </div>
      )}

      {!endpoints ? (
        <EmptyState
          title="Todavía no hay resultados"
          description="Los endpoints analizados aparecerán aquí cuando completes una auditoría."
          action="Pega una especificación OpenAPI y lanza tu primer análisis."
        />
      ) : (
        endpoints.map((ep, i) => {
          const issues = Array.isArray(ep?.issues) ? ep.issues : [];
          const recommendations = Array.isArray(ep?.recommendations) ? ep.recommendations : [];

          return (
            <div key={i} style={cardStyle}>
              <div style={rowStyle}>
                <h3>{getFriendlyEndpointName(ep?.path)}</h3>
                <span style={{ color: getColor(ep?.risk_level) }}>{getRiskLabel(ep?.risk_level)}</span>
              </div>

              <p><b>Resumen:</b> {translate(ep?.summary)}</p>
              <p><b>Puntuación:</b> {formatScoreValue(ep?.score)}/100</p>

              <AIObservationCards item={ep} translate={translate} />

              <h4>Problemas</h4>
              <IssueList issues={issues} translate={translate} />

              <h4>Recomendaciones</h4>
              <RecommendationList recommendations={recommendations} translate={translate} />
            </div>
          );
        })
      )}
    </>
  );
}

const headingRowStyle = {
  alignItems: "center",
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
};

const mutedTextStyle = {
  color: "#94a3b8",
  marginTop: 8,
};

const errorCardStyle = {
  background: "rgba(127, 29, 29, 0.22)",
  border: "1px solid rgba(248, 113, 113, 0.45)",
  borderRadius: 14,
  color: "#fecaca",
  marginTop: 14,
  padding: 16,
};

export default ResultsPanel;

import AIObservationCards from "./AIObservationCards";
import IssueList from "./IssueList";

function AuditDetailModal({
  audit,
  onClose,
  cardStyle,
  rowStyle,
  translate,
  getColor,
  getRiskLabel,
  getFriendlyEndpointName,
}) {
  if (!audit) {
    return null;
  }

  const issues = Array.isArray(audit?.issues) ? audit.issues : [];
  const recommendations = Array.isArray(audit?.recommendations) ? audit.recommendations : [];
  const endpoints = Array.isArray(audit?.endpoints) ? audit.endpoints : [];

  return (
    <div style={cardStyle}>
      <div style={rowStyle}>
        <h3>Detalle de auditoría</h3>
        <span style={{ color: getColor(audit?.risk_level) }}>{getRiskLabel(audit?.risk_level)}</span>
      </div>

      <button onClick={onClose}>Cerrar</button>

      <p><b>Nombre:</b> {translate(audit?.name)}</p>
      <p><b>Fecha:</b> {audit?.created_at}</p>
      <p><b>Puntuación:</b> {audit?.score}</p>
      <p><b>Riesgo:</b> {getRiskLabel(audit?.risk_level)}</p>

      <AIObservationCards item={audit} translate={translate} />

      {audit?.total_endpoints !== null && audit?.total_endpoints !== undefined && (
        <>
          <h4>Métricas OpenAPI</h4>
          <p><b>Total endpoints:</b> {audit.total_endpoints}</p>
          <p><b>Puntuación media:</b> {audit?.average_score ?? "-"}</p>
          <p><b>Riesgo global:</b> {getRiskLabel(audit?.global_risk_level)}</p>
        </>
      )}

      <h4>Problemas</h4>
      <IssueList issues={issues} translate={translate} />

      <h4>Recomendaciones</h4>
      {recommendations.length > 0 ? (
        <ul>
          {recommendations.map((x, i) => (
            <li key={i}>{translate(x)}</li>
          ))}
        </ul>
      ) : (
        <p style={{ opacity: 0.6 }}>Sin recomendaciones</p>
      )}

      {endpoints.length > 0 && (
        <>
          <h4>Endpoints analizados</h4>
          {endpoints.map((endpoint, index) => {
            const endpointIssues = Array.isArray(endpoint?.issues) ? endpoint.issues : [];
            const endpointRecommendations = Array.isArray(endpoint?.recommendations)
              ? endpoint.recommendations
              : [];

            return (
              <div key={`${endpoint?.path}-${index}`} style={cardStyle}>
                <div style={rowStyle}>
                  <h3>{getFriendlyEndpointName(endpoint?.path)}</h3>
                  <span style={{ color: getColor(endpoint?.risk_level) }}>
                    {getRiskLabel(endpoint?.risk_level)}
                  </span>
                </div>

                <p><b>Puntuación:</b> {endpoint?.score}</p>

                <AIObservationCards item={endpoint} translate={translate} compact />

                <h4>Problemas</h4>
                <IssueList issues={endpointIssues} translate={translate} />

                <h4>Recomendaciones</h4>
                {endpointRecommendations.length > 0 ? (
                  <ul>
                    {endpointRecommendations.map((x, i) => (
                      <li key={i}>{translate(x)}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ opacity: 0.6 }}>Sin recomendaciones</p>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default AuditDetailModal;

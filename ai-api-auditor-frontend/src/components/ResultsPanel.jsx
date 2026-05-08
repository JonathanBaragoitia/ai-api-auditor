import AIObservationCards from "./AIObservationCards";
import IssueList from "./IssueList";

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

  return (
    <>
      <h2 style={sectionStyle}>Endpoints analizados</h2>

      {!endpoints ? (
        <p>No hay datos disponibles</p>
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
              <p><b>Puntuación:</b> {ep?.score}</p>

              <AIObservationCards item={ep} translate={translate} />

              <h4>Problemas</h4>
              <IssueList issues={issues} translate={translate} />

              <h4>Recomendaciones</h4>
              {recommendations.length > 0 ? (
                <ul>
                  {recommendations.map((x, j) => (
                    <li key={j}>{translate(x)}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ opacity: 0.6 }}>Sin recomendaciones</p>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

export default ResultsPanel;

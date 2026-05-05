function HistoryList({
  history,
  sectionStyle,
  cardStyle,
  rowStyle,
  translate,
  getColor,
  getRiskLabel,
  getFriendlyEndpointName,
}) {
  const historyItems = Array.isArray(history) ? history : [];

  return (
    <>
      <h2 style={sectionStyle}>Historial</h2>

      {historyItems.length === 0 ? (
        <p>Sin historial</p>
      ) : (
        historyItems.map((a) => {
          const issues = Array.isArray(a?.issues) ? a.issues : [];
          const recommendations = Array.isArray(a?.recommendations) ? a.recommendations : [];

          return (
            <div key={a?.id} style={cardStyle}>
              <div style={rowStyle}>
                <h3>{translate(a?.name)}</h3>
                <span style={{ color: getColor(a?.risk_level) }}>{getRiskLabel(a?.risk_level)}</span>
              </div>

              <p><b>{getFriendlyEndpointName(a?.path)}</b></p>
              <p>Puntuación: {a?.score}</p>

              <h4>Problemas</h4>
              {issues.length > 0 ? (
                <ul>
                  {issues.map((x, i) => (
                    <li key={i}>{translate(x)}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ opacity: 0.6 }}>Sin problemas detectados</p>
              )}

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
            </div>
          );
        })
      )}
    </>
  );
}

export default HistoryList;

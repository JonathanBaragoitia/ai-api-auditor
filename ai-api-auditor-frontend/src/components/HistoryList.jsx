import { useState } from "react";

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
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const historyItems = Array.isArray(history) ? history : [];
  const normalizedSearch = search.trim().toLowerCase();

  const filteredHistory = historyItems.filter((audit) => {
    const matchesRisk = riskFilter === "all" || audit?.risk_level === riskFilter;
    const searchableText = [
      audit?.name,
      audit?.path,
      getFriendlyEndpointName(audit?.path),
      audit?.method,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

    return matchesRisk && matchesSearch;
  });

  return (
    <>
      <h2 style={sectionStyle}>Historial</h2>

      {historyItems.length > 0 && (
        <>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="low">Bajo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>

          <input
            type="text"
            placeholder="Buscar por nombre o ruta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </>
      )}

      {historyItems.length === 0 ? (
        <p>Sin historial</p>
      ) : filteredHistory.length === 0 ? (
        <p>No hay auditorías que coincidan con los filtros.</p>
      ) : (
        filteredHistory.map((a) => {
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

              <button onClick={() => setSelectedAudit(a)}>Ver detalle</button>

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

      {selectedAudit && (
        <div style={cardStyle}>
          <div style={rowStyle}>
            <h3>Detalle de auditoría</h3>
            <span style={{ color: getColor(selectedAudit?.risk_level) }}>
              {getRiskLabel(selectedAudit?.risk_level)}
            </span>
          </div>

          <p><b>Nombre:</b> {translate(selectedAudit?.name)}</p>
          <p><b>Fecha:</b> {selectedAudit?.created_at}</p>
          <p><b>Puntuación:</b> {selectedAudit?.score}</p>
          <p><b>Riesgo:</b> {getRiskLabel(selectedAudit?.risk_level)}</p>

          {Array.isArray(selectedAudit?.endpoints) && selectedAudit.endpoints.length > 0 && (
            <>
              <h4>Endpoints analizados</h4>
              {selectedAudit.endpoints.map((endpoint, index) => {
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

                    <h4>Problemas</h4>
                    {endpointIssues.length > 0 ? (
                      <ul>
                        {endpointIssues.map((x, i) => (
                          <li key={i}>{translate(x)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ opacity: 0.6 }}>Sin problemas detectados</p>
                    )}

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
      )}
    </>
  );
}

export default HistoryList;

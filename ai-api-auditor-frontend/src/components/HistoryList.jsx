import { useState } from "react";

import AuditDetailModal from "./AuditDetailModal";

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
  const [minScore, setMinScore] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const historyItems = Array.isArray(history) ? history : [];
  const normalizedSearch = search.trim().toLowerCase();
  const parsedMinScore = minScore === "" ? null : Number(minScore);

  const filteredHistory = historyItems
    .filter((audit) => {
      const matchesRisk = riskFilter === "all" || audit?.risk_level === riskFilter;
      const endpointText = Array.isArray(audit?.endpoints)
        ? audit.endpoints.map((endpoint) => `${endpoint?.path || ""} ${getFriendlyEndpointName(endpoint?.path)}`).join(" ")
        : "";
      const searchableText = [
        audit?.name,
        audit?.path,
        getFriendlyEndpointName(audit?.path),
        audit?.method,
        endpointText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const score = typeof audit?.score === "number" ? audit.score : 0;
      const matchesMinScore = parsedMinScore === null || Number.isNaN(parsedMinScore) || score >= parsedMinScore;

      return matchesRisk && matchesSearch && matchesMinScore;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") {
        return (b?.score || 0) - (a?.score || 0);
      }

      if (sortBy === "score_asc") {
        return (a?.score || 0) - (b?.score || 0);
      }

      return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
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
            placeholder="Buscar por nombre, ruta o endpoint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            placeholder="Puntuación mínima"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Más recientes primero</option>
            <option value="score_desc">Mayor puntuación</option>
            <option value="score_asc">Menor puntuación</option>
          </select>
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

      <AuditDetailModal
        audit={selectedAudit}
        onClose={() => setSelectedAudit(null)}
        cardStyle={cardStyle}
        rowStyle={rowStyle}
        translate={translate}
        getColor={getColor}
        getRiskLabel={getRiskLabel}
        getFriendlyEndpointName={getFriendlyEndpointName}
      />
    </>
  );
}

export default HistoryList;

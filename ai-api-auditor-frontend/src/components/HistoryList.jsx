import { useState } from "react";

import AIObservationCards from "./AIObservationCards";
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
  const parsedMinScore = Number(minScore || 0);

  const clearFilters = () => {
    setRiskFilter("all");
    setSearch("");
    setMinScore("");
    setSortBy("recent");
  };

  const filteredHistory = historyItems
    .filter((audit) => {
      const matchesRisk = riskFilter === "all" || audit?.risk_level === riskFilter;
      const endpointText = Array.isArray(audit?.endpoints)
        ? audit.endpoints
            .map((endpoint) => [
              endpoint?.path,
              getFriendlyEndpointName(endpoint?.path),
              endpoint?.summary,
              endpoint?.technical_observation,
              endpoint?.security_observation,
              endpoint?.maintainability_observation,
              ...(Array.isArray(endpoint?.issues) ? endpoint.issues : []),
              ...(Array.isArray(endpoint?.recommendations) ? endpoint.recommendations : []),
            ].filter(Boolean).join(" "))
            .join(" ")
        : "";
      const searchableText = [
        audit?.name,
        audit?.path,
        getFriendlyEndpointName(audit?.path),
        audit?.method,
        audit?.summary,
        audit?.technical_observation,
        audit?.security_observation,
        audit?.maintainability_observation,
        ...(Array.isArray(audit?.issues) ? audit.issues : []),
        ...(Array.isArray(audit?.recommendations) ? audit.recommendations : []),
        endpointText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const score = typeof audit?.score === "number" ? audit.score : 0;
      const matchesMinScore = Number.isNaN(parsedMinScore) || score >= parsedMinScore;

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
        <div style={filtersBar}>
          <div style={searchGroup}>
            <label style={label}>Buscar</label>
            <input
              type="text"
              placeholder="Buscar auditoría, endpoint o recomendación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterGroup}>
            <label style={label}>Riesgo</label>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={selectStyle}>
              <option value="all">Todos</option>
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
            </select>
          </div>

          <div style={filterGroup}>
            <label style={label}>Puntuación mínima: {minScore || 0}</label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={minScore || 0}
              onChange={(e) => setMinScore(e.target.value)}
              style={rangeStyle}
            />
          </div>

          <div style={filterGroup}>
            <label style={label}>Ordenar</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
              <option value="recent">Más recientes primero</option>
              <option value="score_desc">Mayor puntuación</option>
              <option value="score_asc">Menor puntuación</option>
            </select>
          </div>

          <button onClick={clearFilters} style={clearButton}>
            Limpiar filtros
          </button>
        </div>
      )}

      {historyItems.length > 0 && (
        <p style={counterStyle}>Mostrando {filteredHistory.length} auditorías</p>
      )}

      {historyItems.length === 0 ? (
        <p>Sin historial</p>
      ) : filteredHistory.length === 0 ? (
        <div style={emptyState}>
          <p style={emptyIcon}>⌕</p>
          <p>No hay auditorías que coincidan con los filtros actuales.</p>
        </div>
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

              <AIObservationCards item={a} translate={translate} compact />

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

const filtersBar = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  alignItems: "end",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 16,
  marginTop: 16,
};

const searchGroup = {
  flex: "2 1 280px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const filterGroup = {
  flex: "1 1 180px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const label = {
  fontSize: 13,
  color: "#cbd5e1",
};

const inputStyle = {
  padding: 11,
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: 10,
};

const selectStyle = {
  padding: 11,
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: 10,
};

const rangeStyle = {
  width: "100%",
  accentColor: "#6366f1",
};

const clearButton = {
  padding: 11,
  background: "#334155",
  color: "white",
  border: "1px solid #475569",
  borderRadius: 10,
  cursor: "pointer",
};

const counterStyle = {
  color: "#cbd5e1",
  marginTop: 12,
};

const emptyState = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 24,
  marginTop: 16,
  textAlign: "center",
  color: "#cbd5e1",
};

const emptyIcon = {
  fontSize: 34,
  margin: 0,
};

export default HistoryList;

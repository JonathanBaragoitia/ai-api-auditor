import { useState } from "react";

import AIObservationCards from "./AIObservationCards";
import Badge from "./Badge";
import EmptyState from "./EmptyState";
import IssueList from "./IssueList";
import RecommendationList from "./RecommendationList";
import { getAuditModeLabel, normalizeDisplayScore } from "../utils/display";
import { dedupeRecommendations, getRecommendationText } from "../utils/recommendations";

const tabs = ["Resumen", "Notas internas", "Endpoints", "Problemas", "Recomendaciones", "JSON técnico"];
const availableTags = ["producción", "crítica", "revisar", "cliente", "demo"];

function AuditDetailModal({
  audit,
  onClose,
  cardStyle,
  translate,
  getRiskLabel,
  getFriendlyEndpointName,
  onUpdateMetadata,
  onMetadataSaved,
}) {
  const [activeTab, setActiveTab] = useState("Resumen");
  const [notes, setNotes] = useState(audit?.notes || "");
  const [tags, setTags] = useState(Array.isArray(audit?.tags) ? audit.tags : []);
  const [saveState, setSaveState] = useState({ loading: false, message: null, error: null });

  if (!audit) {
    return null;
  }

  const issues = Array.isArray(audit?.issues) ? audit.issues : [];
  const endpoints = Array.isArray(audit?.endpoints) ? audit.endpoints : [];
  const recommendations = collectAllRecommendations(audit, endpoints);
  const auditType = audit?.method === "OPENAPI" ? "Auditoría OpenAPI" : "Auditoría manual";
  const score = normalizeDisplayScore(audit?.average_score ?? audit?.score);
  const riskLevel = audit?.global_risk_level || audit?.risk_level;
  const endpointCount = audit?.total_endpoints ?? (endpoints.length || "-");

  const toggleTag = (tag) => {
    setTags((currentTags) => (
      currentTags.includes(tag)
        ? currentTags.filter((item) => item !== tag)
        : [...currentTags, tag]
    ));
  };

  const saveMetadata = async () => {
    if (!onUpdateMetadata || !audit?.id) return;
    setSaveState({ loading: true, message: null, error: null });
    try {
      const updatedAudit = await onUpdateMetadata(audit.id, { notes, tags });
      setNotes(updatedAudit?.notes || "");
      setTags(Array.isArray(updatedAudit?.tags) ? updatedAudit.tags : []);
      onMetadataSaved?.(updatedAudit);
      setSaveState({ loading: false, message: "Notas guardadas", error: null });
    } catch (err) {
      setSaveState({ loading: false, message: null, error: err.message || "No se pudieron guardar las notas" });
    }
  };

  return (
    <section style={{ ...cardStyle, ...detailShellStyle }}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>{auditType}</p>
          <h2 style={titleStyle}>{translate(audit?.name)}</h2>
          {audit?.created_at && <p style={mutedTextStyle}>Fecha: {formatDate(audit.created_at)}</p>}
        </div>

        <div style={scorePanelStyle}>
          <span style={scoreStyle}>{score}</span>
          <Badge type="status" value={audit?.status} />
          <Badge type="risk" value={riskLevel} />
        </div>
      </div>

      <div style={metaGridStyle}>
        <Metric label="Endpoint" value={getFriendlyEndpointName(audit?.path)} />
        <Metric label="Método" value={audit?.method || "-"} />
        <Metric label="Modo" value={getAuditModeLabel(audit?.audit_mode)} />
        <Metric label="Endpoints analizados" value={endpointCount} />
        <Metric label="Riesgo global" value={getRiskLabel(riskLevel)} />
      </div>

      <div style={actionsStyle}>
        <div style={tabsStyle}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab ? activeTabStyle : tabStyle}
            >
              {tab}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={closeButtonStyle}>Cerrar</button>
      </div>

      {activeTab === "Resumen" && (
        <div style={tabPanelStyle}>
          {audit?.error_message && (
            <div style={errorCardStyle} role="alert">
              <strong>Auditoría fallida</strong>
              <p>{translate(audit.error_message)}</p>
            </div>
          )}
          <div style={metaGridStyle}>
            <Metric label="Auditoría" value={translate(audit?.name)} />
            <Metric label="Tipo" value={auditType} />
            <Metric label="Modo" value={getAuditModeLabel(audit?.audit_mode)} />
            <Metric label="Score normalizado" value={`${score}/100`} />
            <Metric label="Endpoints" value={endpointCount} />
          </div>
          <AIObservationCards item={audit} translate={translate} />
        </div>
      )}

      {activeTab === "Notas internas" && (
        <div style={tabPanelStyle}>
          <h3 style={sectionTitleStyle}>Notas internas</h3>
          <p style={mutedTextStyle}>Organiza esta auditoría con contexto privado para tu equipo.</p>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Añade notas internas, próximos pasos o contexto del cliente..."
            style={notesTextareaStyle}
          />
          <h4>Etiquetas</h4>
          <div style={tagGridStyle}>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={tags.includes(tag) ? selectedTagButtonStyle : tagButtonStyle}
              >
                {tag}
              </button>
            ))}
          </div>
          <button onClick={saveMetadata} disabled={saveState.loading || !onUpdateMetadata} style={saveButtonStyle}>
            {saveState.loading ? "Guardando..." : "Guardar notas"}
          </button>
          {saveState.message && <p style={successTextStyle}>{saveState.message}</p>}
          {saveState.error && <p style={errorTextStyle}>{saveState.error}</p>}
        </div>
      )}

      {activeTab === "Endpoints" && (
        <div style={tabPanelStyle}>
          {endpoints.length === 0 ? (
            <EmptyState
              compact
              title="Sin endpoints analizados"
              description="Esta auditoría no tiene endpoints disponibles para revisar."
              action="Ejecuta un análisis OpenAPI para ver detalles endpoint por endpoint."
            />
          ) : (
            endpoints.map((endpoint, index) => (
              <details key={`${endpoint?.path}-${index}`} style={accordionStyle}>
                <summary style={summaryStyle}>
                  <span><b>{endpoint?.method}</b> {getFriendlyEndpointName(endpoint?.path)}</span>
                  <span style={summaryMetaStyle}>
                    Score {normalizeDisplayScore(endpoint?.score)}/100 · <Badge type="risk" value={endpoint?.risk_level} />
                  </span>
                </summary>

                <p style={mutedTextStyle}><b>Path:</b> {endpoint?.path}</p>
                {endpoint?.summary && <p style={mutedTextStyle}><b>Resumen:</b> {translate(endpoint.summary)}</p>}
                <AIObservationCards item={endpoint} translate={translate} compact />
                <h4>Problemas</h4>
                <IssueList issues={Array.isArray(endpoint?.issues) ? endpoint.issues : []} translate={translate} />
                <h4>Recomendaciones</h4>
                <RecommendationList recommendations={collectRecommendations(endpoint)} translate={translate} />
              </details>
            ))
          )}
        </div>
      )}

      {activeTab === "Problemas" && (
        <div style={tabPanelStyle}>
          <IssueList issues={issues} translate={translate} />
        </div>
      )}

      {activeTab === "Recomendaciones" && (
        <div style={tabPanelStyle}>
          <RecommendationList recommendations={recommendations} translate={translate} />
        </div>
      )}

      {activeTab === "JSON técnico" && (
        <pre style={jsonStyle}>{JSON.stringify(audit, null, 2)}</pre>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function collectRecommendations(item) {
  const directRecommendations = Array.isArray(item?.recommendations)
    ? item.recommendations.filter((recommendation) => getRecommendationText(recommendation))
    : [];
  const issueRecommendations = Array.isArray(item?.issues)
    ? item.issues.map((issue) => issue?.recommendation).filter(Boolean)
    : [];

  return dedupeRecommendations([...directRecommendations, ...issueRecommendations]);
}

function collectAllRecommendations(audit, endpoints) {
  const auditRecommendations = collectRecommendations(audit);
  if (auditRecommendations.length > 0) {
    return auditRecommendations;
  }

  const endpointRecommendations = endpoints.flatMap((endpoint) => collectRecommendations(endpoint));

  return dedupeRecommendations(endpointRecommendations);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-ES");
}

const detailShellStyle = {
  display: "grid",
  gap: 18,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const eyebrowStyle = {
  margin: 0,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: 12,
};

const titleStyle = {
  margin: "4px 0",
};

const mutedTextStyle = {
  color: "#94a3b8",
  margin: 0,
};

const sectionTitleStyle = {
  margin: 0,
};

const notesTextareaStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  color: "white",
  minHeight: 130,
  marginTop: 12,
  padding: 12,
  resize: "vertical",
  width: "100%",
};

const tagGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const tagButtonStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 999,
  color: "#cbd5e1",
  cursor: "pointer",
  padding: "8px 11px",
};

const selectedTagButtonStyle = {
  ...tagButtonStyle,
  background: "#312e81",
  borderColor: "#818cf8",
  color: "#e0e7ff",
};

const saveButtonStyle = {
  background: "#6366f1",
  border: "none",
  borderRadius: 10,
  color: "white",
  cursor: "pointer",
  marginTop: 16,
  padding: "11px 14px",
};

const successTextStyle = {
  color: "#86efac",
  marginBottom: 0,
};

const errorTextStyle = {
  color: "#fecaca",
  marginBottom: 0,
};

const errorCardStyle = {
  background: "rgba(127, 29, 29, 0.22)",
  border: "1px solid rgba(248, 113, 113, 0.45)",
  borderRadius: 14,
  color: "#fecaca",
  padding: 16,
};

const scorePanelStyle = {
  display: "grid",
  justifyItems: "end",
  gap: 6,
};

const scoreStyle = {
  fontSize: 44,
  lineHeight: 1,
  fontWeight: 800,
};

const metaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const metricStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 12,
};

const metricLabelStyle = {
  display: "block",
  color: "#94a3b8",
  fontSize: 12,
  marginBottom: 5,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const tabsStyle = {
  display: "flex",
  flexWrap: "nowrap",
  gap: 8,
  maxWidth: "100%",
  overflowX: "auto",
  paddingBottom: 4,
};

const tabStyle = {
  background: "#0f172a",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: 999,
  padding: "8px 12px",
  cursor: "pointer",
};

const activeTabStyle = {
  ...tabStyle,
  background: "#2563eb",
  color: "white",
  border: "1px solid #60a5fa",
};

const closeButtonStyle = {
  ...tabStyle,
  background: "#334155",
};

const tabPanelStyle = {
  display: "grid",
  gap: 12,
};

const accordionStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 12,
};

const summaryStyle = {
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const summaryMetaStyle = {
  alignItems: "center",
  color: "#94a3b8",
  display: "inline-flex",
  gap: 8,
};

const jsonStyle = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 14,
  color: "#cbd5e1",
  overflowX: "auto",
  maxHeight: 520,
};

export default AuditDetailModal;

import { useEffect, useState } from "react";

const loadingSteps = [
  "Validando OpenAPI...",
  "Extrayendo endpoints...",
  "Analizando riesgos con IA...",
  "Generando informe...",
];

const auditModes = [
  {
    value: "security",
    title: "Seguridad",
    description: "Autenticación, autorización, datos expuestos y rate limiting.",
  },
  {
    value: "rest_design",
    title: "Diseño REST",
    description: "Endpoints, métodos HTTP, códigos de estado, paginación y consistencia.",
  },
  {
    value: "documentation",
    title: "Documentación",
    description: "Summaries, descriptions, schemas, examples y responses.",
  },
  {
    value: "enterprise",
    title: "Enterprise",
    description: "Seguridad, mantenibilidad, observabilidad, escalabilidad y consistencia.",
  },
];

function AuditForm({
  input,
  onInputChange,
  auditMode = "enterprise",
  onAuditModeChange,
  onAnalyze,
  loading,
  error,
  success,
  analysisTimeMs,
  onRetry,
  canRetry,
  textareaStyle,
  buttonStyle,
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const resetTimer = setTimeout(() => setStepIndex(0), 0);
    const interval = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 1200);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [loading]);

  return (
    <>
      <style>{"@keyframes audit-spin { to { transform: rotate(360deg); } }"}</style>
      <section style={modePanelStyle} aria-label="Modo de auditoría">
        <div style={modeHeaderStyle}>
          <h2 style={modeTitleStyle}>Modo de auditoría</h2>
          <p style={modeHintStyle}>Elige el enfoque principal antes de analizar la API.</p>
        </div>

        <div style={modeGridStyle}>
          {auditModes.map((mode) => {
            const selected = auditMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => onAuditModeChange?.(mode.value)}
                disabled={loading}
                aria-label={mode.title}
                aria-pressed={selected}
                style={{ ...modeCardStyle, ...(selected ? selectedModeCardStyle : {}) }}
              >
                <strong>{mode.title}</strong>
                <span>{mode.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <textarea
        placeholder="Pega tu OpenAPI JSON aquí..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        style={textareaStyle}
      />

      <button
        onClick={onAnalyze}
        disabled={loading}
        style={{ ...buttonStyle, ...(loading ? disabledButtonStyle : {}) }}
      >
        {loading ? (
          <span style={buttonContentStyle}>
            <span aria-hidden="true" style={spinnerStyle} />
            Analizando API
          </span>
        ) : "Analizar API"}
      </button>

      {loading && (
        <div style={loadingBoxStyle}>
          <div style={loadingHeaderStyle}>
            <span aria-label="Procesando auditoría" role="status" style={largeSpinnerStyle} />
            <div>
              <p style={loadingTitleStyle}>{loadingSteps[stepIndex]}</p>
              <p style={loadingHintStyle}>Esto puede tardar unos segundos si Ollama está generando el informe.</p>
            </div>
          </div>
          <div style={progressTrackStyle}>
            <div style={{ ...progressBarStyle, width: `${((stepIndex + 1) / loadingSteps.length) * 100}%` }} />
          </div>
        </div>
      )}
      {error && (
        <div style={errorCardStyle} role="alert">
          <strong>No se pudo completar la auditoría</strong>
          <p style={messageTextStyle}>{error}</p>
          {analysisTimeMs !== null && <p style={messageMetaStyle}>Tiempo de análisis: {formatDuration(analysisTimeMs)}</p>}
          {canRetry && (
            <button onClick={onRetry} disabled={loading} style={retryButtonStyle}>
              Reintentar auditoría
            </button>
          )}
        </div>
      )}
      {success && (
        <div style={successCardStyle} role="status">
          <strong>{success}</strong>
          {analysisTimeMs !== null && <p style={messageMetaStyle}>Tiempo de análisis: {formatDuration(analysisTimeMs)}</p>}
        </div>
      )}
    </>
  );
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

const loadingBoxStyle = {
  background: "linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))",
  border: "1px solid #3b82f6",
  borderRadius: 12,
  marginTop: 14,
  padding: 14,
  boxShadow: "0 14px 40px rgba(15, 23, 42, 0.35)",
};

const modePanelStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  marginTop: 20,
  padding: 16,
};

const modeHeaderStyle = {
  marginBottom: 12,
};

const modeTitleStyle = {
  fontSize: 18,
  margin: 0,
};

const modeHintStyle = {
  color: "#94a3b8",
  fontSize: 13,
  margin: "6px 0 0",
};

const modeGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
};

const modeCardStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  color: "#e2e8f0",
  cursor: "pointer",
  display: "grid",
  gap: 6,
  padding: 13,
  textAlign: "left",
  transition: "border-color 160ms ease, transform 160ms ease, background 160ms ease",
};

const selectedModeCardStyle = {
  background: "linear-gradient(135deg, rgba(79, 70, 229, 0.35), rgba(14, 165, 233, 0.18))",
  borderColor: "#818cf8",
  transform: "translateY(-1px)",
};

const loadingHeaderStyle = {
  alignItems: "center",
  display: "flex",
  gap: 12,
  marginBottom: 12,
};

const loadingTitleStyle = {
  fontWeight: 700,
  margin: 0,
};

const progressTrackStyle = {
  background: "#0f172a",
  borderRadius: 999,
  height: 8,
  overflow: "hidden",
};

const progressBarStyle = {
  background: "#6366f1",
  height: "100%",
  transition: "width 300ms ease",
};

const loadingHintStyle = {
  color: "#94a3b8",
  fontSize: 13,
  margin: "4px 0 0",
};

const buttonContentStyle = {
  alignItems: "center",
  display: "inline-flex",
  gap: 8,
  justifyContent: "center",
};

const disabledButtonStyle = {
  cursor: "not-allowed",
  opacity: 0.75,
};

const spinnerBaseStyle = {
  animation: "audit-spin 900ms linear infinite",
  border: "2px solid rgba(255, 255, 255, 0.28)",
  borderTopColor: "#ffffff",
  borderRadius: "50%",
  display: "inline-block",
};

const spinnerStyle = {
  ...spinnerBaseStyle,
  height: 14,
  width: 14,
};

const largeSpinnerStyle = {
  ...spinnerBaseStyle,
  borderColor: "rgba(96, 165, 250, 0.25)",
  borderTopColor: "#60a5fa",
  height: 28,
  width: 28,
};

const errorCardStyle = {
  background: "rgba(127, 29, 29, 0.22)",
  border: "1px solid rgba(248, 113, 113, 0.45)",
  borderRadius: 14,
  color: "#fecaca",
  marginTop: 14,
  padding: 16,
};

const successCardStyle = {
  background: "rgba(6, 78, 59, 0.32)",
  border: "1px solid rgba(52, 211, 153, 0.42)",
  borderRadius: 14,
  color: "#bbf7d0",
  marginTop: 14,
  padding: 16,
};

const messageTextStyle = {
  margin: "8px 0 0",
};

const messageMetaStyle = {
  color: "#cbd5e1",
  fontSize: 13,
  margin: "8px 0 0",
};

const retryButtonStyle = {
  background: "rgba(248, 113, 113, 0.14)",
  border: "1px solid rgba(248, 113, 113, 0.5)",
  borderRadius: 10,
  color: "#fecaca",
  cursor: "pointer",
  marginTop: 12,
  padding: "10px 12px",
};

export default AuditForm;

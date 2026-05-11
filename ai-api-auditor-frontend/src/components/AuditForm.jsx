import { useEffect, useState } from "react";

const loadingSteps = [
  "Validando OpenAPI...",
  "Extrayendo endpoints...",
  "Analizando riesgos con IA...",
  "Generando informe...",
];

function AuditForm({
  input,
  onInputChange,
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

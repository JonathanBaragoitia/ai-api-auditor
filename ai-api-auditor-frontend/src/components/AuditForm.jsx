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
      <textarea
        placeholder="Pega tu OpenAPI JSON aquí..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        style={textareaStyle}
      />

      <button onClick={onAnalyze} style={buttonStyle}>
        {loading ? "Analizando..." : "Analizar API"}
      </button>

      {loading && (
        <div style={loadingBoxStyle}>
          <p style={loadingTitleStyle}>{loadingSteps[stepIndex]}</p>
          <div style={progressTrackStyle}>
            <div style={{ ...progressBarStyle, width: `${((stepIndex + 1) / loadingSteps.length) * 100}%` }} />
          </div>
          <p style={loadingHintStyle}>Esto puede tardar unos segundos si Ollama está generando el informe.</p>
        </div>
      )}
      {error && <p>{error}</p>}
      {success && <p>{success}</p>}
    </>
  );
}

const loadingBoxStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 12,
  marginTop: 14,
  padding: 14,
};

const loadingTitleStyle = {
  fontWeight: 700,
  margin: "0 0 10px",
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
  margin: "10px 0 0",
};

export default AuditForm;

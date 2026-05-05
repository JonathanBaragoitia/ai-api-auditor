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
  return (
    <>
      <textarea
        placeholder="Pega tu OpenAPI JSON aquí..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        style={textareaStyle}
      />

      <button onClick={onAnalyze} style={buttonStyle}>
        {loading ? "Analizando..." : "🚀 Analizar API"}
      </button>

      {loading && <p>Analizando...</p>}
      {error && <p>{error}</p>}
      {success && <p>{success}</p>}
    </>
  );
}

export default AuditForm;

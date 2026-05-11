import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../utils/api";
import { openPrintableAuditReport } from "../utils/report";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function useAudits(token, onLogout) {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastInput, setLastInput] = useState("");
  const [lastAuditMode, setLastAuditMode] = useState("enterprise");
  const [analysisTimeMs, setAnalysisTimeMs] = useState(null);

  const clearAuditState = useCallback(() => {
    setResult(null);
    setHistory([]);
    setError(null);
    setSuccess(null);
    setLastInput("");
    setLastAuditMode("enterprise");
    setAnalysisTimeMs(null);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await apiFetch(`${API_BASE_URL}/audits/`, {}, token, onLogout);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  }, [token, onLogout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadHistory]);

  const analyzeOpenAPI = async (input, auditMode = "enterprise") => {
    const startedAt = performance.now();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    setLastInput(input);
    setLastAuditMode(auditMode);
    setAnalysisTimeMs(null);

    try {
      const parsed = JSON.parse(input);

      const data = await apiFetch(
        `${API_BASE_URL}/audits/openapi`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "Frontend Audit",
            openapi_schema: parsed,
            audit_mode: auditMode,
          }),
        },
        token,
        onLogout,
      );

      const elapsedMs = Math.round(performance.now() - startedAt);
      setAnalysisTimeMs(elapsedMs);
      setResult({ ...data, analysis_time_ms: elapsedMs });
      setSuccess("Análisis completado correctamente");
      loadHistory();
    } catch (err) {
      console.error(err);
      const message = err.message || "Error al analizar la API";
      const backendError = err.details?.detail?.error;
      const elapsedMs = Math.round(performance.now() - startedAt);
      setAnalysisTimeMs(elapsedMs);
      setError(message);
      setResult({
        id: backendError?.audit_id,
        name: "Frontend Audit",
        status: backendError?.status || "failed",
        error_message: message,
        audit_mode: auditMode,
        total_endpoints: 0,
        average_score: 0,
        global_risk_level: "high",
        endpoints: [],
        analysis_time_ms: elapsedMs,
      });
      loadHistory();
    } finally {
      setLoading(false);
    }
  };

  const retryLastAudit = () => {
    if (lastInput && !loading) {
      analyzeOpenAPI(lastInput, lastAuditMode);
    }
  };

  const exportResult = () => {
    if (!result) {
      return;
    }

    const jsonContent = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "auditoria-api.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPdfReport = () => {
    if (!result) {
      return;
    }

    openPrintableAuditReport(result);
  };

  return {
    result,
    history,
    auditLoading: loading,
    auditError: error,
    auditSuccess: success,
    analysisTimeMs,
    analyzeOpenAPI,
    retryLastAudit,
    exportResult,
    exportPdfReport,
    clearAuditState,
  };
}

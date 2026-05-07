import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../utils/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function useAudits(token, onLogout) {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const clearAuditState = useCallback(() => {
    setResult(null);
    setHistory([]);
    setError(null);
    setSuccess(null);
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

  const analyzeOpenAPI = async (input) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const parsed = JSON.parse(input);

      const data = await apiFetch(
        `${API_BASE_URL}/audits/openapi`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "Frontend Audit",
            openapi_schema: parsed,
          }),
        },
        token,
        onLogout,
      );

      setResult(data);
      setSuccess("Análisis completado correctamente");
      loadHistory();
    } catch (err) {
      console.error(err);
      setError("Error al analizar la API");
    } finally {
      setLoading(false);
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

  return {
    result,
    history,
    auditLoading: loading,
    auditError: error,
    auditSuccess: success,
    analyzeOpenAPI,
    exportResult,
    clearAuditState,
  };
}

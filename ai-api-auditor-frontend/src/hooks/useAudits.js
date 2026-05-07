import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";

import { apiFetch } from "../utils/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const getRiskLabel = (risk) => {
  if (risk === "low") return "Bajo";
  if (risk === "medium") return "Medio";
  if (risk === "high") return "Alto";
  return risk || "-";
};

const getFriendlyEndpointName = (path) => {
  if (!path) return "Endpoint";

  if (path === "/users") return "Usuarios";

  const clean = path
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("{"))
    .pop();

  if (!clean) return "Endpoint";

  const normalized = clean.replace(/[-_]/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

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

  const exportPdfReport = () => {
    if (!result) {
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 18;

    const addText = (text, options = {}) => {
      const { fontSize = 11, fontStyle = "normal", spacing = 7 } = options;
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);

      const lines = doc.splitTextToSize(String(text || "-"), maxWidth);

      if (y + lines.length * spacing > 280) {
        doc.addPage();
        y = 18;
      }

      doc.text(lines, margin, y);
      y += lines.length * spacing;
    };

    const endpoints = Array.isArray(result?.endpoints) ? result.endpoints : [];

    addText("Informe de auditoría de API", { fontSize: 18, fontStyle: "bold", spacing: 9 });
    addText(`Fecha de generación: ${new Date().toLocaleString()}`);
    addText(`Total de endpoints: ${result?.total_endpoints ?? "-"}`);
    addText(`Puntuación media: ${result?.average_score ?? "-"}`);
    addText(`Riesgo global: ${getRiskLabel(result?.global_risk_level)}`);
    y += 4;

    addText("Endpoints analizados", { fontSize: 14, fontStyle: "bold", spacing: 9 });

    endpoints.forEach((endpoint, index) => {
      const issues = Array.isArray(endpoint?.issues) ? endpoint.issues : [];
      const recommendations = Array.isArray(endpoint?.recommendations) ? endpoint.recommendations : [];

      addText(`${index + 1}. ${getFriendlyEndpointName(endpoint?.path)}`, { fontStyle: "bold" });
      addText(`Puntuación: ${endpoint?.score ?? "-"}`);
      addText(`Riesgo: ${getRiskLabel(endpoint?.risk_level)}`);
      addText(`Problemas: ${issues.length > 0 ? issues.join("; ") : "Sin problemas detectados"}`);
      addText(`Recomendaciones: ${recommendations.length > 0 ? recommendations.join("; ") : "Sin recomendaciones"}`);
      y += 3;
    });

    doc.save("informe-auditoria-api.pdf");
  };

  return {
    result,
    history,
    auditLoading: loading,
    auditError: error,
    auditSuccess: success,
    analyzeOpenAPI,
    exportResult,
    exportPdfReport,
    clearAuditState,
  };
}

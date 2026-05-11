import { getCategoryLabel, getRiskLabel, getSeverityLabel, normalizeDisplayScore } from "./display";

export function buildAuditReportHtml(audit) {
  const endpoints = Array.isArray(audit?.endpoints) ? audit.endpoints : [];
  const issues = collectIssues(audit, endpoints);
  const recommendations = collectRecommendations(audit, endpoints);
  const score = normalizeDisplayScore(audit?.average_score ?? audit?.score);
  const risk = getRiskLabel(audit?.global_risk_level || audit?.risk_level);
  const generatedAt = new Date().toLocaleString("es-ES");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe de auditoría - ${escapeHtml(audit?.name || "API")}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; line-height: 1.5; }
    main { max-width: 1040px; margin: 0 auto; padding: 40px 32px; }
    .cover { background: white; border: 1px solid #e2e8f0; border-radius: 18px; padding: 36px; margin-bottom: 24px; }
    .eyebrow { color: #2563eb; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    h1 { font-size: 34px; margin: 8px 0 12px; }
    h2 { border-bottom: 2px solid #e2e8f0; margin-top: 32px; padding-bottom: 8px; }
    h3 { margin-bottom: 8px; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 22px; }
    .metric, .card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
    .label { color: #64748b; display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
    .value { font-size: 24px; font-weight: 800; }
    .risk { border-radius: 999px; display: inline-block; font-weight: 700; padding: 6px 10px; background: #fee2e2; color: #991b1b; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-size: 12px; text-transform: uppercase; }
    .issue { margin-bottom: 12px; }
    .pill { border-radius: 999px; display: inline-block; font-size: 12px; font-weight: 700; margin-right: 6px; padding: 4px 8px; background: #e0f2fe; color: #075985; }
    .recommendation { background: #f8fafc; border-left: 4px solid #2563eb; margin-bottom: 10px; padding: 10px 12px; }
    pre { background: #0f172a; border-radius: 12px; color: #e2e8f0; overflow-x: auto; padding: 16px; white-space: pre-wrap; }
    details { background: white; border: 1px solid #e2e8f0; border-radius: 14px; margin-top: 12px; padding: 14px; }
    summary { cursor: pointer; font-weight: 700; }
    @media print { body { background: white; } main { padding: 0; } .cover, .card, .metric, details { break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <div class="eyebrow">Informe técnico de auditoría API</div>
      <h1>${escapeHtml(audit?.name || "Auditoría sin nombre")}</h1>
      <p>Generado el ${escapeHtml(generatedAt)}</p>
      <div class="grid">
        <div class="metric"><span class="label">Score global</span><span class="value">${escapeHtml(score)}/100</span></div>
        <div class="metric"><span class="label">Nivel de riesgo</span><span class="risk">${escapeHtml(risk)}</span></div>
        <div class="metric"><span class="label">Endpoints analizados</span><span class="value">${escapeHtml(audit?.total_endpoints ?? endpoints.length ?? "-")}</span></div>
        <div class="metric"><span class="label">Estado</span><span class="value">${escapeHtml(audit?.status || "completed")}</span></div>
      </div>
    </section>

    <section class="card">
      <h2>Resumen ejecutivo</h2>
      <p>${escapeHtml(audit?.summary || "No hay resumen ejecutivo disponible.")}</p>
      ${observationBlock("Observación técnica", audit?.technical_observation)}
      ${observationBlock("Observación de seguridad", audit?.security_observation)}
      ${observationBlock("Observación de mantenibilidad", audit?.maintainability_observation)}
    </section>

    <section class="card">
      <h2>Endpoints analizados</h2>
      ${endpointTable(endpoints)}
    </section>

    <section class="card">
      <h2>Problemas detectados</h2>
      ${issues.length > 0 ? issues.map(issueBlock).join("") : "<p>Sin problemas detectados.</p>"}
    </section>

    <section class="card">
      <h2>Recomendaciones</h2>
      ${recommendations.length > 0 ? recommendations.map((item) => `<div class="recommendation">${escapeHtml(item)}</div>`).join("") : "<p>Sin recomendaciones.</p>"}
    </section>

    <details>
      <summary>JSON técnico</summary>
      <pre>${escapeHtml(JSON.stringify(audit, null, 2))}</pre>
    </details>
  </main>
</body>
</html>`;
}

export function openPrintableAuditReport(audit) {
  const reportWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!reportWindow) {
    return false;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildAuditReportHtml(audit));
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  return true;
}

function observationBlock(title, value) {
  if (!value) return "";
  return `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(value)}</p>`;
}

function endpointTable(endpoints) {
  if (endpoints.length === 0) {
    return "<p>No hay endpoints analizados.</p>";
  }

  return `<table><thead><tr><th>Método</th><th>Path</th><th>Score</th><th>Riesgo</th><th>Resumen</th></tr></thead><tbody>${endpoints
    .map((endpoint) => `<tr><td>${escapeHtml(endpoint?.method || "-")}</td><td>${escapeHtml(endpoint?.path || "-")}</td><td>${escapeHtml(normalizeDisplayScore(endpoint?.score))}/100</td><td>${escapeHtml(getRiskLabel(endpoint?.risk_level))}</td><td>${escapeHtml(endpoint?.summary || "-")}</td></tr>`)
    .join("")}</tbody></table>`;
}

function issueBlock(issue) {
  if (typeof issue === "string") {
    return `<div class="issue"><strong>${escapeHtml(issue)}</strong></div>`;
  }

  return `<div class="issue">
    <h3>${escapeHtml(issue?.title || "Problema detectado")}</h3>
    <span class="pill">${escapeHtml(getSeverityLabel(issue?.severity))}</span>
    <span class="pill">${escapeHtml(getCategoryLabel(issue?.category))}</span>
    <p><strong>Evidencia:</strong> ${escapeHtml(issue?.evidence || "-")}</p>
    <p><strong>Recomendación:</strong> ${escapeHtml(issue?.recommendation || "-")}</p>
  </div>`;
}

function collectIssues(audit, endpoints) {
  return [
    ...(Array.isArray(audit?.issues) ? audit.issues : []),
    ...endpoints.flatMap((endpoint) => (Array.isArray(endpoint?.issues) ? endpoint.issues : [])),
  ];
}

function collectRecommendations(audit, endpoints) {
  const direct = [
    ...(Array.isArray(audit?.recommendations) ? audit.recommendations : []),
    ...endpoints.flatMap((endpoint) => (Array.isArray(endpoint?.recommendations) ? endpoint.recommendations : [])),
  ].map(recommendationToText).filter(Boolean);
  const issueRecommendations = collectIssues(audit, endpoints)
    .map((issue) => (typeof issue === "object" ? issue?.recommendation : null))
    .filter(Boolean);

  return [...new Set([...direct, ...issueRecommendations])];
}

function recommendationToText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.recommendation || value.title || value.description || "";
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

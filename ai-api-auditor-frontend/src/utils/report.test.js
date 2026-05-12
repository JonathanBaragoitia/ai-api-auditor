import { describe, expect, it } from "vitest";

import { buildAuditExport, buildAuditReportHtml, buildAuditReportMarkdown, buildAuditReportText } from "./report";

const audit = {
  name: "Auditoría usuarios",
  average_score: 8.4,
  global_risk_level: "high",
  total_endpoints: 1,
  status: "completed",
  audit_mode: "security",
  created_at: "2026-05-11T09:00:00",
  summary: "Resumen ejecutivo.",
  technical_observation: "Observación técnica.",
  security_observation: "Observación de seguridad.",
  maintainability_observation: "Observación de mantenibilidad.",
  recommendations: ["Mejorar documentación."],
  endpoints: [
    {
      method: "GET",
      path: "/users",
      score: 8,
      risk_level: "medium",
      summary: "Lista usuarios.",
      issues: [
        {
          title: "Falta autenticación",
          severity: "high",
          category: "security",
          evidence: "GET /users expone datos.",
          recommendation: "Añadir JWT.",
        },
      ],
      recommendations: ["Añadir paginación."],
    },
  ],
};

describe("buildAuditReportHtml", () => {
  it("genera un informe técnico con portada, endpoints, issues, recomendaciones y JSON", () => {
    const html = buildAuditReportHtml(audit);

    expect(html).toContain("Informe técnico de auditoría API");
    expect(html).toContain("Auditoría usuarios");
    expect(html).toContain("84/100");
    expect(html).toContain("Seguridad");
    expect(html).toContain("Endpoints analizados");
    expect(html).toContain("GET");
    expect(html).toContain("/users");
    expect(html).toContain("Falta autenticación");
    expect(html).toContain("Alta");
    expect(html).toContain("Seguridad");
    expect(html).toContain("Mejorar documentación.");
    expect(html).toContain("JSON técnico");
  });

  it("genera informes Markdown y TXT con puntuación, riesgo e issues", () => {
    const markdown = buildAuditReportMarkdown(audit);
    const text = buildAuditReportText(audit);

    expect(markdown).toContain("# Informe de auditoría API: Auditoría usuarios");
    expect(markdown).toContain("**Puntuación global:** 84/100");
    expect(markdown).toContain("**Riesgo global:** Alto");
    expect(markdown).toContain("Falta autenticación");
    expect(markdown).toContain("Modo de auditoría:** Seguridad");

    expect(text).toContain("INFORME DE AUDITORIA API: Auditoría usuarios");
    expect(text).toContain("Puntuacion global: 84/100");
    expect(text).toContain("Riesgo global: Alto");
    expect(text).toContain("Falta autenticación");
    expect(text).toContain("Modo de auditoria: Seguridad");
  });

  it("prepara archivos exportables JSON, TXT y Markdown", () => {
    expect(buildAuditExport(audit, "json")).toMatchObject({ filename: "auditoria-api.json", type: "application/json" });
    expect(buildAuditExport(audit, "txt")).toMatchObject({ filename: "auditoria-api.txt", type: "text/plain;charset=utf-8" });
    expect(buildAuditExport(audit, "markdown")).toMatchObject({ filename: "auditoria-api.md", type: "text/markdown;charset=utf-8" });
  });
});

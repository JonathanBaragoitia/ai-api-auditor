import { describe, expect, it } from "vitest";

import { buildAuditReportHtml } from "./report";

describe("buildAuditReportHtml", () => {
  it("genera un informe técnico con portada, endpoints, issues, recomendaciones y JSON", () => {
    const html = buildAuditReportHtml({
      name: "Auditoría usuarios",
      average_score: 8.4,
      global_risk_level: "high",
      total_endpoints: 1,
      status: "completed",
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
    });

    expect(html).toContain("Informe técnico de auditoría API");
    expect(html).toContain("Auditoría usuarios");
    expect(html).toContain("84/100");
    expect(html).toContain("Endpoints analizados");
    expect(html).toContain("GET");
    expect(html).toContain("/users");
    expect(html).toContain("Falta autenticación");
    expect(html).toContain("Alta");
    expect(html).toContain("Seguridad");
    expect(html).toContain("Mejorar documentación.");
    expect(html).toContain("JSON técnico");
  });
});

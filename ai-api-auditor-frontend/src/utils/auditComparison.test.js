import { describe, expect, it } from "vitest";

import { compareAudits, compareEndpoints, compareIssues } from "./auditComparison";

describe("auditComparison", () => {
  it("detecta issues nuevos y solucionados", () => {
    const comparison = compareIssues(
      [
        { title: "Falta autenticación", severity: "high", category: "security" },
        { title: "Falta paginación", severity: "medium", category: "performance" },
        { title: "Falta paginación", severity: "medium", category: "performance" },
      ],
      [{ title: "Falta autenticación", severity: "high", category: "security" }, "Documentación incompleta"],
    );

    expect(comparison.newItems).toEqual(["Falta paginación (x2)"]);
    expect(comparison.resolvedItems).toEqual(["Documentación incompleta"]);
  });

  it("detecta endpoints mejorados y empeorados", () => {
    const comparison = compareEndpoints(
      [
        { method: "GET", path: "/users", score: 8, risk_level: "low" },
        { method: "POST", path: "/orders", score: 4, risk_level: "high" },
      ],
      [
        { method: "GET", path: "/users", score: 6, risk_level: "medium" },
        { method: "POST", path: "/orders", score: 7, risk_level: "medium" },
      ],
    );

    expect(comparison.improved[0]).toMatchObject({ label: "GET /users", formattedScoreDelta: "+20" });
    expect(comparison.worsened[0]).toMatchObject({ label: "POST /orders", formattedScoreDelta: "-30" });
  });

  it("calcula evolución completa entre auditorías", () => {
    const comparison = compareAudits(
      {
        average_score: 88.8,
        global_risk_level: "low",
        issues: [{ title: "Falta paginación", severity: "medium", category: "performance" }],
        recommendations: [{ recommendation: "Añadir paginación." }],
        endpoints: [{ method: "GET", path: "/users", score: 8, risk_level: "low" }],
      },
      {
        average_score: 80,
        global_risk_level: "medium",
        issues: [{ title: "Falta autenticación", severity: "high", category: "security" }],
        recommendations: [{ recommendation: "Añadir autenticación." }],
        endpoints: [{ method: "GET", path: "/users", score: 7, risk_level: "medium" }],
      },
    );

    expect(comparison.formattedScoreDelta).toBe("+8.8");
    expect(comparison.riskChangeLabel).toBe("Mejora: Medio -> Bajo");
    expect(comparison.issues.newItems).toEqual(["Falta paginación"]);
    expect(comparison.issues.resolvedItems).toEqual(["Falta autenticación"]);
    expect(comparison.recommendations.newItems).toEqual(["Añadir paginación."]);
    expect(comparison.endpoints.improved).toHaveLength(1);
  });

  it("etiqueta riesgo estable y empeoramientos", () => {
    expect(compareAudits(
      { average_score: 70, global_risk_level: "medium" },
      { average_score: 70, global_risk_level: "medium" },
    ).riskChangeLabel).toBe("Riesgo estable: Medio");

    expect(compareAudits(
      { average_score: 60, global_risk_level: "high" },
      { average_score: 70, global_risk_level: "low" },
    ).riskChangeLabel).toBe("Empeora: Bajo -> Alto");
  });
});

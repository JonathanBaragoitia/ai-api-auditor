import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import DashboardStats from "./DashboardStats";

afterEach(() => {
  cleanup();
});

describe("DashboardStats", () => {
  it("no rompe con historial vacío", () => {
    render(<DashboardStats history={[]} sectionStyle={{}} />);

    expect(screen.getByText("Resumen de auditorías")).toBeInTheDocument();
    expect(screen.getByText("Sin auditorías todavía")).toBeInTheDocument();
    expect(screen.getByText("Puntuación media")).toBeInTheDocument();
    expect(screen.getByText("Panel sin datos todavía")).toBeInTheDocument();
    expect(screen.getByText("Pega una especificación OpenAPI y lanza tu primer análisis.")).toBeInTheDocument();
    expect(screen.getByText("Comparación no disponible")).toBeInTheDocument();
    expect(screen.getByText("Necesitas al menos dos auditorías para comparar evolución.")).toBeInTheDocument();
  });

  it("normaliza score medio en escala 0-100", () => {
    render(<DashboardStats history={[{ score: 8, risk_level: "low" }, { score: 80, risk_level: "high" }]} sectionStyle={{}} />);

    expect(screen.getByText("80/100")).toBeInTheDocument();
  });

  it("muestra métricas ejecutivas con varias auditorías", () => {
    render(
      <DashboardStats
        history={[
          { id: 1, name: "Auditoría usuarios", score: 8, risk_level: "low", total_endpoints: 2, status: "completed" },
          { id: 2, name: "Auditoría pagos", average_score: 50, global_risk_level: "high", total_endpoints: 3, status: "failed" },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getByText("Auditorías")).toBeInTheDocument();
    expect(screen.getByText("Endpoints analizados")).toBeInTheDocument();
    expect(screen.getAllByText("Auditoría usuarios").length).toBeGreaterThan(0);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Comparación de evolución")).toBeInTheDocument();
  });

  it("formatea cambios de puntuación sin flotantes largos", () => {
    render(
      <DashboardStats
        history={[
          { id: 1, name: "Auditoría actual", average_score: 88.8, risk_level: "low", status: "completed" },
          { id: 2, name: "Auditoría previa", average_score: 80, risk_level: "medium", status: "completed" },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getByText("Cambio de puntuación")).toBeInTheDocument();
    expect(screen.getByText("Cambio de riesgo")).toBeInTheDocument();
    expect(screen.getByText("+8.8")).toBeInTheDocument();
    expect(screen.getByText("Mejora: Medio -> Bajo")).toBeInTheDocument();
    expect(screen.queryByText(/8\.799999/)).not.toBeInTheDocument();
  });

  it("muestra comparación profesional de issues y endpoints", () => {
    render(
      <DashboardStats
        history={[
          {
            id: 1,
            name: "Auditoría actual",
            average_score: 80,
            global_risk_level: "medium",
            status: "completed",
            issues: [
              { title: "Falta autenticación", severity: "high", category: "security" },
              { title: "Falta paginación", severity: "medium", category: "performance" },
            ],
            recommendations: [{ recommendation: "Añadir paginación." }],
            endpoints: [
              { method: "GET", path: "/users", score: 8, risk_level: "low" },
              { method: "POST", path: "/orders", score: 4, risk_level: "high" },
            ],
          },
          {
            id: 2,
            name: "Auditoría previa",
            average_score: 70,
            global_risk_level: "high",
            status: "completed",
            issues: [
              { title: "Falta autenticación", severity: "high", category: "security" },
              { title: "Documentación incompleta", severity: "medium", category: "documentation" },
            ],
            recommendations: [{ recommendation: "Añadir autenticación." }],
            endpoints: [
              { method: "GET", path: "/users", score: 6, risk_level: "medium" },
              { method: "POST", path: "/orders", score: 7, risk_level: "medium" },
            ],
          },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getAllByText("Problemas nuevos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Problemas solucionados").length).toBeGreaterThan(0);
    expect(screen.getByText("Falta paginación")).toBeInTheDocument();
    expect(screen.getByText("Documentación incompleta")).toBeInTheDocument();
    expect(screen.getByText(/GET \/users \(\+20, Mejora: Medio -> Bajo\)/)).toBeInTheDocument();
    expect(screen.getByText(/POST \/orders \(-30, Empeora: Medio -> Alto\)/)).toBeInTheDocument();
    expect(screen.getAllByText("+1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-1").length).toBeGreaterThan(0);
  });

  it("normaliza nombres legacy en tarjetas y comparación", () => {
    render(
      <DashboardStats
        history={[
          { id: 1, name: "Frontend Audit", average_score: 80, risk_level: "low", status: "completed" },
          { id: 2, name: "OpenAPI Audit", average_score: 70, risk_level: "medium", status: "completed" },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getAllByText("Auditoría API").length).toBeGreaterThan(0);
    expect(screen.queryByText("Frontend Audit")).not.toBeInTheDocument();
  });

  it("muestra distribución de riesgos por porcentaje", () => {
    render(
      <DashboardStats
        history={[
          { id: 1, name: "Baja", score: 9, risk_level: "low", status: "completed" },
          { id: 2, name: "Media", score: 6, risk_level: "medium", status: "completed" },
          { id: 3, name: "Alta", score: 3, risk_level: "high", status: "failed" },
          { id: 4, name: "Crítica", score: 1, risk_level: "critical", status: "failed" },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getByText("Distribución de riesgos")).toBeInTheDocument();
    expect(screen.getAllByText("25%")).toHaveLength(4);
    expect(screen.getByText("Riesgo más frecuente:")).toBeInTheDocument();
  });

  it("limita listas de comparación y muestra ver más", () => {
    render(
      <DashboardStats
        history={[
          {
            id: 1,
            name: "Auditoría actual",
            average_score: 80,
            risk_level: "medium",
            status: "completed",
            issues: [
              { title: "Problema A", severity: "medium", category: "security" },
              { title: "Problema B", severity: "medium", category: "security" },
              { title: "Problema C", severity: "medium", category: "security" },
              { title: "Problema D", severity: "medium", category: "security" },
            ],
          },
          {
            id: 2,
            name: "Auditoría previa",
            average_score: 80,
            risk_level: "medium",
            status: "completed",
            issues: [],
          },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getByText("Problema A")).toBeInTheDocument();
    expect(screen.getByText("Problema B")).toBeInTheDocument();
    expect(screen.getByText("Problema C")).toBeInTheDocument();
    expect(screen.queryByText("Problema D")).not.toBeInTheDocument();
    expect(screen.getByText("Ver más: 1 adicionales")).toBeInTheDocument();
    expect(screen.getByText("Riesgo estable: Medio")).toBeInTheDocument();
  });

  it("muestra top problemas detectados y últimas auditorías", () => {
    render(
      <DashboardStats
        history={[
          {
            id: 1,
            name: "Auditoría reciente",
            score: 7,
            risk_level: "medium",
            status: "processing",
            issues: [{ category: "security", title: "Falta autenticación" }],
          },
          {
            id: 2,
            name: "Auditoría anterior",
            score: 6,
            risk_level: "high",
            status: "failed",
            endpoints: [{ issues: [{ category: "validation", title: "Falta validación" }] }],
          },
          { id: 3, name: "Auditoría tercera", score: 8, risk_level: "low", status: "completed" },
          { id: 4, name: "Auditoría no visible", score: 8, risk_level: "low", status: "completed" },
        ]}
        sectionStyle={{}}
      />,
    );

    expect(screen.getByText("Principales problemas detectados")).toBeInTheDocument();
    expect(screen.getByText("Seguridad")).toBeInTheDocument();
    expect(screen.getByText("Validación")).toBeInTheDocument();
    expect(screen.getByText("Últimas auditorías")).toBeInTheDocument();
    expect(screen.getAllByText("Auditoría reciente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Auditoría anterior").length).toBeGreaterThan(0);
    expect(screen.getByText("Auditoría tercera")).toBeInTheDocument();
    expect(screen.queryByText("Auditoría no visible")).not.toBeInTheDocument();
  });
});

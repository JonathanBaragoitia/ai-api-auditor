import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import DashboardStats from "./DashboardStats";

afterEach(() => {
  cleanup();
});

describe("DashboardStats", () => {
  it("no rompe con historial vacío", () => {
    render(<DashboardStats history={[]} sectionStyle={{}} />);

    expect(screen.getByText("Dashboard ejecutivo")).toBeInTheDocument();
    expect(screen.getByText("Sin auditorías todavía")).toBeInTheDocument();
    expect(screen.getByText("Score medio")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay auditorías para mostrar.")).toBeInTheDocument();
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

    expect(screen.getByText("Top problemas detectados")).toBeInTheDocument();
    expect(screen.getByText("Seguridad")).toBeInTheDocument();
    expect(screen.getByText("Validación")).toBeInTheDocument();
    expect(screen.getByText("Últimas auditorías")).toBeInTheDocument();
    expect(screen.getAllByText("Auditoría reciente").length).toBeGreaterThan(0);
    expect(screen.getByText("Auditoría anterior")).toBeInTheDocument();
    expect(screen.getByText("Auditoría tercera")).toBeInTheDocument();
    expect(screen.queryByText("Auditoría no visible")).not.toBeInTheDocument();
  });
});

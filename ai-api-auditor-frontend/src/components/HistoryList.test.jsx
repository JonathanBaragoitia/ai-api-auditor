import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import HistoryList from "./HistoryList";

const helpers = {
  translate: (text) => text,
  getColor: () => "#22c55e",
  getRiskLabel: (risk) => ({ low: "Bajo", medium: "Medio", high: "Alto" })[risk] || risk,
  getFriendlyEndpointName: (path) => (path === "/users" ? "Usuarios" : path),
};

afterEach(() => {
  cleanup();
});

describe("HistoryList", () => {
  it("muestra estado vacío cuando no hay auditorías", () => {
    render(<HistoryList history={[]} {...helpers} />);

    expect(screen.getByText("Todavía no hay auditorías")).toBeInTheDocument();
    expect(screen.getByText("Pega una especificación OpenAPI y lanza tu primer análisis.")).toBeInTheDocument();
  });

  it("muestra auditorías y controles de filtrado", () => {
    render(
      <HistoryList
        history={[
          {
            id: 1,
            name: "Auditoría usuarios",
            path: "/users",
            method: "OPENAPI",
            score: 8.5,
            risk_level: "low",
            issues: [],
            recommendations: [],
            status: "failed",
            audit_mode: "security",
            tags: ["cliente", "demo"],
            error_message: "No se pudo completar la auditoría.",
            created_at: "2026-05-07T00:00:00",
          },
        ]}
        {...helpers}
      />,
    );

    expect(screen.getAllByText("Historial").length).toBeGreaterThan(0);
    expect(screen.getByText("Auditoría usuarios")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Modo: Seguridad")).toBeInTheDocument();
    expect(screen.getByText("cliente")).toBeInTheDocument();
    expect(screen.getByText("demo")).toBeInTheDocument();
    expect(screen.getByText("Fallida")).toBeInTheDocument();
    expect(screen.getByText("No se pudo completar la auditoría.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar auditoría, endpoint o recomendación...")).toBeInTheDocument();
    expect(screen.getByText("Puntuación mínima: 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeInTheDocument();
  });

  it("muestra auditorías completadas con badge de estado", () => {
    render(
      <HistoryList
        history={[
          {
            id: 2,
            name: "Auditoría completada",
            path: "/users",
            method: "OPENAPI",
            score: 9,
            risk_level: "low",
            issues: [],
            recommendations: [],
            status: "completed",
            created_at: "2026-05-07T00:00:00",
          },
        ]}
        {...helpers}
      />,
    );

    expect(screen.getByText("Auditoría completada")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.getByText("Modo: Enterprise")).toBeInTheDocument();
  });

  it("renderiza recomendaciones objeto sin crashear", () => {
    render(
      <HistoryList
        history={[
          {
            id: 3,
            name: "Auditoría con recomendaciones consolidadas",
            path: "/users",
            method: "OPENAPI",
            score: 7,
            risk_level: "medium",
            issues: [],
            recommendations: [
              {
                recommendation: "Añadir controles de autenticación.",
                occurrences: 2,
                affected_endpoints: ["GET /users", "POST /orders"],
              },
            ],
            status: "completed",
            created_at: "2026-05-07T00:00:00",
          },
        ]}
        {...helpers}
      />,
    );

    expect(screen.getByText("Añadir controles de autenticación.")).toBeInTheDocument();
    expect(screen.getByText("Detectado 2 veces")).toBeInTheDocument();
  });

  it("normaliza nombres legacy sin modificar nombres personalizados", () => {
    render(
      <HistoryList
        history={[
          {
            id: 4,
            name: "Frontend Audit",
            path: "/users",
            method: "OPENAPI",
            score: 8,
            risk_level: "low",
            issues: [],
            recommendations: [],
            status: "completed",
            created_at: "2026-05-07T00:00:00",
          },
          {
            id: 5,
            name: "Auditoría personalizada cliente A",
            path: "/orders",
            method: "OPENAPI",
            score: 7,
            risk_level: "medium",
            issues: [],
            recommendations: [],
            status: "completed",
            created_at: "2026-05-06T00:00:00",
          },
        ]}
        {...helpers}
      />,
    );

    expect(screen.getByText("Auditoría Frontend")).toBeInTheDocument();
    expect(screen.getByText("Auditoría personalizada cliente A")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Audit")).not.toBeInTheDocument();
  });
});

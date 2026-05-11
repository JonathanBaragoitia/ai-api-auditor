import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HistoryList from "./HistoryList";

const helpers = {
  translate: (text) => text,
  getColor: () => "#22c55e",
  getRiskLabel: (risk) => ({ low: "Bajo", medium: "Medio", high: "Alto" })[risk] || risk,
  getFriendlyEndpointName: (path) => (path === "/users" ? "Usuarios" : path),
};

describe("HistoryList", () => {
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
            error_message: "No se pudo completar la auditoría.",
            created_at: "2026-05-07T00:00:00",
          },
        ]}
        {...helpers}
      />,
    );

    expect(screen.getByText("Historial")).toBeInTheDocument();
    expect(screen.getByText("Auditoría usuarios")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Modo: Seguridad")).toBeInTheDocument();
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
});

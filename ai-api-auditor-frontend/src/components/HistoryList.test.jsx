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
            created_at: "2026-05-07T00:00:00",
          },
        ]}
        {...helpers}
      />,
    );

    expect(screen.getByText("Historial")).toBeInTheDocument();
    expect(screen.getByText("Auditoría usuarios")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar por nombre, ruta o endpoint...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Puntuación mínima")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeInTheDocument();
  });
});

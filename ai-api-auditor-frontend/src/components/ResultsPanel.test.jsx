import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ResultsPanel from "./ResultsPanel";

const helpers = {
  sectionStyle: {},
  cardStyle: { background: "#1e293b", color: "white" },
  rowStyle: { display: "flex" },
  getFriendlyEndpointName: (path) => path,
  getColor: () => "#22c55e",
  getRiskLabel: (risk) => risk,
  translate: (text) => text,
};

describe("ResultsPanel", () => {
  it("muestra estado vacío cuando no hay resultados", () => {
    render(<ResultsPanel {...helpers} result={{ status: "completed" }} />);

    expect(screen.getByText("Todavía no hay resultados")).toBeInTheDocument();
    expect(screen.getByText("Pega una especificación OpenAPI y lanza tu primer análisis.")).toBeInTheDocument();
  });

  it("renderiza recomendaciones objeto sin crashear", () => {
    render(
      <ResultsPanel
        {...helpers}
        result={{
          status: "completed",
          endpoints: [
            {
              method: "GET",
              path: "/users",
              score: 7,
              risk_level: "medium",
              issues: [],
              recommendations: [
                {
                  recommendation: "Añadir controles de autenticación.",
                  occurrences: 3,
                  affected_endpoints: ["GET /users"],
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Añadir controles de autenticación.")).toBeInTheDocument();
    expect(screen.getByText("Detectado 3 veces")).toBeInTheDocument();
  });
});

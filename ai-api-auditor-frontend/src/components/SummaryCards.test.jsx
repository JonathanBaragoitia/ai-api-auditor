import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SummaryCards from "./SummaryCards";

describe("SummaryCards", () => {
  it("muestra las métricas principales del resultado", () => {
    render(
      <SummaryCards
        result={{ total_endpoints: 3, average_score: 8.4, global_risk_level: "low" }}
        getRiskLabel={(risk) => ({ low: "Bajo", medium: "Medio", high: "Alto" })[risk]}
        getColor={() => "#22c55e"}
      />,
    );

    expect(screen.getByText("Endpoints")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Puntuación")).toBeInTheDocument();
    expect(screen.getByText("84/100")).toBeInTheDocument();
    expect(screen.getByText("Riesgo")).toBeInTheDocument();
    expect(screen.getByText("Bajo")).toBeInTheDocument();
  });
});

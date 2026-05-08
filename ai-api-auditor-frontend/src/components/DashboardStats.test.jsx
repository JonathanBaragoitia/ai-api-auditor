import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardStats from "./DashboardStats";

describe("DashboardStats", () => {
  it("no rompe con historial vacío", () => {
    render(<DashboardStats history={[]} sectionStyle={{}} />);

    expect(screen.getByText("Dashboard ejecutivo")).toBeInTheDocument();
    expect(screen.getByText("Sin auditorías todavía")).toBeInTheDocument();
    expect(screen.getByText("Score medio")).toBeInTheDocument();
  });

  it("normaliza score medio en escala 0-100", () => {
    render(<DashboardStats history={[{ score: 8, risk_level: "low" }, { score: 80, risk_level: "high" }]} sectionStyle={{}} />);

    expect(screen.getByText("80/100")).toBeInTheDocument();
  });
});

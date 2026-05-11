import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuditDetailModal from "./AuditDetailModal";

const helpers = {
  translate: (text) => text,
  getColor: () => "#22c55e",
  getRiskLabel: (risk) => ({ low: "Bajo", medium: "Medio", high: "Alto" })[risk] || risk,
  getFriendlyEndpointName: (path) => (path === "/users" ? "Usuarios" : path),
  cardStyle: { background: "#1e293b", color: "white" },
};

const audit = {
  id: 1,
  name: "Auditoría usuarios",
  method: "OPENAPI",
  path: "OpenAPI",
  score: 7.5,
  average_score: 7.5,
  risk_level: "medium",
  global_risk_level: "medium",
  created_at: "2026-05-07T00:00:00",
  audit_mode: "rest_design",
  summary: "Resumen ejecutivo de la auditoría.",
  technical_observation: "Observación técnica.",
  security_observation: "Observación de seguridad.",
  maintainability_observation: "Observación de mantenibilidad.",
  issues: [
    {
      title: "Falta autenticación",
      severity: "high",
      category: "security",
      evidence: "GET /users expone datos sin autenticación.",
      recommendation: "Añadir JWT u OAuth2.",
    },
  ],
  recommendations: ["Documentar controles de seguridad."],
  endpoints: [
    {
      method: "GET",
      path: "/users",
      score: 6,
      risk_level: "high",
      issues: ["Falta paginación"],
      recommendations: ["Añadir page y limit."],
    },
  ],
};

describe("AuditDetailModal", () => {
  it("muestra cabecera ejecutiva y tabs de detalle", () => {
    render(<AuditDetailModal audit={audit} onClose={vi.fn()} {...helpers} />);

    expect(screen.getAllByText("Auditoría usuarios").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Auditoría OpenAPI").length).toBeGreaterThan(0);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getAllByText("Diseño REST").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Endpoints" })).toBeInTheDocument();
    expect(screen.getByText("Resumen ejecutivo de la auditoría.")).toBeInTheDocument();
  });

  it("permite navegar a problemas, endpoints y JSON técnico", () => {
    render(<AuditDetailModal audit={audit} onClose={vi.fn()} {...helpers} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Problemas" })[0]);
    expect(screen.getByText("Falta autenticación")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("Seguridad")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Endpoints" })[0]);
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "JSON técnico" })[0]);
    expect(screen.getByText(/"name": "Auditoría usuarios"/)).toBeInTheDocument();
  });

  it("muestra Enterprise como modo por defecto en auditorías antiguas", () => {
    const legacyAudit = { ...audit };
    delete legacyAudit.audit_mode;

    render(<AuditDetailModal audit={legacyAudit} onClose={vi.fn()} {...helpers} />);

    expect(screen.getAllByText("Enterprise").length).toBeGreaterThan(0);
  });
});

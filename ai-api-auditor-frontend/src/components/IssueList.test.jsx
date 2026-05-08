import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IssueList from "./IssueList";

describe("IssueList", () => {
  it("muestra issue estructurado con severidad y categoría", () => {
    render(
      <IssueList
        translate={(text) => text}
        issues={[
          {
            title: "Falta autenticación",
            severity: "high",
            category: "security",
            evidence: "GET /users expone datos sin autenticación.",
            recommendation: "Añadir JWT u OAuth2.",
          },
        ]}
      />,
    );

    expect(screen.getByText("Falta autenticación")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("Seguridad")).toBeInTheDocument();
    expect(screen.getByText(/GET \/users expone datos/)).toBeInTheDocument();
    expect(screen.getByText(/Añadir JWT/)).toBeInTheDocument();
  });

  it("mantiene compatibilidad con issues antiguos como string", () => {
    render(<IssueList translate={(text) => text} issues={["Falta paginación"]} />);

    expect(screen.getByText("Falta paginación")).toBeInTheDocument();
  });
});

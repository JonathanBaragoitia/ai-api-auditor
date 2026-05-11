import { fireEvent, render, screen } from "@testing-library/react";
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

  it("muestra sugerencias de corrección con ejemplos técnicos", () => {
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
            fix_suggestion: {
              title: "Declarar esquema JWT",
              explanation: "Añade un securityScheme Bearer y referencia el esquema en la operación.",
              openapi_example: "components:\n  securitySchemes:\n    bearerAuth:\n      type: http",
              error_response_example: '{"detail":"Token inválido"}',
              priority: "alta",
            },
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText("Sugerencias de corrección"));

    expect(screen.getByText("Declarar esquema JWT")).toBeInTheDocument();
    expect(screen.getByText("Prioridad alta")).toBeInTheDocument();
    expect(screen.getByText("Ejemplo OpenAPI")).toBeInTheDocument();
    expect(screen.getByText(/bearerAuth/)).toBeInTheDocument();
    expect(screen.getByText("Ejemplo de error")).toBeInTheDocument();
    expect(screen.getByText(/Token inválido/)).toBeInTheDocument();
  });
});

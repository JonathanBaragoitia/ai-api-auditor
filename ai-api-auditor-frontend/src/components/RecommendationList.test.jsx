import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RecommendationList from "./RecommendationList";

describe("RecommendationList", () => {
  it("muestra estado vacío profesional cuando no hay recomendaciones", () => {
    render(<RecommendationList translate={(text) => text} recommendations={[]} />);

    expect(screen.getByText("Sin recomendaciones")).toBeInTheDocument();
    expect(screen.getByText("No hay acciones recomendadas para mostrar todavía.")).toBeInTheDocument();
  });

  it("muestra recomendaciones antiguas como string", () => {
    render(<RecommendationList translate={(text) => text} recommendations={["Añadir paginación."]} />);

    expect(screen.getByText("Añadir paginación.")).toBeInTheDocument();
  });

  it("muestra recomendaciones nuevas como objeto", () => {
    render(
      <RecommendationList
        translate={(text) => text}
        recommendations={[{ recommendation: "Añadir controles de autenticación.", occurrences: 2 }]}
      />,
    );

    expect(screen.getByText("Añadir controles de autenticación.")).toBeInTheDocument();
    expect(screen.getByText("Detectado 2 veces")).toBeInTheDocument();
  });

  it("muestra endpoints afectados sin renderizar objetos", () => {
    render(
      <RecommendationList
        translate={(text) => text}
        recommendations={[
          {
            recommendation: "Declarar esquema de seguridad.",
            occurrences: 2,
            affected_endpoints: ["GET /users", { method: "POST", path: "/orders" }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText("Ver endpoints afectados"));

    expect(screen.getByText("GET /users")).toBeInTheDocument();
    expect(screen.getByText("POST /orders")).toBeInTheDocument();
  });

  it("no crashea con datos incompletos", () => {
    render(
      <RecommendationList
        translate={(text) => text}
        recommendations={[{}, null, { title: "Revisar documentación." }]}
      />,
    );

    expect(screen.getByText("Revisar documentación.")).toBeInTheDocument();
  });
});

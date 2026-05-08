import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuditForm from "./AuditForm";

describe("AuditForm", () => {
  it("renderiza textarea y botón de análisis", () => {
    render(
      <AuditForm
        input=""
        onInputChange={vi.fn()}
        onAnalyze={vi.fn()}
        loading={false}
        error={null}
        success={null}
      />,
    );

    expect(screen.getByPlaceholderText("Pega tu OpenAPI JSON aquí...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizar API" })).toBeInTheDocument();
  });
});

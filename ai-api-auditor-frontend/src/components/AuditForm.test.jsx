import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AuditForm from "./AuditForm";

afterEach(() => {
  cleanup();
});

describe("AuditForm", () => {
  it("renderiza textarea y botón de análisis", () => {
    render(
      <AuditForm
        input=""
        onInputChange={vi.fn()}
        auditMode="enterprise"
        onAuditModeChange={vi.fn()}
        onAnalyze={vi.fn()}
        loading={false}
        error={null}
        success={null}
      />,
    );

    expect(screen.getByPlaceholderText("Pega tu OpenAPI JSON aquí...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizar API" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Seguridad/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Diseño REST/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Documentación/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enterprise/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("permite seleccionar el modo de auditoría", () => {
    const onAuditModeChange = vi.fn();

    render(
      <AuditForm
        input=""
        onInputChange={vi.fn()}
        auditMode="enterprise"
        onAuditModeChange={onAuditModeChange}
        onAnalyze={vi.fn()}
        loading={false}
        error={null}
        success={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Seguridad/i }));

    expect(onAuditModeChange).toHaveBeenCalledWith("security");
  });

  it("muestra loading moderno y deshabilita el botón durante el análisis", () => {
    render(
      <AuditForm
        input="{}"
        onInputChange={vi.fn()}
        onAnalyze={vi.fn()}
        loading
        error={null}
        success={null}
      />,
    );

    const button = screen.getByRole("button", { name: /Analizando API/i });

    expect(button).toBeDisabled();
    expect(screen.getByRole("status", { name: "Procesando auditoría" })).toBeInTheDocument();
    expect(screen.getByText("Validando OpenAPI...")).toBeInTheDocument();
  });

  it("muestra estado fallido y permite reintentar", () => {
    const onRetry = vi.fn();

    render(
      <AuditForm
        input="{}"
        onInputChange={vi.fn()}
        onAnalyze={vi.fn()}
        loading={false}
        error="No se pudo conectar con Ollama"
        success={null}
        analysisTimeMs={1234}
        onRetry={onRetry}
        canRetry
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar con Ollama");
    expect(screen.getByText("Tiempo de análisis: 1.2 s")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar auditoría" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("muestra estado completado con tiempo de análisis", () => {
    render(
      <AuditForm
        input="{}"
        onInputChange={vi.fn()}
        onAnalyze={vi.fn()}
        loading={false}
        error={null}
        success="Análisis completado correctamente"
        analysisTimeMs={2200}
      />,
    );

    expect(screen.getByText("Análisis completado correctamente")).toBeInTheDocument();
    expect(screen.getByText("Tiempo de análisis: 2.2 s")).toBeInTheDocument();
  });
});

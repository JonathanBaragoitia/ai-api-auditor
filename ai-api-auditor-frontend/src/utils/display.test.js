import { describe, expect, it } from "vitest";

import {
  formatCompactNumber,
  formatPercentage,
  formatScoreValue,
  formatSignedNumber,
  normalizeAuditName,
  normalizeDisplayScore,
} from "./display";

describe("normalizeDisplayScore", () => {
  it("convierte scores 0-10 a escala 0-100", () => {
    expect(normalizeDisplayScore(8)).toBe(80);
  });

  it("mantiene scores ya normalizados", () => {
    expect(normalizeDisplayScore(80)).toBe(80);
  });

  it("redondea a máximo un decimal", () => {
    expect(normalizeDisplayScore(8.567)).toBe(85.7);
  });

  it("formatea enteros sin decimal y decimales con máximo un decimal", () => {
    expect(formatCompactNumber(80)).toBe("80");
    expect(formatCompactNumber(80.25)).toBe("80.3");
    expect(formatScoreValue(8)).toBe("80");
  });

  it("evita flotantes largos en cambios de puntuación", () => {
    expect(formatSignedNumber(8.799999999999997)).toBe("+8.8");
    expect(formatSignedNumber(-3.1999999999999993)).toBe("-3.2");
  });

  it("formatea porcentajes de forma compacta", () => {
    expect(formatPercentage(25)).toBe("25%");
    expect(formatPercentage(33.3333333)).toBe("33.3%");
  });

  it("normaliza nombres legacy de auditoría sin alterar nombres personalizados", () => {
    expect(normalizeAuditName("Frontend Audit")).toBe("Auditoría Frontend");
    expect(normalizeAuditName("OpenAPI Audit")).toBe("Auditoría OpenAPI");
    expect(normalizeAuditName("API pagos producción")).toBe("API pagos producción");
  });
});

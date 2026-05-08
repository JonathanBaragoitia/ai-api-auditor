import { describe, expect, it } from "vitest";

import { normalizeDisplayScore } from "./display";

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
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAudits } from "./useAudits";

describe("useAudits", () => {
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("envía audit_mode al backend al analizar OpenAPI", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith("/audits/")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          id: 1,
          name: "Pagos API",
          total_endpoints: 1,
          average_score: 80,
          global_risk_level: "low",
          endpoints: [],
          status: "completed",
          audit_mode: "documentation",
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useAudits("token", vi.fn()));

    await act(async () => {
      await result.current.analyzeOpenAPI('{"openapi":"3.0.0","info":{"title":"Pagos API"},"paths":{}}', "documentation");
    });

    await waitFor(() => expect(result.current.result?.audit_mode).toBe("documentation"));

    const postCall = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/audits/openapi") && options.method === "POST");
    expect(JSON.parse(postCall[1].body).audit_mode).toBe("documentation");
    expect(JSON.parse(postCall[1].body).name).toBe("Pagos API");
    unmount();
  });

  it("exporta la auditoría en formato Markdown", async () => {
    const clickMock = vi.fn();
    const createObjectURL = vi.fn(() => "blob:auditoria");
    const revokeObjectURL = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = clickMock;
      }
      return element;
    });

    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith("/audits/")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          id: 1,
          name: "Auditoría usuarios",
          average_score: 84,
          global_risk_level: "high",
          endpoints: [],
          issues: [{ title: "Falta autenticación", category: "security", severity: "high" }],
          status: "completed",
          audit_mode: "security",
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useAudits("token", vi.fn()));

    await act(async () => {
      await result.current.analyzeOpenAPI('{"openapi":"3.0.0","paths":{}}', "security");
    });

    act(() => {
      result.current.exportAudit("markdown");
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:auditoria");
    unmount();
  });

  it("actualiza notas y etiquetas de una auditoría", async () => {
    let audits = [{ id: 1, name: "Auditoría usuarios" }];

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url.endsWith("/audits/")) {
        return new Response(JSON.stringify(audits), { status: 200 });
      }

      if (url.endsWith("/audits/1/metadata")) {
        audits = [{ ...audits[0], ...JSON.parse(options.body) }];
        return new Response(
          JSON.stringify(audits[0]),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useAudits("token", vi.fn()));

    await waitFor(() => expect(result.current.history).toHaveLength(1));

    let updatedAudit;
    await act(async () => {
      updatedAudit = await result.current.updateAuditMetadata(1, { notes: "Nota interna", tags: ["demo"] });
    });

    expect(updatedAudit.tags).toEqual(["demo"]);
    await waitFor(() => expect(result.current.history[0].notes).toBe("Nota interna"));
    const patchCall = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/audits/1/metadata") && options.method === "PATCH");
    expect(JSON.parse(patchCall[1].body)).toEqual({ notes: "Nota interna", tags: ["demo"] });
    unmount();
  });
});

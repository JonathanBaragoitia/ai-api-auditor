import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAudits } from "./useAudits";

describe("useAudits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("envía audit_mode al backend al analizar OpenAPI", async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url.endsWith("/audits/")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          id: 1,
          name: "Frontend Audit",
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

    const { result } = renderHook(() => useAudits("token", vi.fn()));

    await act(async () => {
      await result.current.analyzeOpenAPI('{"openapi":"3.0.0","paths":{}}', "documentation");
    });

    await waitFor(() => expect(result.current.result?.audit_mode).toBe("documentation"));

    const postCall = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/audits/openapi") && options.method === "POST");
    expect(JSON.parse(postCall[1].body).audit_mode).toBe("documentation");
  });
});

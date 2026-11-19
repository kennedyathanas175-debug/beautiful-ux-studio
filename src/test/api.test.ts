import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, errorMessage, ensureCsrf } from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("API client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    document.cookie = "csrftoken=test-token; path=/";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("builds query strings and sends credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ count: 1, results: [] }));
    globalThis.fetch = fetchMock;

    const result = await api.get("/innovations/", { q: "solar", category: ["energy", "ai"] });

    expect(result).toEqual({ count: 1, results: [] });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/innovations/?q=solar&category=energy%2Cai");
    expect(init.credentials).toBe("include");
  });

  it("adds the CSRF header to unsafe requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock;

    await api.post("/innovations/example/like/");

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("X-CSRFToken")).toBe("test-token");
  });

  it("normalises API validation errors", async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () =>
      jsonResponse(
        {
          error: {
            code: "validation_error",
            message: "Please check the submitted data.",
            fields: { title: ["This field is required."] },
          },
        },
        400,
      ),
    );

    await expect(api.post("/innovations/", {})).rejects.toMatchObject({
      status: 400,
      code: "validation_error",
      fields: { title: ["This field is required."] },
    });

    try {
      await api.post("/innovations/", {});
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(errorMessage(error)).toBe("Please check the submitted data.");
    }
  });

  it("returns a friendly message for network failures", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.get("/health/")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });

  it("fetches a CSRF cookie only once for concurrent calls", async () => {
    document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    const fetchMock = vi.fn().mockImplementation(async () => {
      document.cookie = "csrftoken=fresh; path=/";
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    globalThis.fetch = fetchMock;

    await Promise.all([ensureCsrf(), ensureCsrf()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/auth/csrf/");
  });
});

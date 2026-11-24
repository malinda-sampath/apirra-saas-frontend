import { describe, it, expect, vi } from "vitest";
import { fetchOpenApiSpec } from "./openApiService";
import { explorerApi } from "./explorerApi";

vi.mock("./explorerApi", () => ({
  explorerApi: { get: vi.fn() },
}));

describe("fetchOpenApiSpec", () => {
  it("GETs the given URL and returns the response body", async () => {
    const spec = { openapi: "3.0.0", paths: {} };
    vi.mocked(explorerApi.get).mockResolvedValueOnce({ data: spec });

    const result = await fetchOpenApiSpec("http://localhost:8081/v3/api-docs");

    expect(explorerApi.get).toHaveBeenCalledWith(
      "http://localhost:8081/v3/api-docs",
    );
    expect(result).toBe(spec);
  });

  it("propagates a rejection (e.g. CORS / network error) to the caller", async () => {
    vi.mocked(explorerApi.get).mockRejectedValueOnce(new Error("Network Error"));

    await expect(fetchOpenApiSpec("http://localhost:8081/v3/api-docs")).rejects.toThrow(
      "Network Error",
    );
  });
});

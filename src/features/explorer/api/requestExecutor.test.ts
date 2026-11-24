import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { executeRequest } from "./requestExecutor";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("executeRequest", () => {
  beforeEach(() => {
    mockedAxios.mockReset();
  });

  it("builds the full URL from baseUrl + path and returns a success envelope", async () => {
    mockedAxios.mockResolvedValueOnce({
      status: 200,
      data: { ok: true },
      headers: { "content-type": "application/json" },
    });

    const result = await executeRequest({
      baseUrl: "https://api.example.com",
      method: "get",
      path: "/users/1",
    });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/users/1",
        method: "get",
      }),
    );
    expect(result).toEqual({
      success: true,
      status: 200,
      data: { ok: true },
      headers: { "content-type": "application/json" },
    });
  });

  it("appends query params, skipping undefined/null values", async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, data: {}, headers: {} });

    await executeRequest({
      baseUrl: "https://api.example.com",
      method: "get",
      path: "/search",
      queryParams: { q: "shoes", page: "2", limit: undefined, cursor: null },
    });

    const callArg = mockedAxios.mock.calls[0][0] as unknown as { url: string };
    const calledUrl = new URL(callArg.url);
    expect(calledUrl.searchParams.get("q")).toBe("shoes");
    expect(calledUrl.searchParams.get("page")).toBe("2");
    expect(calledUrl.searchParams.has("limit")).toBe(false);
    expect(calledUrl.searchParams.has("cursor")).toBe(false);
  });

  it("passes the body and headers through to axios", async () => {
    mockedAxios.mockResolvedValueOnce({ status: 201, data: { id: 1 }, headers: {} });

    await executeRequest({
      baseUrl: "https://api.example.com",
      method: "post",
      path: "/users",
      headers: { "X-Test": "1" },
      body: { name: "Ada" },
    });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        headers: { "X-Test": "1" },
        data: { name: "Ada" },
      }),
    );
  });

  it("returns a failure envelope (not a rejection) when axios throws", async () => {
    mockedAxios.mockRejectedValueOnce({
      response: { status: 404, data: { error: "not found" } },
      message: "Request failed with status code 404",
    });

    const result = await executeRequest({
      baseUrl: "https://api.example.com",
      method: "delete",
      path: "/users/999",
    });

    expect(result).toEqual({
      success: false,
      status: 404,
      data: { error: "not found" },
      message: "Request failed with status code 404",
    });
  });

  it("handles a network-level error with no response object (e.g. CORS)", async () => {
    mockedAxios.mockRejectedValueOnce({ message: "Network Error" });

    const result = await executeRequest({
      baseUrl: "https://api.example.com",
      method: "get",
      path: "/whoami",
    });

    expect(result).toEqual({
      success: false,
      status: undefined,
      data: undefined,
      message: "Network Error",
    });
  });
});

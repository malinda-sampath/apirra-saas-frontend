// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";
import { fetchOpenApiSpec } from "../../features/explorer/api/openApiService";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../../features/explorer/api/openApiService", () => ({
  fetchOpenApiSpec: vi.fn(),
}));

const renderHomePage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe("HomePage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(fetchOpenApiSpec).mockReset();
  });

  it("disables the load button until a URL is entered", async () => {
    const user = userEvent.setup();
    renderHomePage();

    const button = screen.getByRole("button", { name: /load api explorer/i });
    expect(button).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText("http://localhost:8081/v3/api-docs"),
      "http://localhost:8081/v3/api-docs",
    );

    expect(button).toBeEnabled();
  });

  it("fetches the spec, parses it, and navigates to /explorer on success", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchOpenApiSpec).mockResolvedValueOnce({
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      paths: { "/ping": { get: { responses: {} } } },
    });

    renderHomePage();
    await user.type(
      screen.getByPlaceholderText("http://localhost:8081/v3/api-docs"),
      "http://localhost:8081/v3/api-docs",
    );
    await user.click(screen.getByRole("button", { name: /load api explorer/i }));

    expect(fetchOpenApiSpec).toHaveBeenCalledWith("http://localhost:8081/v3/api-docs");
    expect(navigateMock).toHaveBeenCalledWith(
      "/explorer",
      expect.objectContaining({
        state: expect.objectContaining({
          baseUrl: "http://localhost:8081/v3/api-docs",
          endpoints: expect.arrayContaining([
            expect.objectContaining({ path: "/ping", method: "get" }),
          ]),
        }),
      }),
    );
  });

  it("shows an error and does not navigate when the fetch fails (e.g. CORS)", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchOpenApiSpec).mockRejectedValueOnce(new Error("Network Error"));

    renderHomePage();
    await user.type(
      screen.getByPlaceholderText("http://localhost:8081/v3/api-docs"),
      "http://localhost:8081/v3/api-docs",
    );
    await user.click(screen.getByRole("button", { name: /load api explorer/i }));

    expect(
      await screen.findByText(/failed to load api spec/i),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows an error when the spec parses to zero endpoints", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchOpenApiSpec).mockResolvedValueOnce({
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      paths: {},
    });

    renderHomePage();
    await user.type(
      screen.getByPlaceholderText("http://localhost:8081/v3/api-docs"),
      "http://localhost:8081/v3/api-docs",
    );
    await user.click(screen.getByRole("button", { name: /load api explorer/i }));

    expect(
      await screen.findByText(/failed to load api spec/i),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";
import { makeEndpoint } from "../../../test/factories";

describe("Sidebar", () => {
  it("groups endpoints by their first tag and shows a per-group count", () => {
    const endpoints = [
      makeEndpoint({ path: "/users", method: "get", tags: ["Users"] }),
      makeEndpoint({ path: "/users", method: "post", tags: ["Users"] }),
      makeEndpoint({ path: "/orders", method: "get", tags: ["Orders"] }),
    ];

    render(<Sidebar endpoints={endpoints} onSelect={vi.fn()} selected={null} />);

    expect(screen.getByText("Users (2)")).toBeInTheDocument();
    expect(screen.getByText("Orders (1)")).toBeInTheDocument();
  });

  it("falls back to a 'default' group when an endpoint has no tags", () => {
    const endpoints = [makeEndpoint({ path: "/ping", tags: [] })];

    render(<Sidebar endpoints={endpoints} onSelect={vi.fn()} selected={null} />);

    expect(screen.getByText("default (1)")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked endpoint", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const endpoint = makeEndpoint({ path: "/users/{id}", method: "delete" });

    render(<Sidebar endpoints={[endpoint]} onSelect={onSelect} selected={null} />);

    await user.click(screen.getByText("/users/{id}"));

    expect(onSelect).toHaveBeenCalledWith(endpoint);
  });

  it("renders the method pill uppercased", () => {
    const endpoint = makeEndpoint({ path: "/orders", method: "post" });
    render(<Sidebar endpoints={[endpoint]} onSelect={vi.fn()} selected={null} />);

    expect(screen.getByText("POST")).toBeInTheDocument();
  });
});

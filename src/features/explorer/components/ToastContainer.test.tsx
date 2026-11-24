// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ToastContainer from "./ToastContainer";

describe("ToastContainer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer toasts={[]} onRemove={vi.fn()} />);
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
  });

  it("renders a toast message", () => {
    render(
      <ToastContainer
        toasts={[{ id: "1", message: "Copied to clipboard", type: "success" }]}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();
  });

  it("auto-dismisses the oldest toast after the configured duration", () => {
    const onRemove = vi.fn();

    render(
      <ToastContainer
        toasts={[{ id: "1", message: "Saved", type: "success" }]}
        onRemove={onRemove}
        autoCloseDuration={1000}
      />,
    );

    expect(onRemove).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("dismisses a toast immediately when its close button is clicked", async () => {
    const onRemove = vi.fn();
    render(
      <ToastContainer
        toasts={[{ id: "1", message: "Oops", type: "error" }]}
        onRemove={onRemove}
      />,
    );

    screen.getByRole("button", { name: /dismiss notification/i }).click();

    expect(onRemove).toHaveBeenCalledWith("1");
  });
});

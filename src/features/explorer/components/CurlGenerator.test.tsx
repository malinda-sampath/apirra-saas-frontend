// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CurlGenerator from "./CurlGenerator";

describe("CurlGenerator", () => {
  it("is collapsed by default and expands to show the command on toggle", async () => {
    const user = userEvent.setup();
    render(
      <CurlGenerator
        method="get"
        baseUrl="https://api.example.com"
        path="/users"
        onCopy={vi.fn()}
        isVisible={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.queryByText(/curl -X GET/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show curl/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show curl/i }));
  });

  it("builds a GET command from baseUrl + path + query params, uppercasing a lowercase method", () => {
    render(
      <CurlGenerator
        method="get"
        baseUrl="https://api.example.com"
        path="/search"
        queryParams={{ q: "shoes" }}
        onCopy={vi.fn()}
        isVisible
        onToggle={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/curl -X GET 'https:\/\/api\.example\.com\/search\?q=shoes'/),
    ).toBeInTheDocument();
  });

  it("includes a JSON body and Content-Type header for a body-carrying method", () => {
    render(
      <CurlGenerator
        method="post"
        baseUrl="https://api.example.com"
        path="/users"
        body={{ name: "Ada" }}
        onCopy={vi.fn()}
        isVisible
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText(/-H 'Content-Type: application\/json'/)).toBeInTheDocument();
    expect(screen.getByText(/-d '{/)).toBeInTheDocument();
  });

  it("omits the body for a GET even if one were somehow passed", () => {
    render(
      <CurlGenerator
        method="get"
        baseUrl="https://api.example.com"
        path="/users"
        body={{ name: "Ada" }}
        onCopy={vi.fn()}
        isVisible
        onToggle={vi.fn()}
      />,
    );

    expect(screen.queryByText(/-d /)).not.toBeInTheDocument();
  });

  it("calls onCopy with the generated command", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(
      <CurlGenerator
        method="delete"
        baseUrl="https://api.example.com"
        path="/users/1"
        onCopy={onCopy}
        isVisible
        onToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /copy cURL command/i }));

    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining("curl -X DELETE 'https://api.example.com/users/1'"),
    );
  });

  it("single-quotes a hostile spec path and header so shell syntax stays literal", async () => {
    const onCopy = vi.fn();
    const user = userEvent.setup();
    render(
      <CurlGenerator
        method="get"
        baseUrl="https://api.example.com"
        path={'/x"$(touch /tmp/pwned)`id`\'y'}
        headers={{ "X-Evil": '"; rm -rf ~; echo "' }}
        onCopy={onCopy}
        isVisible
        onToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /copy curl command/i }));
    const cmd = onCopy.mock.calls[0][0] as string;
    expect(cmd).toContain(
      `curl -X GET 'https://api.example.com/x"$(touch /tmp/pwned)\`id\`'\\''y'`,
    );
    expect(cmd).toContain(`-H 'X-Evil: "; rm -rf ~; echo "'`);
  });
});

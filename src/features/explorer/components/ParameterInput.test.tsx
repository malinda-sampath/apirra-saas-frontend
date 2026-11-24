// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OpenAPIV3 } from "openapi-types";
import ParameterInput from "./ParameterInput";

const param = (
  overrides: Partial<OpenAPIV3.ParameterObject> = {},
): OpenAPIV3.ParameterObject => ({
  name: "id",
  in: "path",
  ...overrides,
});

describe("ParameterInput", () => {
  it("renders a text input for a string schema", () => {
    render(
      <ParameterInput
        param={param({ schema: { type: "string" } })}
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: /id input/i })).toBeInTheDocument();
  });

  it("renders a number input for integer/number schemas", () => {
    render(
      <ParameterInput
        param={param({ name: "page", schema: { type: "integer" } })}
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/page input/i)).toHaveAttribute("type", "number");
  });

  it("renders a true/false select for a boolean schema", () => {
    render(
      <ParameterInput
        param={param({ name: "active", schema: { type: "boolean" } })}
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/active input/i).tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "true" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "false" })).toBeInTheDocument();
  });

  it("calls onChange with the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ParameterInput
        param={param({ schema: { type: "string" } })}
        value=""
        onChange={onChange}
      />,
    );

    await user.type(screen.getByRole("textbox"), "abc");

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("disables the control when disabled or loading", () => {
    render(
      <ParameterInput
        param={param({ schema: { type: "string" } })}
        value=""
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});

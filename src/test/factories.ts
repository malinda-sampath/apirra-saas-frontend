import type { OpenAPIV3 } from "openapi-types";
import type { ParsedApiMethod } from "../features/explorer/types";

export const makeEndpoint = (
  overrides: Partial<ParsedApiMethod> = {},
): ParsedApiMethod => ({
  path: "/widgets",
  method: "get",
  tags: ["Widgets"],
  responses: { "200": { description: "OK" } },
  operation: { responses: {} } as OpenAPIV3.OperationObject,
  ...overrides,
});

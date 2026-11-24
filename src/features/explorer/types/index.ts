import type { OpenAPIV3 } from "openapi-types";

/**
 * Canonical types for the explorer feature.
 *
 * Previously these were duplicated across `types/methodTypes.ts` (thin
 * shapes) and `types/executPayload.ts` / `types/openApiType.ts` /
 * `utils/openApiParser.ts` (richer shapes), which forced call sites to
 * `as unknown as ExecutePayload`-cast their way around the mismatch. This
 * module is now the single source of truth; components consume these types
 * or the `openapi-types` types directly instead of re-declaring subsets.
 */

export type OpenAPISpec = OpenAPIV3.Document;

export const httpMethods = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
] as const;

export type HttpMethod = (typeof httpMethods)[number];

export type Responses = Record<string, OpenAPIV3.ResponseObject>;

/**
 * UI-friendly API method model, produced by `parseOpenApi`.
 */
export type ParsedApiMethod = {
  path: string;
  method: HttpMethod;

  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: Responses;
  parameters?: OpenAPIV3.ParameterObject[];

  /** Auto-generated JSON example built from the resolved request body schema */
  requestExample?: unknown;

  operation: OpenAPIV3.OperationObject;
};

export type ExecutePayload = {
  method: string;
  path: string;
  baseUrl: string;
  queryParams?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
};

export type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

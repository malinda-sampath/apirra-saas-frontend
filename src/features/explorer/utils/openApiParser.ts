import type { OpenAPIV3 } from "openapi-types";
import { httpMethods } from "../types";
import type { HttpMethod, ParsedApiMethod } from "../types";

const methodsWithBody: readonly HttpMethod[] = ["post", "put", "patch"];

/**
 * Flatten OpenAPI paths into UI-ready methods
 */
export const parseOpenApi = (spec: OpenAPIV3.Document): ParsedApiMethod[] => {
  if (!spec?.paths) return [];

  const result: ParsedApiMethod[] = [];

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    if (!pathItem) return;
    result.push(...extractMethods(path, pathItem, spec));
  });

  return result;
};

/**
 * Extract all HTTP methods from a PathItem
 */
const extractMethods = (
  path: string,
  pathItem: OpenAPIV3.PathItemObject,
  spec: OpenAPIV3.Document,
): ParsedApiMethod[] => {
  const methods: ParsedApiMethod[] = [];

  httpMethods.forEach((method) => {
    const operation = pathItem?.[method];

    if (!operation) return;

    const requestBody = operation.requestBody as
      | OpenAPIV3.RequestBodyObject
      | OpenAPIV3.ReferenceObject
      | undefined;

    const resolvedRequestBody = resolveRequestBody(requestBody, spec);

    const requestExample = methodsWithBody.includes(method)
      ? buildRequestExample(resolvedRequestBody, spec)
      : undefined;

    methods.push({
      path,
      method,
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags || [],
      requestBody: resolvedRequestBody,
      responses:
        (operation.responses as Record<string, OpenAPIV3.ResponseObject>) || {},
      parameters: (operation.parameters as OpenAPIV3.ParameterObject[]) ?? [],
      requestExample,
      operation,
    });
  });

  return methods;
};

/* -------------------------------------------------------------------------- */
/*                              $ref resolution                               */
/* -------------------------------------------------------------------------- */

const isRefObject = (value: unknown): value is OpenAPIV3.ReferenceObject =>
  typeof value === "object" &&
  value !== null &&
  "$ref" in value &&
  typeof (value as { $ref?: unknown }).$ref === "string";

const getRefName = (ref: string): string | undefined => ref.split("/").pop();

const resolveSchemaRef = (
  ref: string,
  spec: OpenAPIV3.Document,
): OpenAPIV3.SchemaObject | undefined => {
  const name = getRefName(ref);
  if (!name) return undefined;
  return spec.components?.schemas?.[name] as OpenAPIV3.SchemaObject | undefined;
};

/**
 * requestBody itself can technically be a $ref (points into components.requestBodies)
 */
const resolveRequestBody = (
  requestBody:
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3.ReferenceObject
    | undefined,
  spec: OpenAPIV3.Document,
): OpenAPIV3.RequestBodyObject | undefined => {
  if (!requestBody) return undefined;

  if (isRefObject(requestBody)) {
    const name = getRefName(requestBody.$ref);
    if (!name) return undefined;
    return spec.components?.requestBodies?.[name] as
      | OpenAPIV3.RequestBodyObject
      | undefined;
  }

  return requestBody;
};

/* -------------------------------------------------------------------------- */
/*                          Example JSON generation                           */
/* -------------------------------------------------------------------------- */

const buildRequestExample = (
  requestBody: OpenAPIV3.RequestBodyObject | undefined,
  spec: OpenAPIV3.Document,
): unknown => {
  const jsonContent = requestBody?.content?.["application/json"];
  const schema = jsonContent?.schema as
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.ReferenceObject
    | undefined;

  if (!schema) return undefined;

  return generateExample(schema, spec, new Set<string>());
};

/**
 * Recursively generate a sample value for a schema (or $ref to a schema).
 * `visited` tracks DTO names currently being expanded on this branch to
 * guard against circular references (e.g. CustomerDTO -> OrderDTO -> CustomerDTO).
 */
const generateExample = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  spec: OpenAPIV3.Document,
  visited: Set<string>,
): unknown => {
  if (!schema) return null;

  if (isRefObject(schema)) {
    const name = getRefName(schema.$ref);

    if (!name) return null;
    if (visited.has(name)) return {}; // circular ref guard

    const resolved = resolveSchemaRef(schema.$ref, spec);
    if (!resolved) return null;

    const nextVisited = new Set(visited);
    nextVisited.add(name);

    return generateExample(resolved, spec, nextVisited);
  }

  // enum -> use first enum value if present
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  switch (schema.type) {
    case "object":
      return generateObjectExample(schema, spec, visited);

    case "array":
      return generateArrayExample(schema, spec, visited);

    case "string":
      return generateStringExample(schema);

    case "integer":
      return typeof schema.example === "number" ? schema.example : 0;

    case "number":
      return typeof schema.example === "number" ? schema.example : 0;

    case "boolean":
      return typeof schema.example === "boolean" ? schema.example : true;

    default:
      // Schema has no explicit `type` but does have `properties` -> treat as object
      if (schema.properties) {
        return generateObjectExample(schema, spec, visited);
      }
      return schema.example ?? null;
  }
};

const generateObjectExample = (
  schema: OpenAPIV3.SchemaObject,
  spec: OpenAPIV3.Document,
  visited: Set<string>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (!schema.properties) return result;

  Object.entries(schema.properties).forEach(([key, propSchema]) => {
    result[key] = generateExample(
      propSchema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
      spec,
      visited,
    );
  });

  return result;
};

const generateArrayExample = (
  schema: OpenAPIV3.ArraySchemaObject,
  spec: OpenAPIV3.Document,
  visited: Set<string>,
): unknown[] => {
  if (!schema.items) return [];

  const item = schema.items as
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.ReferenceObject;

  const itemExample = generateExample(item, spec, visited);

  return [itemExample];
};

const generateStringExample = (schema: OpenAPIV3.SchemaObject): string => {
  if (typeof schema.example === "string") return schema.example;

  switch (schema.format) {
    case "date-time":
      return "2024-01-01T00:00:00Z";
    case "date":
      return "2024-01-01";
    case "uuid":
      return "00000000-0000-0000-0000-000000000000";
    case "email":
      return "user@example.com";
    default:
      return "string";
  }
};

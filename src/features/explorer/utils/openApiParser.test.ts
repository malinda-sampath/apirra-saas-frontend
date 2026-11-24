import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { parseOpenApi } from "./openApiParser";

const baseInfo: OpenAPIV3.InfoObject = { title: "Test API", version: "1.0" };

describe("parseOpenApi", () => {
  it("returns an empty array when the spec has no paths", () => {
    expect(parseOpenApi({} as OpenAPIV3.Document)).toEqual([]);
    expect(
      parseOpenApi({
        openapi: "3.0.0",
        info: baseInfo,
      } as OpenAPIV3.Document),
    ).toEqual([]);
  });

  it("flattens one entry per method per path", () => {
    const spec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: baseInfo,
      paths: {
        "/users": {
          get: { responses: {} },
          post: { responses: {} },
        },
        "/users/{id}": {
          delete: { responses: {} },
        },
      },
    };

    const result = parseOpenApi(spec);

    expect(result).toHaveLength(3);
    expect(result.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
      "delete /users/{id}",
      "get /users",
      "post /users",
    ]);
  });

  it("carries over operation metadata (summary, tags, operationId, parameters)", () => {
    const spec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: baseInfo,
      paths: {
        "/users/{id}": {
          get: {
            operationId: "getUser",
            summary: "Get a user",
            description: "Fetch a single user by id",
            tags: ["Users"],
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };

    const [entry] = parseOpenApi(spec);

    expect(entry).toMatchObject({
      path: "/users/{id}",
      method: "get",
      operationId: "getUser",
      summary: "Get a user",
      description: "Fetch a single user by id",
      tags: ["Users"],
    });
    expect(entry.parameters).toHaveLength(1);
    expect(entry.parameters?.[0].name).toBe("id");
    expect(entry.responses["200"].description).toBe("OK");
  });

  it("defaults tags/parameters to safe empty values when the spec omits them", () => {
    const spec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: baseInfo,
      paths: {
        "/ping": { get: { responses: {} } },
      },
    };

    const [entry] = parseOpenApi(spec);

    expect(entry.tags).toEqual([]);
    expect(entry.parameters).toEqual([]);
  });

  it("only builds a request example for methods that carry a body", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: { name: { type: "string" } },
    };
    const requestBody: OpenAPIV3.RequestBodyObject = {
      content: { "application/json": { schema } },
    };

    const spec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: baseInfo,
      paths: {
        "/widgets": {
          get: { responses: {} },
          post: { requestBody, responses: {} },
        },
      },
    };

    const result = parseOpenApi(spec);
    const get = result.find((r) => r.method === "get")!;
    const post = result.find((r) => r.method === "post")!;

    expect(get.requestExample).toBeUndefined();
    expect(post.requestExample).toEqual({ name: "string" });
  });

  describe("$ref resolution", () => {
    it("resolves a requestBody that is itself a $ref into components.requestBodies", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: baseInfo,
        paths: {
          "/orders": {
            post: {
              requestBody: { $ref: "#/components/requestBodies/CreateOrder" },
              responses: {},
            },
          },
        },
        components: {
          requestBodies: {
            CreateOrder: {
              content: {
                "application/json": {
                  schema: { type: "object", properties: { qty: { type: "integer" } } },
                },
              },
            },
          },
        },
      };

      const [entry] = parseOpenApi(spec);

      expect(entry.requestBody).toBeDefined();
      expect(entry.requestExample).toEqual({ qty: 0 });
    });

    it("resolves a $ref schema into components.schemas when building the example", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: baseInfo,
        paths: {
          "/users": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/User" },
                  },
                },
              },
              responses: {},
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "integer" },
              },
            },
          },
        },
      };

      const [entry] = parseOpenApi(spec);

      expect(entry.requestExample).toEqual({ name: "string", age: 0 });
    });

    it("guards against circular $ref chains instead of recursing forever", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: baseInfo,
        paths: {
          "/customers": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Customer" },
                  },
                },
              },
              responses: {},
            },
          },
        },
        components: {
          schemas: {
            Customer: {
              type: "object",
              properties: {
                name: { type: "string" },
                latestOrder: { $ref: "#/components/schemas/Order" },
              },
            },
            Order: {
              type: "object",
              properties: {
                total: { type: "number" },
                customer: { $ref: "#/components/schemas/Customer" },
              },
            },
          },
        },
      };

      const [entry] = parseOpenApi(spec);

      expect(entry.requestExample).toEqual({
        name: "string",
        latestOrder: {
          total: 0,
          customer: {}, // circular ref guard short-circuits to {}
        },
      });
    });
  });

  describe("generateExample via requestExample", () => {
    const exampleFor = (schema: OpenAPIV3.SchemaObject) => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: baseInfo,
        paths: {
          "/x": {
            post: {
              requestBody: { content: { "application/json": { schema } } },
              responses: {},
            },
          },
        },
      };
      return parseOpenApi(spec)[0].requestExample;
    };

    it("uses the first enum value when present", () => {
      expect(
        exampleFor({ type: "string", enum: ["ACTIVE", "INACTIVE"] }),
      ).toBe("ACTIVE");
    });

    it("uses an explicit example over the type default", () => {
      expect(exampleFor({ type: "integer", example: 42 })).toBe(42);
      expect(exampleFor({ type: "boolean", example: false })).toBe(false);
      expect(exampleFor({ type: "string", example: "hi" })).toBe("hi");
    });

    it("falls back to type-based defaults with no example", () => {
      expect(exampleFor({ type: "integer" })).toBe(0);
      expect(exampleFor({ type: "number" })).toBe(0);
      expect(exampleFor({ type: "boolean" })).toBe(true);
      expect(exampleFor({ type: "string" })).toBe("string");
    });

    it("produces format-aware string examples", () => {
      expect(exampleFor({ type: "string", format: "date-time" })).toBe(
        "2024-01-01T00:00:00Z",
      );
      expect(exampleFor({ type: "string", format: "date" })).toBe("2024-01-01");
      expect(exampleFor({ type: "string", format: "uuid" })).toBe(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(exampleFor({ type: "string", format: "email" })).toBe(
        "user@example.com",
      );
    });

    it("generates a one-item array from the items schema", () => {
      expect(
        exampleFor({ type: "array", items: { type: "string" } }),
      ).toEqual(["string"]);
    });

    it("treats a typeless schema with properties as an object", () => {
      expect(
        exampleFor({ properties: { id: { type: "integer" } } } as OpenAPIV3.SchemaObject),
      ).toEqual({ id: 0 });
    });
  });
});

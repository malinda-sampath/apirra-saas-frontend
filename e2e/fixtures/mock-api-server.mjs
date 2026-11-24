// A tiny, dependency-free HTTP server that stands in for a real backend
// during E2E tests. It serves a static OpenAPI 3.0 spec at /v3/api-docs
// (mirroring the springdoc-openapi convention this app targets) plus a
// handful of REST endpoints so the "Try it" flow can be exercised
// end-to-end without depending on a real, externally-running API.
//
// CORS is wide open here on purpose - this fixture exists to let the
// frontend explore it from the browser, which is exactly the constraint
// documented in CLAUDE.md / the CORS incident this app hit against a real
// backend.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 4310);

const users = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
  { id: 2, name: "Alan Turing", email: "alan@example.com" },
];

const openApiSpec = {
  openapi: "3.0.1",
  info: { title: "Mock Users API", version: "1.0" },
  paths: {
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        operationId: "listUsers",
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Users"],
        summary: "Create a user",
        operationId: "createUser",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Grace Hopper" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get a user by id",
        operationId: "getUser",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "OK" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user",
        operationId: "deleteUser",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "204": { description: "No content" } },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        operationId: "health",
        responses: { "200": { description: "OK" } },
      },
    },
  },
};

const send = (res, status, body, headers = {}) => {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    ...headers,
  });
  res.end(payload);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch {
        resolve(undefined);
      }
    });
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    send(res, 204, undefined);
    return;
  }

  if (url.pathname === "/v3/api-docs" && req.method === "GET") {
    send(res, 200, openApiSpec);
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    send(res, 200, { status: "UP" });
    return;
  }

  if (url.pathname === "/users" && req.method === "GET") {
    send(res, 200, users);
    return;
  }

  if (url.pathname === "/users" && req.method === "POST") {
    const body = await readBody(req);
    const created = { id: users.length + 1, ...body };
    users.push(created);
    send(res, 201, created);
    return;
  }

  const userMatch = url.pathname.match(/^\/users\/(\d+)$/);
  if (userMatch && req.method === "GET") {
    const user = users.find((u) => u.id === Number(userMatch[1]));
    if (!user) {
      send(res, 404, { error: "User not found" });
      return;
    }
    send(res, 200, user);
    return;
  }

  if (userMatch && req.method === "DELETE") {
    const index = users.findIndex((u) => u.id === Number(userMatch[1]));
    if (index !== -1) users.splice(index, 1);
    send(res, 204, undefined);
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});

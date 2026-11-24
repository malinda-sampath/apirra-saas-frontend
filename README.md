# APIRRA (OpenAPI UI Tool)

A lightweight OpenAPI-based API Explorer that fetches an OpenAPI spec, parses it, and renders interactive API endpoints similar to Swagger/Postman.

---

# Project Structure

```
SRC
│ App.tsx
│ main.tsx
│ index.css
│
├── app
│   └── Router.tsx
│
├── pages
│   └── ExplorerPage
│       └── PreLoginHome.tsx
│
├── components
│   └── explorer
│       ├── layout
│       │   ├── ExplorerPage.tsx
│       │   └── Sidebar.tsx
│       │
│       ├── methods
│       │   ├── MethodRenderer.tsx
│       │   ├── get/
│       │   ├── post/
│       │   ├── put/
│       │   └── delete/
│       │
│       └── UserInput.tsx
│
├── services
│   ├── explorer
│   │   ├── openApiService.ts
│   │   └── explorerApi.ts
│   └── app
│       └── appApi.ts
│
├── utils
│   └── openApiParser.ts
│
├── types
│   ├── openApiType.ts
│   └── methodType.ts
```

---

# Core Flow

## 1. User Input (PreLoginHome)

User enters base API URL.

---

## 2. Fetch OpenAPI Spec

```ts id="a1k9x2"
fetchOpenApiSpec(baseUrl)
GET {baseUrl}/v3/api-docs
```

Returns full OpenAPI v3 document.

---

## 3. Parse OpenAPI → UI Model

```ts id="b2k8x1"
parseOpenApi(spec);
```

### What happens:

- Reads `spec.paths`
- Extracts HTTP methods (GET, POST, PUT, DELETE)
- Converts into flat array of endpoints

### Output:

```ts id="c3l9x4"
ParsedApiMethod[]
```

Example:

```ts id="d4m0x5"
{
  path: "/users",
  method: "get",
  summary: "Get users",
  tags: ["Users"],
  operation: {...}
}
```

---

## 4. Navigate to Explorer

```ts id="e5n1x6"
navigate("/explorer", {
  state: { endpoints, baseUrl },
});
```

---

## 5. Explorer UI

### Sidebar

- Receives `endpoints`
- Groups by `tags`
- Displays API list

### Selection

- Clicking endpoint sets `selected` state

---

## 6. Method Rendering

```ts id="f6o2x7"
<MethodRenderer endpoint={selected} />
```

Routes based on HTTP method:

- GET → GetMethod
- POST → PostMethod
- PUT → PutMethod
- DELETE → DeleteMethod

---

# Key Idea

```
OpenAPI Spec
   ↓
parseOpenApi()
   ↓
Flat endpoint list
   ↓
Sidebar (list view)
   ↓
User selects endpoint
   ↓
MethodRenderer (details view)
```

# Flow

```
1. User enters base URL
        ↓
2. Fetch OpenAPI spec (/v3/api-docs)
        ↓
3. parseOpenApi()
   → Convert spec into ParsedApiMethod[]
        ↓
4. Navigate to /explorer with state
        ↓
5. ExplorerPage receives endpoints
        ↓
6. Sidebar renders grouped endpoints
        ↓
7. User selects endpoint
        ↓
8. MethodRenderer renders API details UI
        ↓
9. User interacts with API (future extension: execute request)
```

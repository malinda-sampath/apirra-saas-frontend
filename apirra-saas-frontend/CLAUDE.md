# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Apirra — API Explorer

## What this is
Apirra is a browser-based API explorer, similar in spirit to Swagger UI or
Postman: the user pastes an OpenAPI spec URL, the app fetches and parses it,
then lets them browse every endpoint in a sidebar and "Try it out" — filling
in parameters/body, sending a real request, and inspecting the response —
all client-side.

## Tech stack (as used in this repo)
- React + TypeScript, built with Vite (`import.meta.env.VITE_APP_API_URL`)
- `react-router-dom` for routing (`/` and `/explorer`)
- `axios` for HTTP calls
- `openapi-types` for OpenAPI v3 typings
- Tailwind CSS v4 (`@import "tailwindcss"` + `@layer base/components` in
  `index.css`; utility classes like `bg-linear-to-br` confirm v4, not v3)

## Data flow
1. **`pages/HomePage/HomePage.tsx`** — user enters an OpenAPI spec
   URL. `fetchOpenApiSpec` (axios, via `features/explorer/api/explorerApi.ts`)
   retrieves the raw spec.
2. **`features/explorer/utils/openApiParser.ts`** — `parseOpenApi()` flattens
   `spec.paths` into a flat `ParsedApiMethod[]` (one entry per method per
   path), resolving `$ref`s for request bodies and schemas, and building a
   JSON example body for POST/PUT/PATCH via `generateExample()` (with
   circular-ref guarding). `ParsedApiMethod` itself is defined in
   `features/explorer/types/index.ts`, not here.
3. On success, `react-router-dom` navigates to `/explorer`, passing
   `{ endpoints, baseUrl, spec }` through router `state` (not global
   state/context — if the user refreshes `/explorer` directly, this data
   is gone).
4. **`pages/ExplorerPage/ExplorerPage.tsx`** — hosts `Sidebar` +
   `MethodRenderer`. Owns `selected` (currently chosen endpoint) and
   `loading`, and defines `handleExecute`, which wraps
   `features/explorer/api/requestExecutor.ts`'s `executeRequest` (a raw axios
   call assembled from `baseUrl` + `path` + query params + body).
5. **`features/explorer/components/Sidebar.tsx`** — groups endpoints by their
   first OpenAPI tag and lists them.
6. **`features/explorer/components/MethodRenderer.tsx`** — switches on
   `endpoint.method` to render `GetMethod` / `PostMethod` / `PutMethod` /
   `DeleteMethod`. `PATCH`/`HEAD`/`OPTIONS` fall through to a "not yet
   supported" placeholder.
7. Each method component (`methods/GetMethod.tsx`, `methods/PostMethod.tsx`,
   `methods/PutMethod.tsx`, `methods/DeleteMethod.tsx`) is a near-identical
   pattern: param inputs → (body editor for POST/PUT) → send button →
   cURL preview (`CurlGenerator`) → response viewer (`ResponseDisplay`) →
   history (`RequestHistory`) → toasts (`ToastContainer`).
8. The raw `spec` (not just the parsed `endpoints`) is also passed through
   the same router `state` from `HomePage`, so `ExplorerPage` can offer a
   read-only "View Spec" button (top-right of the header) that opens
   `features/explorer/components/SpecViewerModal.tsx` — an Overview
   (grouped-by-tag endpoint list) / Raw JSON tab view with copy and
   download actions. It is only rendered when `spec` is present in state.

## File structure
Feature-based: route-level composition lives in `pages/`, all explorer
business logic (components/hooks/api/types/utils) is co-located under
`features/explorer/`, and the one truly generic, non-feature-specific UI
piece (`UserInput`) lives in `shared/`.
```
src/
├── main.tsx
├── index.css
├── app/
│   ├── App.tsx
│   └── Router.tsx
├── pages/
│   ├── HomePage/
│   │   └── HomePage.tsx        # OpenAPI spec URL entry screen ("/")
│   └── ExplorerPage/
│       └── ExplorerPage.tsx    # sidebar + method renderer shell ("/explorer")
├── features/
│   └── explorer/
│       ├── api/
│       │   ├── explorerApi.ts     # axios instance, no baseURL (target API is user-supplied)
│       │   ├── openApiService.ts  # fetchOpenApiSpec
│       │   └── requestExecutor.ts # executeRequest — sends the actual "Try it" request
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── MethodRenderer.tsx
│       │   ├── CurlGenerator.tsx
│       │   ├── ParameterSection.tsx
│       │   ├── ParameterInput.tsx
│       │   ├── ResponseDisplay.tsx
│       │   ├── RequestHistory.tsx
│       │   ├── ToastContainer.tsx
│       │   ├── SpecViewerModal.tsx # read-only "View Spec" overlay (Overview + Raw JSON)
│       │   └── methods/
│       │       ├── GetMethod.tsx
│       │       ├── PostMethod.tsx
│       │       ├── PutMethod.tsx
│       │       └── DeleteMethod.tsx
│       ├── types/
│       │   └── index.ts        # canonical ParsedApiMethod, ExecutePayload, HttpMethod, Toast, OpenAPISpec
│       └── utils/
│           └── openApiParser.ts
├── shared/
│   └── components/
│       └── UserInput.tsx
└── services/
    └── appApi.ts                # axios instance, fixed backend (VITE_APP_API_URL) — status: see known issue below
```

## Conventions already established — follow these for new code
- **New HTTP method component**: copy the shape of `GetMethod.tsx` (simplest)
  or `PostMethod.tsx` (if it needs a body editor). Every method component
  owns the same local state shape: `response`, `isRunning`, `paramValues`,
  `toasts`, `showCurl`, `activeTab`, `requestHistory`. Keep that consistent
  rather than inventing a new pattern per method.
- **Destructive methods** (see `DeleteMethod.tsx`) use a two-click confirm
  pattern (`confirmArmed`) rather than a modal — any edit to params re-arms
  it. Follow this for any other destructive verb you add.
- **Path/query param handling**: params come from the OpenAPI spec grouped
  by `in` (`path`/`query`/`header`/`cookie`) via `ParameterSection` /
  `ParameterInput`. Path params are substituted into `endpoint.path` with
  `encodeURIComponent`; query params are built via
  `Object.fromEntries(...).filter(v !== undefined && v !== "")`.
- **Toasts**: use the local `addToast(message, type)` / `removeToast(id)`
  pattern already in each method component — there's no global toast store.
- **Styling**: light theme. Design tokens live in `index.css` under
  Tailwind v4's `@theme`, so each is also a utility: surfaces (`paper`,
  `surface`, `sunken`), text (`ink`, `ink-soft`, `muted`, `faint`), rules
  (`line`, `line-strong`), `accent` (also used for 2xx), `danger`, and one
  color per HTTP method (`--color-get`, `--color-post`, … → `text-get`,
  `bg-post/10`). Fonts: Schibsted Grotesk (UI) and JetBrains Mono (code
  only), loaded in `index.html`. Shared component classes: `.panel`,
  `.field`, `.btn` + `.btn-primary`/`-secondary`/`-quiet`/`-danger`,
  `.code-block`, and `.method-pill-*`. Reuse these rather than hardcoding
  colors; avoid gradients, glows, and ALL-CAPS labels.
- **Reset on endpoint change**: every method component resets its local
  state via a `useEffect` keyed on `endpoint.path` (wrapped in a
  `setTimeout(…, 0)` to dodge a render-order issue). Preserve this when
  editing these components.

## Known issues / tech debt (be aware of these, don't "fix" them silently)
1. **`ResponseDisplay`'s "Request Details" tab hardcodes the method label as
   `GET`** regardless of what method was actually sent — it isn't passed the
   real method and should be.
2. **`services/appApi.ts` appears unused** in everything shown so far —
   confirm whether it's dead code or reserved for an upcoming
   auth/account feature before deleting it.
3. **`PATCH`/`HEAD`/`OPTIONS`** are recognized in the OpenAPI parser and
   type unions but have no method component / `MethodRenderer` case yet.

~~**Router state, not persisted state**: `/explorer` depends entirely on
`location.state.endpoints`/`baseUrl`. A hard refresh or direct link to
`/explorer` lands on an empty state with no redirect/guard back to `/`.~~
**Fixed** (2026-09-20): `ExplorerPage` now renders `<Navigate to="/" replace />`
whenever `location.state` has no endpoints (hard refresh, direct link, or
browser back/forward landing here), instead of showing an empty shell. The
in-app "back" button was also removed in favor of a "New Spec" button (top
right of the Explorer header) and a clickable logo, both of which call
`navigate("/#get-started")` — since the loaded spec only ever lived in router
state, navigating away without re-passing it is enough to discard it.
`HomePage` scrolls to `#get-started` on mount when the URL carries that hash,
since the browser only does that automatically on a full page load, not a
client-side route change.

~~**Two conflicting definitions each of `ParsedApiMethod` and
`ExecutePayload`.**~~ **Fixed** (2026-09-20): consolidated into
`features/explorer/types/index.ts`. Method components now take the
canonical `ParsedApiMethod` directly (no more
`& { parameters?: Parameter[]; responses?: Responses }` intersection), and
`PostMethod`/`PutMethod` no longer need the `as unknown as ExecutePayload`
cast. `ParameterSection`/`ParameterInput`/`CurlGenerator` now use
`OpenAPIV3.ParameterObject` / the shared `HttpMethod` type instead of the
deleted thin shadows in the old `types/methodTypes.ts`. The two conflicting
`HttpMethod` definitions (uppercase in `methodTypes.ts` vs. lowercase in
`openApiParser.ts`) were the same class of bug and are consolidated too —
`CurlGenerator` now receives `endpoint.method` (lowercase) instead of a
hardcoded uppercase literal per method component; it already normalized
case internally so this is not a behavior change.

## Commands
```bash
npm install
npm run dev             # local dev server
npm run build           # production build (tsc -b && vite build)
npm run preview         # preview a production build
npm run lint            # eslint .
npm run test            # vitest run (unit/component tests, single pass)
npm run test:watch      # vitest, watch mode
npm run test:coverage   # vitest run --coverage
npm run test:e2e        # playwright test (spins up its own dev server + mock API)
```

Run a single unit test file or test name:
```bash
npx vitest run src/features/explorer/components/Sidebar.test.tsx
npx vitest run -t "groups endpoints by their first tag"
```
Run a single e2e spec: `npx playwright test e2e/home.spec.ts`.

### Testing conventions / gotchas
- **Unit test files are `.test.ts(x)` co-located next to the module they
  cover** (e.g. `Sidebar.tsx` / `Sidebar.test.tsx`), using Vitest +
  React Testing Library. Shared factories live in `src/test/factories.ts`.
- **Vitest's default environment is `node`**, not `jsdom` (set in
  `vite.config.ts`, for cheaper pure-logic tests). Any test that renders a
  component must opt in with a `// @vitest-environment jsdom` docblock as
  the first line of the file — see any existing `*.test.tsx` for the
  pattern.
- **`*.test.ts(x)`, `/e2e/`, `/playwright.config.ts`, and `/src/test/` are
  all git-ignored** (see `.gitignore`) even though they exist in this
  working tree, are referenced by `package.json` scripts, and their
  dependencies (`vitest`, `@testing-library/*`, `@playwright/test`) are
  real `devDependencies`. `git status`/`git add` won't pick up new or
  edited test files, and a fresh clone of this repo won't have them at
  all — don't assume `git log`/`git diff` reflects test changes, and don't
  be surprised if `git status` shows nothing after editing a test.
- Playwright's e2e suite runs against dedicated port `5174` (not the
  default `5173`, to avoid clashing with a manually-running dev server)
  plus a mock API server (`e2e/fixtures/mock-api-server.mjs`) on port
  `4310`; both are started automatically via `webServer` in
  `playwright.config.ts`.

## Deployment
This project directory (`apirra-saas-frontend/`) is nested one level inside
the git repo root (`apirra-saas-frontned/`). The GitHub Actions workflow that
builds and deploys it lives **outside this directory**, at
`../.github/workflows/deploy.yml` (repo root), not under a `.github/` folder
inside this project. On every push to `main` it runs `npm ci` / `npm run
build` with `working-directory: ./apirra-saas-frontend`, then publishes
`./apirra-saas-frontend/dist` to GitHub Pages. If you rename this directory
or change the build output path, update that workflow file too — it won't
show up in a search scoped to this project folder.

## What "done" looks like for a task in this repo
1. New/changed code follows the existing method-component pattern (state
   shape, toast usage, reset-on-endpoint-change effect) rather than
   introducing a new one.
2. No new type duplication — reuse `ParsedApiMethod`, `ExecutePayload`,
   `HttpMethod`, and `Toast` from `features/explorer/types/index.ts` (or
   `OpenAPIV3.*` from `openapi-types` directly) rather than re-declaring a
   thinner local shape.
3. `npm run lint` and `tsc` (via `npm run build`) pass.
4. If you fix one of the known issues above, remove it from this list.

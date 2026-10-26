import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchOpenApiSpec } from "../../features/explorer/api/openApiService";
import { parseOpenApi } from "../../features/explorer/utils/openApiParser";
import type { ParsedApiMethod } from "../../features/explorer/types";
import UserInput from "../../shared/components/UserInput";
import Logo from "../../shared/components/Logo";

// Hosted alongside this app (see public/test-doc.json) so anyone without
// their own OpenAPI-documented backend can still try every HTTP method.
// Its `paths` point at JSONPlaceholder, a public sandbox API, so requests
// must target that origin directly rather than the URL the spec itself was
// fetched from - see handleLoadDemo below.
const DEMO_SPEC_PATH = "/test-doc.json";
const DEMO_BASE_URL = "https://jsonplaceholder.typicode.com";

const FEATURES = [
  {
    title: "Nothing to install",
    description:
      "Paste a spec URL and you're in. No desktop app, no account, no collection to import.",
  },
  {
    title: "Real requests",
    description:
      "Fill in path, query and header values, hit send, and read the actual response your API returns.",
  },
  {
    title: "Bodies written for you",
    description:
      "POST and PUT bodies start pre-filled from the request schema, so you edit a draft instead of a blank box.",
  },
  {
    title: "Copy as cURL",
    description:
      "Whatever you've built can be copied as a cURL command for your terminal, a bug report, or the docs.",
  },
  {
    title: "Per-endpoint history",
    description:
      "Each endpoint keeps its last ten requests, so you can bring back the values from an earlier run.",
  },
  {
    title: "Stays in your browser",
    description:
      "Requests go from this tab straight to your API. There's no proxy in the middle reading your traffic.",
  },
];

const STEPS = [
  {
    title: "Paste a spec URL",
    description:
      "Any reachable OpenAPI 3 or Swagger 2 document in JSON. For Spring apps that's usually /v3/api-docs.",
  },
  {
    title: "Pick an endpoint",
    description:
      "Endpoints are grouped by tag in the sidebar. Press / to search, or filter by method.",
  },
  {
    title: "Send it",
    description:
      "Fill in the parameters, send the request, and read the response right under the form.",
  },
];

// Static preview for the hero: mirrors what the explorer shows after
// loading the demo spec, with GET /users selected.
const PREVIEW_GROUPS = [
  {
    tag: "Posts",
    endpoints: [
      { method: "get", path: "/posts" },
      { method: "post", path: "/posts" },
      { method: "put", path: "/posts/{id}" },
      { method: "delete", path: "/posts/{id}" },
    ],
  },
  {
    tag: "Users",
    endpoints: [{ method: "get", path: "/users", active: true }],
  },
];

const PREVIEW_RESPONSE = `[
  {
    "id": 1,
    "name": "Leanne Graham",
    "username": "Bret",
    "email": "Sincere@april.biz"
  },
  …
]`;

const METHOD_TEXT: Record<string, string> = {
  get: "text-get",
  post: "text-post",
  put: "text-put",
  delete: "text-delete",
};

const ExplorerPreview = () => (
  <div
    aria-hidden="true"
    className="panel overflow-hidden shadow-[0_1px_0_var(--color-line),0_18px_40px_-24px_rgba(24,33,30,0.35)]"
  >
    <div className="flex items-center gap-1.5 border-b border-line bg-paper px-3 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
      <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
      <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
      <span className="ml-3 truncate font-mono text-[11px] text-faint">
        jsonplaceholder.typicode.com
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-[11.5rem_1fr]">
      <ul className="hidden border-r border-line py-2 sm:block">
        {PREVIEW_GROUPS.map((group) => (
          <li key={group.tag}>
            <p className="px-3 pb-1 pt-2 text-xs font-medium text-faint">
              {group.tag}
            </p>
            <ul>
              {group.endpoints.map((ep) => (
                <li
                  key={`${ep.method}-${ep.path}`}
                  className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] ${
                    "active" in ep
                      ? "bg-sunken text-ink shadow-[inset_2px_0_0_var(--color-ink)]"
                      : "text-muted"
                  }`}
                >
                  <span
                    className={`w-12 font-semibold ${METHOD_TEXT[ep.method]}`}
                  >
                    {ep.method.toUpperCase()}
                  </span>
                  <span className="truncate">{ep.path}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="min-w-0 p-4">
        <div className="flex items-center gap-2 font-mono text-[13px]">
          <span className="font-semibold text-get">GET</span>
          <span className="truncate text-ink">/users</span>
          <span className="ml-auto shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
            200 OK
          </span>
        </div>
        <p className="mt-1 text-xs text-faint">Came back in 84 ms</p>
        <pre className="code-block mt-3 overflow-x-auto text-[12px] leading-relaxed">
          {PREVIEW_RESPONSE}
        </pre>
      </div>
    </div>
  </div>
);

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const HomePage = () => {
  const [baseUrl, setBaseUrlState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Arriving via navigate("/#get-started") (e.g. from the Explorer page's
  // "New Spec" button) needs a manual scroll - the browser only does this
  // automatically on a full page load, not a client-side route change.
  useEffect(() => {
    if (!location.hash) return;

    document.querySelector(location.hash)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [location.hash]);

  const loadExplorer = async (
    specUrl: string,
    requestBaseUrl: string,
    errorMessage: string,
  ) => {
    setError("");

    try {
      setLoading(true);

      const spec = await fetchOpenApiSpec(specUrl);

      // extra safety check (important)
      if (!spec) {
        throw new Error("Empty OpenAPI spec");
      }

      const parsed: ParsedApiMethod[] = parseOpenApi(spec);

      // only navigate if we actually got data
      if (parsed && parsed.length > 0) {
        navigate("/explorer", {
          state: {
            endpoints: parsed,
            baseUrl: requestBaseUrl,
            spec,
          },
        });
      } else {
        throw new Error("No endpoints found in API spec");
      }
    } catch (err) {
      console.error(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () =>
    loadExplorer(
      baseUrl,
      baseUrl,
      "Failed to load API spec. Check the URL and that the server allows requests from this site (CORS).",
    );

  const handleLoadDemo = () =>
    loadExplorer(
      DEMO_SPEC_PATH,
      DEMO_BASE_URL,
      "Failed to load the demo spec. Try again in a moment.",
    );

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="btn btn-quiet hidden sm:inline-flex">
              Features
            </a>
            <a
              href="#how-it-works"
              className="btn btn-quiet hidden sm:inline-flex"
            >
              How it works
            </a>
            <a href="#get-started" className="btn btn-secondary ml-1">
              Open a spec
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <div>
            <h1 className="max-w-[15ch] text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.5rem]">
              Try any API straight from its spec.
            </h1>

            <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-muted">
              Paste the URL of an OpenAPI or Swagger document. Apirra lists
              every endpoint and lets you call them from this browser tab, with
              no install and no account.
            </p>

            <div
              id="get-started"
              className="mt-9 max-w-[34rem] scroll-mt-24 space-y-3"
            >
              <label
                htmlFor="spec-url"
                className="block text-sm font-medium text-ink"
              >
                Spec URL
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-stretch">
                  <span className="flex items-center rounded-l-md border border-r-0 border-line-strong bg-sunken px-3 font-mono text-xs font-semibold text-get">
                    GET
                  </span>
                  <UserInput
                    id="spec-url"
                    label=""
                    placeholder="http://localhost:8081/v3/api-docs"
                    value={baseUrl}
                    onChange={(e) => setBaseUrlState(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                    className="rounded-l-none py-2.5 font-mono text-[13px]"
                    spellCheck={false}
                    autoComplete="url"
                  />
                </div>

                <button
                  onClick={handleLoad}
                  disabled={loading || !baseUrl.trim()}
                  className="btn btn-primary px-5 py-2.5"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Loading…
                    </>
                  ) : (
                    "Load API explorer"
                  )}
                </button>
              </div>

              <p className="text-[13px] text-faint">
                Usually ends in{" "}
                <code className="font-mono text-muted">/v3/api-docs</code>,{" "}
                <code className="font-mono text-muted">/openapi.json</code> or{" "}
                <code className="font-mono text-muted">/swagger.json</code>.
              </p>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2.5 text-sm text-danger"
                >
                  {error}
                </p>
              )}

              <p className="pt-3 text-sm leading-relaxed text-muted">
                No API to point at?{" "}
                <button
                  onClick={handleLoadDemo}
                  disabled={loading}
                  className="font-medium text-accent underline decoration-accent/30 underline-offset-4 transition hover:decoration-accent disabled:opacity-50"
                >
                  Try the demo API
                </button>
                , a small JSONPlaceholder spec with GET, POST, PUT and DELETE
                endpoints you can't break.
              </p>
            </div>
          </div>

          <ExplorerPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[18rem_1fr] lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.015em] text-ink sm:text-[1.75rem]">
              What it does
            </h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
              The parts of Postman you actually reach for when you just want
              to poke an endpoint.
            </p>
          </div>

          <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="border-t border-line pt-4">
                <dt className="text-[15px] font-semibold text-ink">
                  {feature.title}
                </dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-muted">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[18rem_1fr] lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.015em] text-ink sm:text-[1.75rem]">
              How it works
            </h2>
            <a
              href="#get-started"
              className="btn btn-primary mt-6 hidden lg:inline-flex"
            >
              Open a spec
            </a>
          </div>

          <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((item, i) => (
              <li key={item.title}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-sm font-medium text-ink">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>

          <a
            href="#get-started"
            className="btn btn-primary justify-self-start lg:hidden"
          >
            Open a spec
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="text-faint">
              &copy; {new Date().getFullYear()}
            </span>
          </div>

          <p>
            Made by{" "}
            <a
              href="https://malindasampath.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-ink"
            >
              Malinda Sampath
            </a>
          </p>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="self-start text-muted transition hover:text-ink sm:self-auto"
          >
            Back to top
          </button>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

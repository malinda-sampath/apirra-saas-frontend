import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../features/explorer/components/Sidebar";
import MethodRenderer from "../../features/explorer/components/MethodRenderer";
import SpecViewerModal from "../../features/explorer/components/SpecViewerModal";
import { executeRequest } from "../../features/explorer/api/requestExecutor";
import type {
  ParsedApiMethod,
  ExecutePayload,
  OpenAPISpec,
} from "../../features/explorer/types";
import Logo from "../../shared/components/Logo";

const ExplorerPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const endpoints: ParsedApiMethod[] = location.state?.endpoints || [];
  const baseUrl: string = location.state?.baseUrl || "";
  const spec: OpenAPISpec | undefined = location.state?.spec;
  const [selected, setSelected] = useState<ParsedApiMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [specViewerOpen, setSpecViewerOpen] = useState(false);

  // Guard against a hard refresh or a direct/back-button link landing here:
  // this page only makes sense with endpoints handed off via router state
  // from the HomePage loader, so send the user back to load a spec first.
  if (endpoints.length === 0) {
    return <Navigate to="/" replace />;
  }

  // Discards the loaded spec (it only ever lived in router state) and drops
  // the user back on the URL form to load a different one.
  const handleGoHome = () => navigate("/");
  const handleGoGetStarted = () => navigate("/#get-started");

  const handleExecute = async (payload: ExecutePayload) => {
    setLoading(true);

    try {
      const res = await executeRequest({
        baseUrl,
        method: payload.method,
        path: payload.path,
        queryParams: payload.queryParams,
        headers: payload.headers,
        body: payload.body,
      });

      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const errorRes = { error: message };

      return errorRes;
    } finally {
      setLoading(false);
    }
  };

  // Overview data for the "nothing selected yet" screen. Plain computations
  // (no hooks) since they sit after the early-return guard above.
  const methodCounts = endpoints.reduce<Record<string, number>>((acc, ep) => {
    acc[ep.method] = (acc[ep.method] ?? 0) + 1;
    return acc;
  }, {});
  const tagGroups = endpoints.reduce<Record<string, ParsedApiMethod[]>>(
    (acc, ep) => {
      const tag = ep.tags?.[0] || "default";
      (acc[tag] ??= []).push(ep);
      return acc;
    },
    {},
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-5">
        {/* LEFT SIDE */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="btn btn-quiet h-9 w-9 p-0 md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <button
            onClick={handleGoHome}
            aria-label="Back to home"
            className="shrink-0 rounded-md"
          >
            <Logo />
          </button>

          {spec?.info?.title && (
            <button
              onClick={() => setSelected(null)}
              className="hidden min-w-0 items-baseline gap-2 rounded-md border-l border-line py-1 pl-3 pr-2 text-left text-sm hover:bg-sunken sm:flex"
              title="API overview"
            >
              <span className="truncate font-medium text-ink">
                {spec.info.title}
              </span>
              {spec.info.version && (
                <span className="shrink-0 font-mono text-xs text-faint">
                  v{spec.info.version}
                </span>
              )}
            </button>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex shrink-0 items-center gap-2">
          {spec && (
            <button
              onClick={() => setSpecViewerOpen(true)}
              className="btn btn-quiet"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="hidden sm:inline">View spec</span>
            </button>
          )}

          <button onClick={handleGoGetStarted} className="btn btn-secondary">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 5v14M5 12h14"
              />
            </svg>
            <span className="hidden sm:inline">New spec</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile drawer backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        )}

        <Sidebar
          endpoints={endpoints}
          onSelect={(ep) => {
            setSelected(ep);
            setSidebarOpen(false);
          }}
          selected={selected}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {specViewerOpen && spec && (
          <SpecViewerModal spec={spec} onClose={() => setSpecViewerOpen(false)} />
        )}

        <main className="flex-1 overflow-y-auto">
          {selected ? (
            <MethodRenderer
              key={`${selected.method}-${selected.path}`}
              endpoint={selected}
              onExecute={handleExecute}
              loading={loading}
              baseUrl={baseUrl}
            />
          ) : (
            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
              {/* API overview */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink sm:text-[1.75rem]">
                  {spec?.info?.title || "API overview"}
                </h1>
                {spec?.info?.version && (
                  <span className="font-mono text-sm text-faint">
                    v{spec.info.version}
                  </span>
                )}
              </div>
              {spec?.info?.description && (
                <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-muted">
                  {spec.info.description}
                </p>
              )}

              <dl className="panel mt-8 grid divide-y divide-line sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:divide-x sm:divide-y-0">
                <div className="min-w-0 px-5 py-4">
                  <dt className="text-sm text-muted">Requests go to</dt>
                  <dd className="mt-1 break-all font-mono text-[13px] text-ink">
                    {baseUrl}
                  </dd>
                </div>
                <div className="px-5 py-4">
                  <dt className="text-sm text-muted">
                    {endpoints.length} endpoints
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(methodCounts).map(([method, count]) => (
                      <span
                        key={method}
                        className={`method-pill method-pill-${method} gap-1.5`}
                      >
                        {method.toUpperCase()}
                        <span className="font-normal opacity-75">{count}</span>
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>

              <div className="mt-10">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">
                    Endpoint groups
                  </h2>
                  <p className="text-xs text-faint">
                    Press{" "}
                    <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink">
                      /
                    </kbd>{" "}
                    to search all endpoints
                  </p>
                </div>
                <ul className="panel divide-y divide-line overflow-hidden">
                  {Object.entries(tagGroups).map(([tag, eps]) => (
                    <li key={tag}>
                      <button
                        onClick={() => setSelected(eps[0])}
                        className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-paper"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium text-ink">
                            {tag}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-xs text-faint">
                            {Array.from(new Set(eps.map((ep) => ep.path))).join(
                              "  ",
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-muted">
                          {eps.length} {eps.length === 1 ? "endpoint" : "endpoints"}
                        </span>
                        <svg
                          className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ExplorerPage;

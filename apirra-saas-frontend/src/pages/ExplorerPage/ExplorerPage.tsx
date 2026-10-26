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

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-6">
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
              <p className="hidden min-w-0 items-baseline gap-2 border-l border-line pl-3 text-sm sm:flex">
                <span className="truncate font-medium text-ink">
                  {spec.info.title}
                </span>
                {spec.info.version && (
                  <span className="shrink-0 font-mono text-xs text-faint">
                    v{spec.info.version}
                  </span>
                )}
              </p>
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
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-medium text-ink">
                Select an endpoint to get started
              </p>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                {endpoints.length} endpoints loaded. Pick one from the list, or
                press{" "}
                <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
                  /
                </kbd>{" "}
                to search.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ExplorerPage;

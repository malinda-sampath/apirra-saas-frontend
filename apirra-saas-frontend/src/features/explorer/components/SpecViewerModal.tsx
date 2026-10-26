import { useEffect, useMemo, useState } from "react";
import type { OpenAPIV3 } from "openapi-types";
import type { OpenAPISpec } from "../types";
import { httpMethods } from "../types";

const METHOD_STYLES: Record<string, string> = {
  get: "method-pill method-pill-get",
  post: "method-pill method-pill-post",
  put: "method-pill method-pill-put",
  delete: "method-pill method-pill-delete",
  patch: "method-pill method-pill-patch",
};

type GroupedOperation = {
  path: string;
  method: string;
  operation: OpenAPIV3.OperationObject;
};

type Tab = "overview" | "raw";

type Props = {
  spec: OpenAPISpec;
  onClose: () => void;
};

const SpecViewerModal: React.FC<Props> = ({ spec, onClose }) => {
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);

  // Read-only viewer: closes on Escape like any other dismissible overlay.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const rawJson = useMemo(() => JSON.stringify(spec, null, 2), [spec]);

  const groupedByTag = useMemo(() => {
    const groups: Record<string, GroupedOperation[]> = {};

    Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      httpMethods.forEach((method) => {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | OpenAPIV3.OperationObject
          | undefined;
        if (!operation) return;

        const tag = operation.tags?.[0] || "default";
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push({ path, method, operation });
      });
    });

    return groups;
  }, [spec]);

  const endpointCount = Object.values(groupedByTag).reduce(
    (sum, ops) => sum + ops.length,
    0,
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; nothing to recover
      // from here since this is a convenience action, not a required one.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileSlug = (spec.info?.title || "openapi")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    link.href = url;
    link.download = `${fileSlug || "openapi"}-spec.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabClass = (isActive: boolean) =>
    `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition ${
      isActive
        ? "border-ink text-ink"
        : "border-transparent text-muted hover:text-ink"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="OpenAPI specification viewer"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40"
      />

      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-ink/25">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="truncate text-lg font-semibold tracking-[-0.01em] text-ink">
                {spec.info?.title || "API specification"}
              </h2>
              {spec.info?.version && (
                <span className="shrink-0 font-mono text-xs text-faint">
                  v{spec.info.version}
                </span>
              )}
            </div>
            {spec.info?.description && (
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted">
                {spec.info.description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close spec viewer"
            className="btn btn-quiet h-8 w-8 shrink-0 p-0"
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
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* TABS + ACTIONS */}
        <div
          role="tablist"
          className="flex flex-wrap items-end gap-5 border-b border-line px-5 sm:px-6"
        >
          <button
            onClick={() => setTab("overview")}
            role="tab"
            aria-selected={tab === "overview"}
            className={tabClass(tab === "overview")}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("raw")}
            role="tab"
            aria-selected={tab === "raw"}
            className={tabClass(tab === "raw")}
          >
            Raw JSON
          </button>

          <div className="mb-1.5 ml-auto flex items-center gap-1">
            <button onClick={handleCopy} className="btn btn-quiet text-[13px]">
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button
              onClick={handleDownload}
              className="btn btn-quiet text-[13px]"
            >
              Download
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {tab === "overview" ? (
            <div className="space-y-7">
              {spec.servers && spec.servers.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted">
                    Servers
                  </h3>
                  <div className="space-y-1.5">
                    {spec.servers.map((server, i) => (
                      <code
                        key={`${server.url}-${i}`}
                        className="block break-all rounded-md bg-sunken px-3 py-2 font-mono text-[13px] text-ink"
                      >
                        {server.url}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted">
                {endpointCount} endpoint{endpointCount === 1 ? "" : "s"} across{" "}
                {Object.keys(groupedByTag).length} tag
                {Object.keys(groupedByTag).length === 1 ? "" : "s"}
              </p>

              {Object.entries(groupedByTag).map(([tag, ops]) => (
                <div key={tag}>
                  <h3 className="mb-2 text-sm font-semibold text-ink">
                    {tag}{" "}
                    <span className="font-normal text-faint">{ops.length}</span>
                  </h3>
                  <div className="divide-y divide-line border-y border-line">
                    {ops.map(({ path, method, operation }) => (
                      <div
                        key={`${method}-${path}`}
                        className="flex items-start gap-3 py-2"
                      >
                        <span
                          className={`mt-px shrink-0 ${
                            METHOD_STYLES[method] ?? "method-pill"
                          }`}
                        >
                          {method.toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <code className="block truncate font-mono text-[13px] text-ink">
                            {path}
                          </code>
                          {operation.summary && (
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {operation.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="code-block overflow-auto">{rawJson}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecViewerModal;

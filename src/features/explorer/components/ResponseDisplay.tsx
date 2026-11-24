import React from "react";
import { highlightJson } from "../utils/highlightJson";

type ResponseDisplayProps = {
  response: unknown;
  baseUrl: string;
  path: string;
  paramValues: Record<string, string>;
  onCopy: (text: string) => void;
  activeTab: "response" | "request";
  onTabChange: (tab: "response" | "request") => void;
  isLoading?: boolean;
};

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  415: "Unsupported Media Type",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

// executeRequest resolves to { success, status, data, headers } or
// { success: false, status?, data?, message }; validation failures and
// ExplorerPage's catch produce { success?: false, error }. Pull the parts
// worth showing out of whichever shape arrived.
type Normalized = {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
  problem?: string;
};

const normalize = (response: unknown): Normalized => {
  if (typeof response !== "object" || response === null) {
    return { body: response };
  }

  const r = response as Record<string, unknown>;
  const status = typeof r.status === "number" ? r.status : undefined;
  const headers =
    typeof r.headers === "object" && r.headers !== null
      ? (r.headers as Record<string, string>)
      : undefined;
  const problem =
    typeof r.error === "string"
      ? r.error
      : typeof r.message === "string"
        ? r.message
        : undefined;

  if ("data" in r || "status" in r) {
    return { status, body: r.data, headers, problem };
  }

  return { body: problem === undefined ? response : undefined, problem };
};

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

const statusTone = (status: number) =>
  status < 300
    ? "bg-accent/10 text-accent"
    : status < 400
      ? "bg-sunken text-ink-soft"
      : "bg-danger/10 text-danger";

const tabClass = (isActive: boolean) =>
  `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition ${
    isActive
      ? "border-ink text-ink"
      : "border-transparent text-muted hover:text-ink"
  }`;

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  response,
  baseUrl,
  path,
  paramValues,
  onCopy,
  activeTab,
  onTabChange,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Waiting for the server to respond…
      </div>
    );
  }

  if (response === null) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">No response yet</p>
        <p className="mt-1 text-sm text-muted">
          Fill in anything required above, then press Send.
        </p>
      </div>
    );
  }

  const cleanBaseUrl = (url: string) => {
    try {
      const u = new URL(url);

      return `${u.protocol}//${u.host}`;
    } catch {
      return url;
    }
  };

  const { status, body, headers, problem } = normalize(response);
  const hasBody = body !== undefined && body !== "";
  const bodyText = !hasBody
    ? ""
    : typeof body === "string"
      ? body
      : JSON.stringify(body, null, 2);
  const isJson = hasBody && typeof body !== "string";
  const headerEntries = headers ? Object.entries(headers) : [];
  // A network failure (CORS, server down, bad host) comes back with no
  // status at all, which is worth explaining rather than just echoing.
  const noResponse = status === undefined && problem !== undefined;

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        className="flex flex-wrap items-end gap-5 border-b border-line"
      >
        <button
          onClick={() => onTabChange("response")}
          className={tabClass(activeTab === "response")}
          aria-selected={activeTab === "response"}
          role="tab"
        >
          Response
        </button>
        <button
          onClick={() => onTabChange("request")}
          className={tabClass(activeTab === "request")}
          aria-selected={activeTab === "request"}
          role="tab"
        >
          Request details
        </button>
        {hasBody && (
          <button
            onClick={() => onCopy(bodyText)}
            className="btn btn-quiet mb-1.5 ml-auto text-[13px]"
            aria-label="Copy response"
          >
            Copy
          </button>
        )}
      </div>

      {activeTab === "response" ? (
        <div className="space-y-3">
          {/* Status line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {status !== undefined ? (
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[13px] font-semibold ${statusTone(status)}`}
              >
                {status} {STATUS_TEXT[status] ?? ""}
              </span>
            ) : (
              <span className="rounded-md bg-danger/10 px-2 py-0.5 text-[13px] font-semibold text-danger">
                {noResponse ? "No response" : "Not sent"}
              </span>
            )}
            {hasBody && (
              <span className="text-faint">
                {formatBytes(new Blob([bodyText]).size)}
              </span>
            )}
          </div>

          {problem && (
            <div className="rounded-lg border border-danger/25 bg-danger/5 px-4 py-3 text-sm">
              <p className="font-medium text-danger">{problem}</p>
              {noResponse && /network/i.test(problem) && (
                <p className="mt-1 leading-relaxed text-muted">
                  The request never got a reply. Check that the server is
                  running and that it allows requests from this site (CORS).
                </p>
              )}
            </div>
          )}

          {hasBody ? (
            <pre className="code-block max-h-[32rem] min-h-32 overflow-auto whitespace-pre-wrap break-words">
              {isJson ? highlightJson(bodyText) : bodyText}
            </pre>
          ) : (
            status !== undefined && (
              <p className="rounded-lg bg-sunken px-4 py-3 text-sm text-muted">
                The response has no body.
              </p>
            )
          )}

          {headerEntries.length > 0 && (
            <details className="group rounded-lg border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                <svg
                  className="h-3 w-3 -rotate-90 transition-transform group-open:rotate-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                Response headers
                <span className="text-faint">{headerEntries.length}</span>
              </summary>
              <dl className="divide-y divide-line border-t border-line">
                {headerEntries.map(([name, value]) => (
                  <div
                    key={name}
                    className="grid gap-1 px-4 py-2 font-mono text-[12.5px] sm:grid-cols-[14rem_1fr] sm:gap-4"
                  >
                    <dt className="text-muted">{name}</dt>
                    <dd className="break-all text-ink">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      ) : (
        <dl className="panel divide-y divide-line text-sm">
          {/* URL */}
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
            <dt className="text-muted">URL</dt>
            <dd className="break-all font-mono text-[13px] text-ink">
              {cleanBaseUrl(baseUrl)}
              {path}
            </dd>
          </div>

          {/* Method */}
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
            <dt className="text-muted">Method</dt>
            <dd className="font-mono text-[13px] font-semibold text-ink">
              GET
            </dd>
          </div>

          {/* Parameters */}
          {Object.keys(paramValues).length > 0 && (
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <dt className="text-muted">Parameters sent</dt>
              <dd>
                <pre className="overflow-auto font-mono text-[13px] text-ink">
                  {JSON.stringify(paramValues, null, 2)}
                </pre>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
};

export default ResponseDisplay;

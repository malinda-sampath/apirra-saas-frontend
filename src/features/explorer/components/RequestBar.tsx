import React, { Fragment, type ReactNode } from "react";
import type { HttpMethod } from "../types";

type RequestBarProps = {
  method: HttpMethod;
  baseUrl: string;
  /** The templated path from the spec, e.g. /users/{id} */
  path: string;
  paramValues: Record<string, string>;
  queryParams: Record<string, string>;
  /** Action buttons (Send, Cancel, …) shown to the right of the URL. */
  children: ReactNode;
};

const METHOD_TEXT: Record<string, string> = {
  get: "text-get",
  post: "text-post",
  put: "text-put",
  delete: "text-delete",
  patch: "text-patch",
};

// Same origin-only reduction CurlGenerator/executeRequest apply, so the
// preview matches the URL that's actually requested.
const originOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
};

/**
 * Sticky "METHOD | URL | Send" row at the top of an endpoint. The URL is a
 * live preview: filled-in path params replace their {placeholders}, and
 * empty ones stay highlighted so it's obvious what's still missing.
 */
const RequestBar: React.FC<RequestBarProps> = ({
  method,
  baseUrl,
  path,
  paramValues,
  queryParams,
  children,
}) => {
  const segments = path.split(/(\{[^}]+\})/g).filter(Boolean);
  const queryString =
    Object.keys(queryParams).length > 0
      ? "?" + new URLSearchParams(queryParams).toString()
      : "";

  const fullUrl =
    originOf(baseUrl) +
    segments
      .map((s) => {
        const name = s.startsWith("{") ? s.slice(1, -1) : null;
        return name && paramValues[name]
          ? encodeURIComponent(paramValues[name])
          : s;
      })
      .join("") +
    queryString;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <div
        className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-line-strong bg-surface"
        title={fullUrl}
      >
        <span
          className={`flex shrink-0 items-center border-r border-line bg-sunken px-3 font-mono text-[13px] font-semibold ${
            METHOD_TEXT[method] ?? "text-ink"
          }`}
        >
          {method.toUpperCase()}
        </span>
        <code className="min-w-0 flex-1 truncate px-3 py-2.5 font-mono text-[13px] leading-5">
          <span className="hidden text-faint sm:inline">{originOf(baseUrl)}</span>
          {segments.map((s, i) => {
            const name = s.startsWith("{") ? s.slice(1, -1) : null;
            if (!name) {
              return (
                <span key={i} className="text-ink">
                  {s}
                </span>
              );
            }
            const value = paramValues[name];
            return (
              <Fragment key={i}>
                {value ? (
                  <span className="font-medium text-accent">
                    {encodeURIComponent(value)}
                  </span>
                ) : (
                  <span className="rounded bg-put/10 px-0.5 text-put">{s}</span>
                )}
              </Fragment>
            );
          })}
          {queryString && <span className="text-muted">{queryString}</span>}
        </code>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
};

export default RequestBar;

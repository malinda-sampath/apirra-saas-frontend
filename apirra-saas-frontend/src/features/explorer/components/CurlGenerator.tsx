import React, { useMemo } from "react";
import type { HttpMethod } from "../types";

type CurlGeneratorProps = {
  method: HttpMethod;
  baseUrl: string;
  path: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  onCopy: (text: string) => void;
  isVisible: boolean;
  onToggle: () => void;
};

// Methods that conventionally carry a request body
const BODY_METHODS = new Set(["post", "put", "patch"]);

const CurlGenerator: React.FC<CurlGeneratorProps> = ({
  method,
  baseUrl,
  path,
  queryParams = {},
  headers = {},
  body,
  onCopy,
  isVisible,
  onToggle,
}) => {
  const curlCommand = useMemo(() => {
    const cleanBaseUrl = (url: string) => {
      try {
        const u = new URL(url);

        return `${u.protocol}//${u.host}`;
      } catch {
        return url;
      }
    };

    const base = cleanBaseUrl(baseUrl);

    const queryString =
      Object.keys(queryParams).length > 0
        ? "?" + new URLSearchParams(queryParams).toString()
        : "";

    const fullUrl = `${base}${path}${queryString}`;

    let curl = `curl -X ${method.toUpperCase()} "${fullUrl}"`;

    const normalizedMethod = method.toLowerCase();
    const supportsBody = BODY_METHODS.has(normalizedMethod);
    const hasBody =
      supportsBody &&
      body !== undefined &&
      body !== null &&
      !(typeof body === "string" && body.trim() === "");

    // Include a Content-Type header automatically when sending a JSON body,
    // unless the caller already specified one explicitly.
    const hasContentTypeHeader = Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type",
    );

    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        curl += ` \\\n  -H "${key}: ${value}"`;
      }
    });

    if (hasBody) {
      if (!hasContentTypeHeader) {
        curl += ` \\\n  -H "Content-Type: application/json"`;
      }

      const bodyString =
        typeof body === "string" ? body : JSON.stringify(body, null, 2);

      // Escape any double quotes so the payload stays valid inside the
      // single-quoted -d argument.
      const escapedBody = bodyString.replace(/'/g, `'\\''`);

      curl += ` \\\n  -d '${escapedBody}'`;
    }

    return curl;
  }, [method, baseUrl, path, queryParams, headers, body]);

  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className="btn btn-quiet -ml-2.5 text-[13px]"
        aria-expanded={isVisible}
        aria-controls="curl-command-section"
      >
        <svg
          className={`h-3 w-3 transition-transform ${isVisible ? "" : "-rotate-90"}`}
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
        {isVisible ? "Hide cURL" : "Show cURL"}
      </button>

      {isVisible && (
        <div
          id="curl-command-section"
          className="overflow-hidden rounded-lg bg-terminal text-terminal-text"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <p className="text-xs text-terminal-text/60">
              Same request, ready for a terminal
            </p>
            <button
              onClick={() => onCopy(curlCommand)}
              className="rounded px-2 py-1 text-xs font-medium text-terminal-text/80 transition hover:bg-white/10 hover:text-terminal-text"
              aria-label="Copy cURL command"
            >
              Copy
            </button>
          </div>

          <div className="overflow-x-auto px-4 py-3">
            <code className="block whitespace-pre font-mono text-[12.5px] leading-relaxed">
              {curlCommand}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurlGenerator;

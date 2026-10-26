import React from "react";

type ResponseDisplayProps = {
  response: unknown;
  baseUrl: string;
  path: string;
  paramValues: Record<string, string>;
  onCopy: (text: string) => void;
  activeTab: "response" | "request";
  onTabChange: (tab: "response" | "request") => void;
};

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
}) => {
  if (response === null) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
        <p className="text-sm text-muted">
          The response will show up here after you send the request.
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

  const responseText =
    typeof response === "string" ? response : JSON.stringify(response, null, 2);

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
        <button
          onClick={() => onCopy(responseText)}
          className="btn btn-quiet mb-1.5 ml-auto text-[13px]"
          aria-label="Copy response"
        >
          Copy
        </button>
      </div>

      {activeTab === "response" ? (
        <pre className="code-block max-h-[28rem] min-h-48 overflow-auto">
          {responseText}
        </pre>
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

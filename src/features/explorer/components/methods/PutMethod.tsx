import { useEffect, useState } from "react";
import type { OpenAPIV3 } from "openapi-types";
import ParameterSection from "../ParameterSection";
import CurlGenerator from "../CurlGenerator";
import RequestBar from "../RequestBar";
import ResponseDisplay from "../ResponseDisplay";
import RequestHistory from "../RequestHistory";
import type { HistoryItem } from "../RequestHistory";
import ToastContainer from "../ToastContainer";
import type { Toast, ExecutePayload, ParsedApiMethod } from "../../types";

type PutMethodProps = {
  endpoint: ParsedApiMethod;
  onExecute: (payload: ExecutePayload) => Promise<unknown>;
  loading?: boolean;
  baseUrl: string;
};

const PutMethod: React.FC<PutMethodProps> = ({
  endpoint,
  onExecute,
  loading,
  baseUrl,
}) => {
  // State Management
  const [response, setResponse] = useState<unknown>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState(
    endpoint.requestExample !== undefined
      ? JSON.stringify(endpoint.requestExample, null, 2)
      : "",
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCurl, setShowCurl] = useState(false);
  const [activeTab, setActiveTab] = useState<"request" | "response">(
    "response",
  );
  const [requestHistory, setRequestHistory] = useState<HistoryItem[]>([]);

  // Constants
  const params = endpoint.parameters ?? [];
  const responses = endpoint.responses ?? {};

  // Group parameters by location
  const groupedParams = {
    path: params.filter((p) => p.in === "path"),
    query: params.filter((p) => p.in === "query"),
    header: params.filter((p) => p.in === "header"),
    cookie: params.filter((p) => p.in === "cookie"),
  };

  // ==================== Handlers ====================

  const addToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("Copied to clipboard", "success");
  };

  const handleParamChange = (paramName: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleReset = () => {
    setParamValues({});
    setResponse(null);
    addToast("Parameters cleared", "info");
  };

  const handleTry = async () => {
    // Validate required parameters
    const missing = params.find(
      (p) => p.required && !paramValues[p.name]?.trim(),
    );

    if (missing) {
      addToast(`${missing.name} is required`, "error");
      setResponse({
        success: false,
        error: `${missing.name} is required.`,
      });
      return;
    }

    // Validate & parse JSON body
    let parsedBody: unknown = undefined;
    if (requestBody.trim()) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        addToast("Invalid JSON body", "error");
        setResponse({
          success: false,
          error: "Invalid JSON body",
        });
        return;
      }
    }

    setIsRunning(true);
    setActiveTab("response");

    try {
      // Replace path parameters
      let finalPath = endpoint.path;

      groupedParams.path.forEach((p) => {
        finalPath = finalPath.replace(
          `{${p.name}}`,
          encodeURIComponent(paramValues[p.name] ?? ""),
        );
      });

      // Collect query parameters
      const queryParams = Object.fromEntries(
        groupedParams.query
          .map((p) => [p.name, paramValues[p.name]])
          .filter(([, value]) => value !== undefined && value !== ""),
      );

      const res = await onExecute({
        method: "put",
        path: finalPath,
        baseUrl,
        body: parsedBody,
        queryParams,
        headers: {},
      });

      setResponse(res);

      // Add to history
      setRequestHistory((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          path: finalPath,
          params: paramValues,
        },
        ...prev.slice(0, 9), // Keep last 10 requests
      ]);

      addToast("Request successful", "success");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Request failed";
      setResponse({
        success: false,
        error: errorMsg,
      });
      addToast(errorMsg, "error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRestoreFromHistory = (params: Record<string, string>) => {
    setParamValues(params);
    addToast("Parameters restored", "info");
  };

  // ==================== Build Final Path for cURL ====================

  let finalPathForCurl = endpoint.path;
  groupedParams.path.forEach((p) => {
    finalPathForCurl = finalPathForCurl.replace(
      `{${p.name}}`,
      encodeURIComponent(paramValues[p.name] ?? ""),
    );
  });

  const queryParams = Object.fromEntries(
    groupedParams.query
      .map((p) => [p.name, paramValues[p.name]])
      .filter(([, value]) => value !== undefined && value !== ""),
  );

  let curlBody: unknown = undefined;
  if (requestBody.trim()) {
    try {
      curlBody = JSON.parse(requestBody);
    } catch {
      curlBody = undefined;
    }
  }

  const resetState = () => {
    setResponse(null);
    setParamValues({});
    setRequestBody(
      endpoint.requestExample !== undefined
        ? JSON.stringify(endpoint.requestExample, null, 2)
        : "",
    );
    setActiveTab("request");
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      resetState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.path]);
  // ==================== Render ==================

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-8">
      {/* Header */}
      <header className="pb-5 pt-6 sm:pt-8">
        <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">
          {endpoint.summary || endpoint.path}
        </h1>
        {endpoint.description && endpoint.description !== endpoint.summary && (
          <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-muted">
            {endpoint.description}
          </p>
        )}
      </header>

      {/* Request bar - stays visible while scrolling */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <RequestBar
          method={endpoint.method}
          baseUrl={baseUrl}
          path={endpoint.path}
          paramValues={paramValues}
          queryParams={queryParams}
        >
          <button
              onClick={handleTry}
              disabled={loading || isRunning}
              className="btn btn-primary flex-1 px-5 py-2.5 sm:min-w-28 sm:flex-none"
              aria-label={isRunning ? "Sending request" : "Send request"}
            >
              {loading || isRunning ? (
                <>
                  <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
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
                  Sending…
                </>
              ) : (
                <>Send</>
              )}
            </button>
        </RequestBar>
      </div>

      <div className="mt-8 space-y-10">
        {/* Parameters Section */}
        {params.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Parameters</h2>
              <button
                onClick={handleReset}
                className="btn btn-quiet text-[13px]"
                disabled={
                  isRunning || loading || Object.keys(paramValues).length === 0
                }
                aria-label="Clear all parameters"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-6">
              {groupedParams.path.length > 0 && (
                <ParameterSection
                  title="Path parameters"
                  params={groupedParams.path}
                  paramValues={paramValues}
                  onParamChange={handleParamChange}
                  disabled={isRunning}
                  loading={loading}
                />
              )}
              {groupedParams.query.length > 0 && (
                <ParameterSection
                  title="Query parameters"
                  params={groupedParams.query}
                  paramValues={paramValues}
                  onParamChange={handleParamChange}
                  disabled={isRunning}
                  loading={loading}
                />
              )}
              {groupedParams.header.length > 0 && (
                <ParameterSection
                  title="Headers"
                  params={groupedParams.header}
                  paramValues={paramValues}
                  onParamChange={handleParamChange}
                  disabled={isRunning}
                  loading={loading}
                />
              )}
              {groupedParams.cookie.length > 0 && (
                <ParameterSection
                  title="Cookies"
                  params={groupedParams.cookie}
                  paramValues={paramValues}
                  onParamChange={handleParamChange}
                  disabled={isRunning}
                  loading={loading}
                />
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No parameters for this endpoint.
          </p>
        )}

        {/* Request Body Section */}
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">Request body</h2>
            <p className="text-xs text-faint">
              {endpoint.requestExample !== undefined
                ? "JSON, pre-filled from the schema"
                : "JSON"}
            </p>
          </div>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            rows={10}
            spellCheck={false}
            disabled={isRunning || loading}
            className="field min-h-[280px] resize-y overflow-auto p-4 font-mono text-[13px] leading-relaxed"
            aria-label="Request body JSON"
          />
        </div>

        {/* Response */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-ink">Response</h2>
          <ResponseDisplay
            response={response}
            baseUrl={baseUrl}
            path={finalPathForCurl}
            paramValues={paramValues}
            onCopy={copyToClipboard}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isLoading={isRunning}
          />

          {/* cURL Generator Component */}
          <div className="mt-4">
            <CurlGenerator
              method={endpoint.method}
              baseUrl={baseUrl}
              path={finalPathForCurl}
              queryParams={queryParams}
              headers={{}}
              body={curlBody}
              onCopy={copyToClipboard}
              isVisible={showCurl}
              onToggle={() => setShowCurl(!showCurl)}
            />
          </div>
        </div>

        {/* Responses Documentation */}
        {Object.keys(responses).length > 0 && (
          <div>
            <h2 className="mb-3 text-base font-semibold text-ink">
              Possible responses
            </h2>
            <div className="panel divide-y divide-line">
              {Object.entries(responses).map(
                ([code, resp]: [string, OpenAPIV3.ResponseObject]) => {
                  const isSuccess = code.startsWith("2");
                  return (
                    <div
                      key={code}
                      className="flex items-baseline gap-4 px-4 py-2.5"
                    >
                      <span
                        className={`w-10 shrink-0 font-mono text-[13px] font-semibold ${
                          isSuccess ? "text-accent" : "text-danger"
                        }`}
                      >
                        {code}
                      </span>
                      <p className="text-sm text-ink-soft">
                        {resp.description ?? "No description"}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Request History Component */}
        <RequestHistory
          history={requestHistory}
          onSelectRequest={handleRestoreFromHistory}
        />
      </div>

      {/* Toast Container Component */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default PutMethod;

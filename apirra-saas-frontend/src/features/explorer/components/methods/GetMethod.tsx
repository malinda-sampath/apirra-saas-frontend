import { useEffect, useState } from "react";
import type { OpenAPIV3 } from "openapi-types";
import ParameterSection from "../ParameterSection";
import CurlGenerator from "../CurlGenerator";
import ResponseDisplay from "../ResponseDisplay";
import RequestHistory from "../RequestHistory";
import type { HistoryItem } from "../RequestHistory";
import ToastContainer from "../ToastContainer";
import type { Toast, ExecutePayload, ParsedApiMethod } from "../../types";

type GetMethodProps = {
  endpoint: ParsedApiMethod;
  onExecute: (payload: ExecutePayload) => Promise<unknown>;
  loading?: boolean;
  baseUrl: string;
};

const GetMethod: React.FC<GetMethodProps> = ({
  endpoint,
  onExecute,
  loading,
  baseUrl,
}) => {
  // State Management
  const [response, setResponse] = useState<unknown>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
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
        method: "get",
        path: finalPath,
        baseUrl,
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

  const resetState = () => {
    setResponse(null);
    setParamValues({});
    setActiveTab("request");
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      resetState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [endpoint.path]);
  // ==================== Render ==================

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-6 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="space-y-2 border-b border-line pb-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm font-semibold text-get">
            GET
          </span>
          <h1 className="min-w-0 break-all font-mono text-lg font-medium tracking-[-0.01em] text-ink sm:text-xl">
            {endpoint.path}
          </h1>
        </div>
        {endpoint.summary && (
          <p className="text-[15px] leading-relaxed text-muted">
            {endpoint.summary}
          </p>
        )}
        <p className="break-all font-mono text-xs text-faint">
          {baseUrl}
          {endpoint.path}
        </p>
      </header>

      {/* Parameters Section */}
      {params.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
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
      )}

      {/* Responses Documentation */}
      {Object.keys(responses).length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-ink">
            Responses
          </h2>
          <div className="divide-y divide-line border-t border-line">
            {Object.entries(responses).map(
              ([code, resp]: [string, OpenAPIV3.ResponseObject]) => {
                const isSuccess = code.startsWith("2");
                return (
                  <div
                    key={code}
                    className="flex items-baseline gap-4 py-2.5"
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

      {/* Request Execution Section */}
      <div className="space-y-4 border-t border-line pt-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleTry}
            disabled={loading || isRunning}
            className="btn btn-primary px-5"
            aria-label={isRunning ? "Sending request" : "Send request"}
          >
            {loading || isRunning ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
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
              <>Send request</>
            )}
          </button>
        </div>

        {/* cURL Generator Component */}
        <CurlGenerator
          method={endpoint.method}
          baseUrl={baseUrl}
          path={finalPathForCurl}
          queryParams={queryParams}
          headers={{}}
          onCopy={copyToClipboard}
          isVisible={showCurl}
          onToggle={() => setShowCurl(!showCurl)}
        />

        {/* Response Display Component */}
        <ResponseDisplay
          response={response}
          baseUrl={baseUrl}
          path={finalPathForCurl}
          paramValues={paramValues}
          onCopy={copyToClipboard}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Request History Component */}
      <RequestHistory
        history={requestHistory}
        onSelectRequest={handleRestoreFromHistory}
      />

      {/* Toast Container Component */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default GetMethod;

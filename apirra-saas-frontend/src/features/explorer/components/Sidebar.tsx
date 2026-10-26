import { useEffect, useMemo, useRef, useState } from "react";
import type { HttpMethod, ParsedApiMethod } from "../types";

const METHOD_STYLES: Record<string, string> = {
  get: "method-pill method-pill-get",
  post: "method-pill method-pill-post",
  put: "method-pill method-pill-put",
  delete: "method-pill method-pill-delete",
  patch: "method-pill method-pill-patch",
};

const METHOD_ORDER: HttpMethod[] = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
];

type Props = {
  endpoints: ParsedApiMethod[];
  onSelect: (ep: ParsedApiMethod) => void;
  selected: ParsedApiMethod | null;
  isOpen?: boolean;
  onClose?: () => void;
};

const isSameEndpoint = (a: ParsedApiMethod | null, b: ParsedApiMethod) =>
  !!a && a.method === b.method && a.path === b.path;

const matchesQuery = (ep: ParsedApiMethod, query: string) => {
  if (!query) return true;
  return (
    ep.path.toLowerCase().includes(query) ||
    ep.method.toLowerCase().includes(query) ||
    ep.summary?.toLowerCase().includes(query) ||
    ep.description?.toLowerCase().includes(query) ||
    ep.operationId?.toLowerCase().includes(query) ||
    ep.tags?.some((tag) => tag.toLowerCase().includes(query))
  );
};

const Sidebar: React.FC<Props> = ({
  endpoints,
  onSelect,
  selected,
  isOpen = false,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [activeMethods, setActiveMethods] = useState<Set<HttpMethod>>(
    new Set(),
  );
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search box with "/" from anywhere on the page.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const availableMethods = useMemo(() => {
    const present = new Set(endpoints.map((ep) => ep.method));
    return METHOD_ORDER.filter((m) => present.has(m));
  }, [endpoints]);

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery !== "" || activeMethods.size > 0;

  const filtered = useMemo(
    () =>
      endpoints.filter(
        (ep) =>
          (activeMethods.size === 0 || activeMethods.has(ep.method)) &&
          matchesQuery(ep, normalizedQuery),
      ),
    [endpoints, activeMethods, normalizedQuery],
  );

  const grouped = filtered.reduce(
    (acc, ep) => {
      const tag = ep.tags?.[0] || "default";
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(ep);
      return acc;
    },
    {} as Record<string, ParsedApiMethod[]>,
  );

  const toggleMethod = (method: HttpMethod) => {
    setActiveMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  };

  const toggleGroup = (tag: string) => {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-surface shadow-xl shadow-ink/10 transition-transform duration-200 ease-out md:static md:z-auto md:w-80 md:translate-x-0 md:shadow-none ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* SEARCH + HEADER */}
      <div className="border-b border-line px-4 pb-3 pt-3">
        <div className="mb-2 flex items-center justify-between md:hidden">
          <p className="text-sm font-medium text-ink">Endpoints</p>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="btn btn-quiet h-8 w-8 p-0"
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
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>

          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field bg-paper py-1.5 pl-8 pr-8 text-[13px]"
            placeholder="Search endpoints"
            aria-label="Search endpoints"
          />

          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-faint hover:bg-sunken hover:text-ink"
            >
              <svg
                className="h-3 w-3"
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
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line-strong px-1.5 font-mono text-[10px] text-faint">
              /
            </kbd>
          )}
        </div>

        {/* METHOD FILTER CHIPS */}
        {availableMethods.length > 1 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {availableMethods.map((method) => {
              const isActive = activeMethods.has(method);
              return (
                <button
                  key={method}
                  onClick={() => toggleMethod(method)}
                  aria-pressed={isActive}
                  className={`${METHOD_STYLES[method] ?? "method-pill"} min-w-0 cursor-pointer px-2 transition ${
                    activeMethods.size > 0 && !isActive
                      ? "opacity-40 hover:opacity-70"
                      : "opacity-100"
                  } ${isActive ? "ring-1 ring-current" : ""}`}
                >
                  {method.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-2.5 text-xs text-faint">
          {isSearching
            ? `${filtered.length} of ${endpoints.length} endpoints`
            : `${endpoints.length} endpoints`}
        </p>
      </div>

      {/* LIST */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">No endpoints match</p>
            <p className="mt-1 text-xs text-muted">
              Try another search term, or clear the method filter.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([tag, eps]) => {
          const isCollapsed = !isSearching && collapsedTags.has(tag);

          return (
            <div key={tag} className="mb-1">
              {/* GROUP HEADER */}
              <button
                onClick={() => toggleGroup(tag)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center gap-1.5 px-4 pb-1 pt-2.5 text-left text-faint hover:text-ink"
              >
                <svg
                  className={`h-3 w-3 shrink-0 transition-transform ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
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
                <p className="text-xs font-medium">
                  {tag} ({eps.length})
                </p>
              </button>

              {/* ITEMS */}
              {!isCollapsed && (
                <div>
                  {eps.map((ep) => {
                    const isActive = isSameEndpoint(selected, ep);

                    return (
                      <button
                        key={`${ep.method}-${ep.path}`}
                        onClick={() => onSelect(ep)}
                        title={ep.summary || ep.path}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex w-full items-start gap-2.5 px-4 py-1.5 text-left transition-colors ${
                          isActive
                            ? "bg-sunken shadow-[inset_2px_0_0_var(--color-ink)]"
                            : "hover:bg-paper"
                        }`}
                      >
                        {/* METHOD */}
                        <span
                          className={`mt-px shrink-0 ${
                            METHOD_STYLES[ep.method] ?? "method-pill"
                          }`}
                        >
                          {ep.method.toUpperCase()}
                        </span>

                        {/* PATH */}
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-mono text-[12px] leading-5 ${
                              isActive ? "font-medium text-ink" : "text-ink-soft"
                            }`}
                          >
                            {ep.path}
                          </span>
                          {ep.summary && (
                            <span className="block truncate text-xs text-faint">
                              {ep.summary}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

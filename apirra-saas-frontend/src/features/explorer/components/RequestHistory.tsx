import React from "react";

export type HistoryItem = {
  timestamp: string;
  path: string;
  params: Record<string, string>;
};

type RequestHistoryProps = {
  history: HistoryItem[];
  onSelectRequest: (params: Record<string, string>) => void;
};

const RequestHistory: React.FC<RequestHistoryProps> = ({
  history,
  onSelectRequest,
}) => {
  if (history.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">History</h2>
        <p className="text-xs text-faint">Click a request to reuse its values</p>
      </div>
      <div className="panel divide-y divide-line overflow-hidden">
        {history.map((req, idx) => (
          <button
            key={idx}
            onClick={() => onSelectRequest(req.params)}
            className="flex w-full items-baseline gap-4 px-4 py-2.5 text-left transition hover:bg-paper"
            aria-label={`Restore request from ${req.timestamp}`}
          >
            <span className="w-20 shrink-0 font-mono text-xs text-faint">
              {req.timestamp}
            </span>
            <code className="min-w-0 truncate font-mono text-[13px] text-ink">
              {req.path}
            </code>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RequestHistory;

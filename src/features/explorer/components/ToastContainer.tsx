import React, { useEffect } from "react";
import type { Toast } from "../types";

type ToastContainerProps = {
  toasts: Toast[];
  onRemove: (id: string) => void;
  autoCloseDuration?: number;
};

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  autoCloseDuration = 3000,
}) => {
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      const oldestToast = toasts[0];
      if (oldestToast) {
        onRemove(oldestToast.id);
      }
    }, autoCloseDuration);

    return () => clearTimeout(timer);
  }, [toasts, onRemove, autoCloseDuration]);

  // Small status mark next to the message; the toast itself stays neutral.
  const getToastColor = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "bg-[#5fc4a4]";
      case "error":
        return "bg-[#f08a7e]";
      case "info":
      default:
        return "bg-[#c6ccc6]";
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 space-y-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:left-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="w-full rounded-lg bg-ink px-4 py-3 text-sm text-paper shadow-lg shadow-ink/20 sm:w-auto sm:min-w-64 sm:max-w-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${getToastColor(toast.type)}`}
            />
            <span className="break-words">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="-mr-1 ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-paper/60 hover:bg-white/10 hover:text-paper"
              aria-label="Dismiss notification"
            >
              <svg
                className="h-3.5 w-3.5"
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
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

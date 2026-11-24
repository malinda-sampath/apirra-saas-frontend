import type { ReactNode } from "react";

// Matches, in order: a quoted string (optionally followed by ":" when it's
// an object key), a literal, or a number.
const TOKEN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

// Past this size the span-per-token output gets heavy, so large documents
// (e.g. a whole spec) fall back to plain text.
const MAX_HIGHLIGHT_LENGTH = 150_000;

/** Splits pretty-printed JSON into colored spans for display in a <pre>. */
export const highlightJson = (text: string): ReactNode => {
  if (text.length > MAX_HIGHLIGHT_LENGTH) return text;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [whole, str, colon, literal] = match;
    const key = match.index;

    if (str !== undefined && colon !== undefined) {
      nodes.push(
        <span key={key} className="text-syntax-key">
          {str}
        </span>,
        colon,
      );
    } else if (str !== undefined) {
      nodes.push(
        <span key={key} className="text-syntax-string">
          {str}
        </span>,
      );
    } else if (literal !== undefined) {
      nodes.push(
        <span key={key} className="text-syntax-literal">
          {whole}
        </span>,
      );
    } else {
      nodes.push(
        <span key={key} className="text-syntax-number">
          {whole}
        </span>,
      );
    }

    lastIndex = match.index + whole.length;
  }

  nodes.push(text.slice(lastIndex));
  return nodes;
};

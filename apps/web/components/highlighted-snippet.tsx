import type { HighlightSpan } from "@aura/shared";
import type { ReactNode } from "react";

export function HighlightedSnippet(props: { text: string; highlights: HighlightSpan[] }) {
  if (props.highlights.length === 0) {
    return <p className="result-snippet">{props.text}</p>;
  }

  const content: ReactNode[] = [];
  let cursor = 0;

  for (const span of props.highlights) {
    if (span.start > cursor) {
      content.push(props.text.slice(cursor, span.start));
    }
    content.push(
      <mark key={`${span.start}-${span.end}`} className="highlight">
        {props.text.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  }

  if (cursor < props.text.length) {
    content.push(props.text.slice(cursor));
  }

  return <p className="result-snippet">{content}</p>;
}

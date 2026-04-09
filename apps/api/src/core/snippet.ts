import type { HighlightSpan } from "@aura/shared";

import { normalizeToken, toSentenceFragments } from "./text.js";

function findHighlightSpans(text: string, terms: string[]): HighlightSpan[] {
  const lowered = text.toLowerCase();
  const spans: HighlightSpan[] = [];
  for (const term of terms) {
    let startIndex = 0;
    while (startIndex < lowered.length) {
      const index = lowered.indexOf(term.toLowerCase(), startIndex);
      if (index === -1) {
        break;
      }
      spans.push({ start: index, end: index + term.length });
      startIndex = index + term.length;
    }
  }
  return spans.sort((left, right) => left.start - right.start);
}

export function createSnippet(text: string, rawTerms: string[], fallback: string): { snippet: string; highlights: HighlightSpan[] } {
  const normalizedTerms = rawTerms.map(normalizeToken).filter(Boolean);
  const sentences = toSentenceFragments(text);
  const bestSentence =
    sentences
      .map((sentence) => ({
        sentence,
        score: normalizedTerms.reduce((score, term) => score + (sentence.toLowerCase().includes(term) ? 1 : 0), 0)
      }))
      .sort((left, right) => right.score - left.score)[0]?.sentence ?? fallback;

  const snippet = bestSentence.length > 220 ? `${bestSentence.slice(0, 217).trimEnd()}...` : bestSentence;
  return {
    snippet,
    highlights: findHighlightSpans(snippet, normalizedTerms)
  };
}

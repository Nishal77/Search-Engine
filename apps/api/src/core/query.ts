import type { SearchQuery } from "@aura/shared";

import { tokenize, uniqueTerms } from "./text.js";

export function parseQuery(raw: string, page = 1, sort: SearchQuery["sort"] = "relevance"): SearchQuery {
  const siteMatch = raw.match(/site:([^\s]+)/i);
  const siteFilter = siteMatch?.[1]?.toLowerCase();
  const phraseMatches = [...raw.matchAll(/"([^"]+)"/g)];
  const phrases = phraseMatches.map((match) => tokenize(match[1]));
  const withoutPhrases = raw.replace(/"([^"]+)"/g, " ");
  const withoutSite = withoutPhrases.replace(/site:[^\s]+/gi, " ");
  const tokens = uniqueTerms([
    ...tokenize(withoutSite),
    ...phrases.flat()
  ]);

  return {
    raw,
    tokens,
    phrases: phrases.filter((phrase) => phrase.length > 0),
    siteFilter,
    sort,
    page: Math.max(1, page),
    pageSize: 10
  };
}

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  const sortedEntries = [...url.searchParams.entries()].sort(([left], [right]) => left.localeCompare(right));
  url.search = "";
  for (const [key, value] of sortedEntries) {
    if (key.toLowerCase().startsWith("utm_")) {
      continue;
    }
    url.searchParams.append(key, value);
  }
  return url.toString();
}

export function getDomain(rawUrl: string): string {
  return new URL(rawUrl).hostname.replace(/^www\./, "");
}

export function scoreUrlCleanliness(rawUrl: string): number {
  const url = new URL(rawUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  const queryPenalty = [...url.searchParams.keys()].length * 0.05;
  const segmentPenalty = Math.max(segments.length - 3, 0) * 0.03;
  const numericPenalty = segments.some((segment) => /\d{4,}/.test(segment)) ? 0.08 : 0;
  return Math.max(0.2, 1 - queryPenalty - segmentPenalty - numericPenalty);
}

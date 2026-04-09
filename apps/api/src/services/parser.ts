import type { DocumentRecord, SourceRecord } from "@aura/shared";

import { hashContent } from "../lib/hash.js";
import { getDomain, normalizeUrl } from "../lib/url.js";

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectMatches(html: string, expression: RegExp): string[] {
  const matches = [...html.matchAll(expression)];
  return matches.map((match) => stripTags(match[1] ?? "")).filter(Boolean);
}

function findFirst(html: string, expression: RegExp, fallback = ""): string {
  return collectMatches(html, expression)[0] ?? fallback;
}

function extractCanonicalUrl(html: string, fallbackUrl: string): string {
  const canonical = findFirst(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i, fallbackUrl);
  return normalizeUrl(canonical);
}

function looksLikeContentPath(pathname: string): boolean {
  return /\/(blog|docs|articles|engineering|learn|guide|research|post|posts)\b/i.test(pathname) || pathname.split("/").filter(Boolean).length >= 2;
}

export function extractSameDomainLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const matches = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)];
  const links = matches
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .flatMap((href) => {
      try {
        const absolute = new URL(href!, base);
        if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
          return [];
        }
        if (absolute.hostname !== base.hostname) {
          return [];
        }
        if (/\.(jpg|jpeg|png|gif|svg|css|js|xml|json|pdf|zip)$/i.test(absolute.pathname)) {
          return [];
        }
        if (!looksLikeContentPath(absolute.pathname)) {
          return [];
        }
        return [normalizeUrl(absolute.toString())];
      } catch {
        return [];
      }
    });

  return [...new Set(links)];
}

export function extractSitemapUrls(xml: string, host: string): string[] {
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
  const urls = matches
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      try {
        const absolute = new URL(entry!);
        if (absolute.host !== host) {
          return [];
        }
        if (!looksLikeContentPath(absolute.pathname)) {
          return [];
        }
        return [normalizeUrl(absolute.toString())];
      } catch {
        return [];
      }
    });
  return [...new Set(urls)];
}

export function parseHtmlToDocument(params: {
  html: string;
  url: string;
  source: SourceRecord;
}): DocumentRecord {
  const { html, url, source } = params;
  const normalizedUrl = normalizeUrl(url);
  const title =
    findFirst(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    findFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i, source.name);
  const headings = [
    ...collectMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    ...collectMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
    ...collectMatches(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi)
  ].slice(0, 8);
  const paragraphs = collectMatches(html, /<p[^>]*>([\s\S]*?)<\/p>/gi);
  const body = paragraphs.join(" ").trim() || stripTags(html);
  const keywords = findFirst(html, /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
  const tags = keywords
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);

  return {
    id: hashContent(normalizedUrl).slice(0, 12),
    sourceId: source.id,
    url: normalizedUrl,
    canonicalUrl: extractCanonicalUrl(html, normalizedUrl),
    title,
    headings,
    body,
    anchorText: [],
    tags,
    site: source.name,
    domain: getDomain(normalizedUrl),
    fetchedAt: new Date().toISOString(),
    contentHash: hashContent(`${title}\n${body}`),
    snippetSeed: paragraphs[0] ?? body.slice(0, 160),
    publishedAt: findFirst(html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) || undefined
  };
}

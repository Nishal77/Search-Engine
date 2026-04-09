import type { CrawlJob, DocumentRecord } from "@aura/shared";

import { extractSameDomainLinks, extractSitemapUrls, parseHtmlToDocument } from "./parser.js";
import type { SearchEngine } from "../core/search-engine.js";
import type { CrawlStore, DocumentStore, SourceRegistry } from "./store.js";
import { normalizeUrl } from "../lib/url.js";
import { hashContent } from "../lib/hash.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRobotsDisallows(robotsTxt: string): string[] {
  return robotsTxt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^disallow:/i.test(line))
    .map((line) => line.split(":")[1]?.trim() ?? "")
    .filter(Boolean);
}

async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const target = new URL(url);
    const robotsUrl = `${target.protocol}//${target.host}/robots.txt`;
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      return true;
    }
    const robotsTxt = await response.text();
    const disallows = parseRobotsDisallows(robotsTxt);
    return !disallows.some((path) => target.pathname.startsWith(path));
  } catch {
    return true;
  }
}

export class CrawlerService {
  private readonly hostSeenAt = new Map<string, number>();
  private readonly maxPagesPerSource = 8;

  constructor(
    private readonly sources: SourceRegistry,
    private readonly documents: DocumentStore,
    private readonly crawlStore: CrawlStore,
    private readonly searchEngine: SearchEngine
  ) {}

  private async throttleFor(host: string): Promise<void> {
    const lastSeen = this.hostSeenAt.get(host);
    const now = Date.now();
    if (lastSeen && now - lastSeen < 400) {
      await delay(400 - (now - lastSeen));
    }
    this.hostSeenAt.set(host, Date.now());
  }

  private async fetchText(url: string): Promise<{ text: string; contentType: string }> {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AuraSearchBot/0.1 (+resume project)"
      }
    });
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    return {
      text: await response.text(),
      contentType: response.headers.get("content-type") ?? ""
    };
  }

  private async discoverUrlsForSource(sourceId: string): Promise<string[]> {
    const source = this.sources.get(sourceId);
    if (!source) {
      return [];
    }

    const discovered = new Set<string>();
    const sitemapCandidates = [
      `https://${source.domain}/sitemap.xml`,
      `https://${source.domain}/sitemap_index.xml`
    ];

    for (const seed of source.seeds) {
      discovered.add(normalizeUrl(seed));
    }

    for (const sitemapUrl of sitemapCandidates) {
      try {
        const normalizedSitemapUrl = normalizeUrl(sitemapUrl);
        if (!(await isAllowedByRobots(normalizedSitemapUrl))) {
          continue;
        }
        await this.throttleFor(new URL(normalizedSitemapUrl).host);
        const { text, contentType } = await this.fetchText(normalizedSitemapUrl);
        if (!/xml/i.test(contentType) && !text.includes("<loc>")) {
          continue;
        }
        for (const url of extractSitemapUrls(text, source.domain).slice(0, this.maxPagesPerSource * 2)) {
          discovered.add(url);
        }
      } catch {
        continue;
      }
    }

    for (const seed of source.seeds.slice(0, 2)) {
      try {
        const normalizedSeed = normalizeUrl(seed);
        if (!(await isAllowedByRobots(normalizedSeed))) {
          continue;
        }
        await this.throttleFor(new URL(normalizedSeed).host);
        const { text, contentType } = await this.fetchText(normalizedSeed);
        if (/html/i.test(contentType) || text.includes("<html")) {
          for (const url of extractSameDomainLinks(text, normalizedSeed).slice(0, this.maxPagesPerSource * 2)) {
            discovered.add(url);
          }
        }
      } catch {
        continue;
      }
    }

    return [...discovered].slice(0, this.maxPagesPerSource);
  }

  async run(limit = 5): Promise<CrawlJob[]> {
    const jobs: CrawlJob[] = [];
    const selectedSources = this.sources.all().slice(0, Math.max(1, limit));

    for (const source of selectedSources) {
      const job: CrawlJob = {
        id: hashContent(`${source.id}-${Date.now()}`).slice(0, 12),
        sourceId: source.id,
        startedAt: new Date().toISOString(),
        fetched: 0,
        indexed: 0,
        skipped: 0,
        status: "running"
      };
      this.crawlStore.pushJob(job);
      jobs.push(job);
      try {
        const frontier = await this.discoverUrlsForSource(source.id);
        for (const candidateUrl of frontier) {
          const normalizedUrl = normalizeUrl(candidateUrl);
          const allowed = await isAllowedByRobots(normalizedUrl);
          if (!allowed) {
            job.skipped += 1;
            continue;
          }
          const host = new URL(normalizedUrl).host;
          await this.throttleFor(host);
          const { text: html, contentType } = await this.fetchText(normalizedUrl);
          if (!/html/i.test(contentType) && !html.includes("<html")) {
            job.skipped += 1;
            continue;
          }
          const document = parseHtmlToDocument({
            html,
            url: normalizedUrl,
            source
          });
          this.insertDocument(document, job);
          job.fetched += 1;
        }
        job.status = "completed";
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown crawl failure";
        job.status = "failed";
        job.error = message;
        this.crawlStore.recordFailure({
          sourceId: source.id,
          url: source.seeds[0],
          error: message,
          createdAt: new Date().toISOString()
        });
      } finally {
        job.finishedAt = new Date().toISOString();
        this.crawlStore.updateJob(job.id, {
          fetched: job.fetched,
          indexed: job.indexed,
          skipped: job.skipped,
          status: job.status,
          error: job.error,
          finishedAt: job.finishedAt
        });
      }
    }

    await this.searchEngine.rebuild();
    return jobs;
  }

  private insertDocument(document: DocumentRecord, job: CrawlJob): void {
    const result = this.documents.upsert(document);
    if (result.inserted) {
      job.indexed += 1;
    } else {
      job.skipped += 1;
    }
  }
}

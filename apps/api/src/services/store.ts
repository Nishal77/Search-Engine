import type {
  CrawlJob,
  DocumentRecord,
  FailureRecord,
  QueryLogRecord,
  SourceRecord
} from "@aura/shared";

import { seedDocuments } from "../data/documents.js";
import { seedSources } from "../data/sources.js";

interface StorePersistence {
  persistSource?(source: SourceRecord): Promise<void>;
  persistDocument?(document: DocumentRecord): Promise<void>;
  persistCrawlJob?(job: CrawlJob): Promise<void>;
  persistFailure?(failure: FailureRecord): Promise<void>;
  persistQueryLog?(log: QueryLogRecord): Promise<void>;
}

function logPersistenceError(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[aura:persistence] ${action} failed: ${message}`);
}

export class SourceRegistry {
  private readonly sources: Map<string, SourceRecord>;

  constructor(
    initialSources: SourceRecord[] = seedSources,
    private readonly persistence?: StorePersistence
  ) {
    this.sources = new Map(initialSources.map((source) => [source.id, source]));
  }

  all(): SourceRecord[] {
    return [...this.sources.values()];
  }

  get(sourceId: string): SourceRecord | undefined {
    return this.sources.get(sourceId);
  }

  upsert(source: SourceRecord): void {
    this.sources.set(source.id, source);
    void this.persistence?.persistSource?.(source).catch((error) => {
      logPersistenceError(`source ${source.id}`, error);
    });
  }
}

export class DocumentStore {
  private readonly documents: Map<string, DocumentRecord>;

  constructor(
    initialDocuments: DocumentRecord[] = seedDocuments,
    private readonly persistence?: StorePersistence
  ) {
    this.documents = new Map(initialDocuments.map((document) => [document.id, document]));
  }

  all(): DocumentRecord[] {
    return [...this.documents.values()];
  }

  get(docId: string): DocumentRecord | undefined {
    return this.documents.get(docId);
  }

  countSeedDocuments(): number {
    return this.all().filter((document) => seedDocuments.some((seed) => seed.id === document.id)).length;
  }

  countDiscoveredDocuments(): number {
    return Math.max(0, this.documents.size - this.countSeedDocuments());
  }

  upsert(document: DocumentRecord): { inserted: boolean; existingId?: string } {
    const duplicate = [...this.documents.values()].find(
      (current) => current.canonicalUrl === document.canonicalUrl || current.contentHash === document.contentHash
    );
    if (duplicate && duplicate.id !== document.id) {
      return { inserted: false, existingId: duplicate.id };
    }
    this.documents.set(document.id, document);
    void this.persistence?.persistDocument?.(document).catch((error) => {
      logPersistenceError(`document ${document.id}`, error);
    });
    return { inserted: true };
  }

  latestFetchAt(): string | undefined {
    return this.all()
      .map((document) => document.fetchedAt)
      .sort((left, right) => right.localeCompare(left))[0];
  }
}

export class CrawlStore {
  private readonly jobs: CrawlJob[];
  private readonly failures: FailureRecord[];

  constructor(
    initialJobs: CrawlJob[] = [],
    initialFailures: FailureRecord[] = [],
    private readonly persistence?: StorePersistence
  ) {
    this.jobs = [...initialJobs];
    this.failures = [...initialFailures];
  }

  pushJob(job: CrawlJob): void {
    this.jobs.unshift(job);
    void this.persistence?.persistCrawlJob?.(job).catch((error) => {
      logPersistenceError(`crawl job ${job.id}`, error);
    });
  }

  updateJob(jobId: string, changes: Partial<CrawlJob>): CrawlJob | undefined {
    const job = this.jobs.find((entry) => entry.id === jobId);
    if (!job) {
      return undefined;
    }
    Object.assign(job, changes);
    void this.persistence?.persistCrawlJob?.(job).catch((error) => {
      logPersistenceError(`crawl job ${job.id}`, error);
    });
    return job;
  }

  allJobs(): CrawlJob[] {
    return [...this.jobs];
  }

  recordFailure(failure: FailureRecord): void {
    this.failures.unshift(failure);
    this.failures.splice(10);
    void this.persistence?.persistFailure?.(failure).catch((error) => {
      logPersistenceError(`crawl failure ${failure.sourceId}`, error);
    });
  }

  allFailures(): FailureRecord[] {
    return [...this.failures];
  }
}

export class QueryLogStore {
  private readonly logs: QueryLogRecord[];

  constructor(
    initialLogs: QueryLogRecord[] = [],
    private readonly persistence?: StorePersistence
  ) {
    this.logs = [...initialLogs];
  }

  push(log: QueryLogRecord): void {
    this.logs.unshift(log);
    this.logs.splice(50);
    void this.persistence?.persistQueryLog?.(log).catch((error) => {
      logPersistenceError(`query log ${log.id}`, error);
    });
  }

  recent(): QueryLogRecord[] {
    return [...this.logs];
  }

  latencyPercentiles(): { p50: number; p95: number; p99: number } {
    const latencies = this.logs.map((log) => log.latencyMs).sort((left, right) => left - right);
    if (latencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }
    const pick = (percentile: number) => {
      const index = Math.min(latencies.length - 1, Math.floor(percentile * (latencies.length - 1)));
      return latencies[index];
    };
    return {
      p50: pick(0.5),
      p95: pick(0.95),
      p99: pick(0.99)
    };
  }
}

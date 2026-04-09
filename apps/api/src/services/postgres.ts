import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CrawlJob,
  DocumentRecord,
  EvaluationJudgement,
  FailureRecord,
  QueryLogRecord,
  SourceRecord
} from "@aura/shared";
import { Pool } from "pg";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(moduleDir, "../data/schema.sql");

function parseMaybeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toIsoString(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(String(value)).toISOString();
}

export class PostgresPersistence {
  private constructor(private readonly pool: Pool) {}

  static async create(connectionString: string): Promise<PostgresPersistence> {
    const pool = new Pool({
      connectionString
    });
    const persistence = new PostgresPersistence(pool);
    await persistence.bootstrap();
    return persistence;
  }

  private async bootstrap(): Promise<void> {
    const schema = await readFile(schemaPath, "utf8");
    await this.pool.query(schema);
  }

  async loadSources(): Promise<SourceRecord[]> {
    const result = await this.pool.query(
      "select id, name, domain, authority_score, tags, seeds from sources order by authority_score desc, name asc"
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      authorityScore: Number(row.authority_score),
      tags: parseMaybeArray(row.tags),
      seeds: parseMaybeArray(row.seeds)
    }));
  }

  async loadDocuments(): Promise<DocumentRecord[]> {
    const result = await this.pool.query(
      `select id, source_id, url, canonical_url, title, headings, body, anchor_text, tags, site, domain,
              author, published_at, fetched_at, content_hash, snippet_seed
       from documents
       order by fetched_at desc, id asc`
    );
    return result.rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      url: row.url,
      canonicalUrl: row.canonical_url,
      title: row.title,
      headings: parseMaybeArray(row.headings),
      body: row.body,
      anchorText: parseMaybeArray(row.anchor_text),
      tags: parseMaybeArray(row.tags),
      site: row.site,
      domain: row.domain,
      author: row.author ?? undefined,
      publishedAt: toIsoString(row.published_at),
      fetchedAt: toIsoString(row.fetched_at) ?? new Date().toISOString(),
      contentHash: row.content_hash,
      snippetSeed: row.snippet_seed
    }));
  }

  async loadCrawlJobs(): Promise<CrawlJob[]> {
    const result = await this.pool.query(
      `select id, source_id, started_at, finished_at, fetched, indexed, skipped, status, error
       from crawl_jobs
       order by started_at desc
       limit 50`
    );
    return result.rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      startedAt: toIsoString(row.started_at) ?? new Date().toISOString(),
      finishedAt: toIsoString(row.finished_at),
      fetched: Number(row.fetched),
      indexed: Number(row.indexed),
      skipped: Number(row.skipped),
      status: row.status,
      error: row.error ?? undefined
    }));
  }

  async loadFailures(): Promise<FailureRecord[]> {
    const result = await this.pool.query(
      `select source_id, url, error, created_at
       from crawl_failures
       order by created_at desc
       limit 10`
    );
    return result.rows.map((row) => ({
      sourceId: row.source_id,
      url: row.url,
      error: row.error,
      createdAt: toIsoString(row.created_at) ?? new Date().toISOString()
    }));
  }

  async loadQueryLogs(): Promise<QueryLogRecord[]> {
    const result = await this.pool.query(
      `select id, query, latency_ms, total_hits, created_at
       from query_logs
       order by created_at desc
       limit 50`
    );
    return result.rows.map((row) => ({
      id: row.id,
      query: row.query,
      latencyMs: Number(row.latency_ms),
      totalHits: Number(row.total_hits),
      createdAt: toIsoString(row.created_at) ?? new Date().toISOString()
    }));
  }

  async loadJudgements(): Promise<EvaluationJudgement[]> {
    const result = await this.pool.query(
      "select query, doc_id, relevance from evaluation_judgements order by query asc, doc_id asc"
    );
    return result.rows.map((row) => ({
      query: row.query,
      docId: row.doc_id,
      relevance: Number(row.relevance) as EvaluationJudgement["relevance"]
    }));
  }

  async persistSource(source: SourceRecord): Promise<void> {
    await this.pool.query(
      `insert into sources (id, name, domain, authority_score, tags, seeds)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update
       set name = excluded.name,
           domain = excluded.domain,
           authority_score = excluded.authority_score,
           tags = excluded.tags,
           seeds = excluded.seeds`,
      [source.id, source.name, source.domain, source.authorityScore, source.tags, source.seeds]
    );
  }

  async persistDocument(document: DocumentRecord): Promise<void> {
    await this.pool.query(
      `insert into documents (
         id, source_id, url, canonical_url, title, headings, body, anchor_text, tags, site, domain,
         author, published_at, fetched_at, content_hash, snippet_seed
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       on conflict (id) do update
       set source_id = excluded.source_id,
           url = excluded.url,
           canonical_url = excluded.canonical_url,
           title = excluded.title,
           headings = excluded.headings,
           body = excluded.body,
           anchor_text = excluded.anchor_text,
           tags = excluded.tags,
           site = excluded.site,
           domain = excluded.domain,
           author = excluded.author,
           published_at = excluded.published_at,
           fetched_at = excluded.fetched_at,
           content_hash = excluded.content_hash,
           snippet_seed = excluded.snippet_seed`,
      [
        document.id,
        document.sourceId,
        document.url,
        document.canonicalUrl,
        document.title,
        document.headings,
        document.body,
        document.anchorText,
        document.tags,
        document.site,
        document.domain,
        document.author ?? null,
        document.publishedAt ?? null,
        document.fetchedAt,
        document.contentHash,
        document.snippetSeed
      ]
    );
  }

  async persistQueryLog(log: QueryLogRecord): Promise<void> {
    await this.pool.query(
      `insert into query_logs (id, query, latency_ms, total_hits, created_at)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [log.id, log.query, log.latencyMs, log.totalHits, log.createdAt]
    );
  }

  async persistFailure(failure: FailureRecord): Promise<void> {
    await this.pool.query(
      `insert into crawl_failures (source_id, url, error, created_at)
       values ($1, $2, $3, $4)`,
      [failure.sourceId, failure.url, failure.error, failure.createdAt]
    );
  }

  async persistCrawlJob(job: CrawlJob): Promise<void> {
    await this.pool.query(
      `insert into crawl_jobs (id, source_id, started_at, finished_at, fetched, indexed, skipped, status, error)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update
       set source_id = excluded.source_id,
           started_at = excluded.started_at,
           finished_at = excluded.finished_at,
           fetched = excluded.fetched,
           indexed = excluded.indexed,
           skipped = excluded.skipped,
           status = excluded.status,
           error = excluded.error`,
      [
        job.id,
        job.sourceId,
        job.startedAt,
        job.finishedAt ?? null,
        job.fetched,
        job.indexed,
        job.skipped,
        job.status,
        job.error ?? null
      ]
    );
  }

  async persistJudgements(judgements: EvaluationJudgement[]): Promise<void> {
    for (const judgement of judgements) {
      await this.pool.query(
        `insert into evaluation_judgements (query, doc_id, relevance)
         values ($1, $2, $3)
         on conflict do nothing`,
        [judgement.query, judgement.docId, judgement.relevance]
      );
    }
  }
}

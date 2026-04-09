CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  authority_score DOUBLE PRECISION NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  seeds TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  url TEXT NOT NULL UNIQUE,
  canonical_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  headings TEXT[] NOT NULL DEFAULT '{}',
  body TEXT NOT NULL,
  anchor_text TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  site TEXT NOT NULL,
  domain TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  snippet_seed TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  fetched INTEGER NOT NULL DEFAULT 0,
  indexed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error TEXT
);

CREATE TABLE IF NOT EXISTS crawl_failures (
  source_id TEXT NOT NULL REFERENCES sources(id),
  url TEXT NOT NULL,
  error TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS query_logs (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  total_hits INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_judgements (
  query TEXT NOT NULL,
  doc_id TEXT NOT NULL REFERENCES documents(id),
  relevance INTEGER NOT NULL CHECK (relevance BETWEEN 0 AND 3),
  PRIMARY KEY (query, doc_id)
);

CREATE INDEX IF NOT EXISTS documents_source_id_idx ON documents(source_id);
CREATE INDEX IF NOT EXISTS documents_domain_idx ON documents(domain);
CREATE INDEX IF NOT EXISTS documents_fetched_at_idx ON documents(fetched_at DESC);
CREATE INDEX IF NOT EXISTS query_logs_created_at_idx ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS crawl_jobs_started_at_idx ON crawl_jobs(started_at DESC);

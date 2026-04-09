# Aura Search Architecture

Aura Search is a vertical search engine for technical content. The goal is to demonstrate search-engine fundamentals, retrieval quality, and backend systems judgment in a project that is small enough to ship but deep enough to discuss seriously in interviews.

## System overview

- `apps/api` owns crawling, parsing, indexing, retrieval, ranking, evaluation, and admin APIs.
- `apps/web` is a Next.js front end with three surfaces: search, result detail, and admin metrics.
- `packages/shared` keeps the API contracts and ranking/evaluation types aligned across the stack.

## Search pipeline

1. Source registry
   - Maintains a curated list of technical domains with authority priors.
   - Seeds a crawl frontier for engineering blogs, docs, and research content.
2. Crawl + parse
   - Normalizes URLs, checks `robots.txt`, throttles by host, and fetches seed pages.
   - Extracts title, headings, body text, keywords, and canonical URL from HTML.
   - Deduplicates by canonical URL and content hash before indexing.
3. Index build
   - Tokenizes title, headings, body, and anchor text separately.
   - Stores field-aware postings and positions in a custom inverted index snapshot.
   - Persists the latest index segment on disk under `apps/api/.index`.
4. Retrieval + ranking
   - Parses quoted phrases and `site:` filters.
   - Expands misspellings with lexicon edit-distance matching.
   - Generates candidates lexically, scores them with BM25, then reranks with feature weights.
5. Evaluation + operations
   - Runs Precision@10, MRR, and NDCG@10 over judged benchmark queries.
   - Surfaces latency percentiles, crawl failures, and recent queries in the admin UI.

## Ranking features

- BM25 over fielded postings with title and heading boosts
- Exact phrase match
- Title match ratio
- Heading coverage
- Source authority prior
- Freshness decay
- URL cleanliness
- Document length normalization

## Storage notes

- The current code path supports two modes:
  - demo mode: seeded in-memory repositories plus on-disk index segments
  - Postgres mode: seeded bootstrap plus persistent documents, crawl jobs, failures, and query logs in PostgreSQL
- A PostgreSQL schema is included at [schema.sql](/Users/nishalpoojary/Projects/codex/aura/apps/api/src/data/schema.sql) for migrating metadata, crawl jobs, query logs, and evaluation judgments into relational storage.
- The deliberate choice is to keep the primary retrieval path custom rather than delegating it to hosted search infrastructure.

## Future extensions

- Incremental segment merging instead of full rebuilds
- Better HTML boilerplate removal
- Link-graph features and anchor propagation
- Offline tuning of feature weights from judged queries
- Optional hybrid lexical + vector retrieval as a comparison experiment

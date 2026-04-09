import type { DocumentRecord } from "@aura/shared";

import { hashContent } from "../lib/hash.js";

type SeedDocumentInput = Omit<DocumentRecord, "canonicalUrl" | "contentHash" | "fetchedAt">;

const fetchedAt = "2026-04-09T10:00:00.000Z";

function createDocumentRecord(input: SeedDocumentInput): DocumentRecord {
  const canonicalUrl = input.url.replace(/\/$/, "");
  return {
    ...input,
    canonicalUrl,
    fetchedAt,
    contentHash: hashContent(`${input.title}\n${input.body}`)
  };
}

export const seedDocuments: DocumentRecord[] = [
  createDocumentRecord({
    id: "doc-lsm-compaction",
    sourceId: "lucene-blog",
    site: "Apache Lucene",
    domain: "lucene.apache.org",
    url: "https://lucene.apache.org/blog/lsm-compaction-search-indexes",
    title: "LSM Trees, Segment Merges, and What Makes a Search Index Fast",
    headings: [
      "Why immutable segments help indexing throughput",
      "How compaction shapes query latency",
      "Merge policies and freshness trade-offs"
    ],
    body: "Search engines often behave like storage engines. This article explains how immutable index segments let ingestion stay cheap, why background merge policies reclaim query performance, and how compaction resembles LSM tree design. We compare write amplification, read amplification, and freshness in a search stack that serves technical documentation. The takeaway is that index layout matters as much as scoring.",
    anchorText: ["index segment merge", "lsm compaction", "search engine internals"],
    tags: ["search", "storage", "indexing"],
    author: "Ava Raghavan",
    publishedAt: "2025-08-18T00:00:00.000Z",
    snippetSeed: "Immutable segments and careful merge policies are the difference between a toy index and a fast search engine."
  }),
  createDocumentRecord({
    id: "doc-bm25-ranking",
    sourceId: "elastic-blog",
    site: "Elastic Blog",
    domain: "elastic.co",
    url: "https://elastic.co/blog/bm25-ranking-signals-for-developer-search",
    title: "Ranking Developer Search with BM25, Phrase Matches, and Field Boosts",
    headings: [
      "BM25 for lexical recall",
      "Field-aware scoring",
      "Why exact title matches should dominate"
    ],
    body: "Lexical retrieval still powers most high quality developer search experiences. We walk through BM25, explain how title and heading boosts change result ordering, and show why phrase matches should add a decisive signal for technical queries. The examples use API documentation and engineering blog posts where precise terminology is critical.",
    anchorText: ["bm25 developer search", "field boosts ranking", "phrase match scoring"],
    tags: ["search", "ranking", "bm25"],
    author: "Leo Martinez",
    publishedAt: "2025-09-10T00:00:00.000Z",
    snippetSeed: "BM25 gets you recall, but smart field boosts and exact phrases usually create the ranking quality users notice."
  }),
  createDocumentRecord({
    id: "doc-raft-elections",
    sourceId: "cockroach-labs",
    site: "Cockroach Labs",
    domain: "cockroachlabs.com",
    url: "https://cockroachlabs.com/blog/understanding-raft-elections",
    title: "Understanding Raft Elections Without Hand-Wavy Diagrams",
    headings: [
      "Leader election timeouts",
      "Log matching guarantees",
      "Failure modes during split votes"
    ],
    body: "Raft becomes easier once you isolate the invariants. This piece explains randomized election timeouts, vote requests, term advancement, and the role of log matching when a cluster is unstable. It focuses on how real systems avoid endless split votes and why leadership stability matters to write latency.",
    anchorText: ["raft election timeout", "split vote raft", "distributed consensus"],
    tags: ["distributed-systems", "consensus"],
    author: "Nina Patel",
    publishedAt: "2024-11-03T00:00:00.000Z",
    snippetSeed: "Raft is less mysterious when you frame it around invariants, term changes, and stability under failure."
  }),
  createDocumentRecord({
    id: "doc-vector-clocks",
    sourceId: "martin-fowler",
    site: "Martin Fowler",
    domain: "martinfowler.com",
    url: "https://martinfowler.com/articles/vector-clocks-practical-guide",
    title: "A Practical Guide to Vector Clocks in Distributed Systems",
    headings: [
      "Causality beyond timestamps",
      "Conflict detection with partial ordering",
      "When vector clocks become too large"
    ],
    body: "Physical clocks do not capture causality. Vector clocks track partial order so replicas can detect concurrent writes and resolve conflicts without pretending time is perfectly synchronized. The article covers causality, merge semantics, and the trade-off between metadata size and correctness in eventually consistent systems.",
    anchorText: ["vector clock causality", "distributed clocks", "conflict resolution"],
    tags: ["distributed-systems", "consistency"],
    author: "Sara Nguyen",
    publishedAt: "2025-01-14T00:00:00.000Z",
    snippetSeed: "Vector clocks let systems reason about causality when physical time stops being trustworthy."
  }),
  createDocumentRecord({
    id: "doc-http-caching",
    sourceId: "cloudflare-blog",
    site: "Cloudflare Blog",
    domain: "blog.cloudflare.com",
    url: "https://blog.cloudflare.com/http-caching-deep-dive",
    title: "HTTP Caching Deep Dive: Cache-Control, ETags, and Revalidation",
    headings: [
      "Freshness versus validation",
      "Strong and weak validators",
      "How stale-while-revalidate changes user experience"
    ],
    body: "Caching is a contract, not a shortcut. We examine Cache-Control directives, validator headers, shared cache behavior, and how stale-while-revalidate improves perceived latency without serving stale content forever. The article includes browser and CDN behavior with practical debugging advice.",
    anchorText: ["cache-control etag", "stale while revalidate", "http caching"],
    tags: ["web", "performance", "networking"],
    author: "Ishaan Menon",
    publishedAt: "2025-06-02T00:00:00.000Z",
    snippetSeed: "Great caching depends on understanding freshness, validators, and revalidation across browsers and CDNs."
  }),
  createDocumentRecord({
    id: "doc-postgres-mvcc",
    sourceId: "postgres-docs",
    site: "PostgreSQL",
    domain: "postgresql.org",
    url: "https://postgresql.org/docs/mvcc-explained",
    title: "Postgres MVCC Explained Through Snapshot Reads and Vacuum",
    headings: [
      "Why readers do not block writers",
      "Tuple visibility and transaction IDs",
      "Autovacuum and bloat management"
    ],
    body: "Multi-version concurrency control is easiest to understand through snapshots. This guide shows how transaction IDs, tuple visibility rules, and vacuum work together so reads stay consistent while writes continue. It also explains why long running transactions create bloat and how autovacuum protects performance.",
    anchorText: ["postgres mvcc snapshot", "vacuum bloat", "tuple visibility"],
    tags: ["database", "postgres"],
    author: "Ritika Sharma",
    publishedAt: "2024-12-22T00:00:00.000Z",
    snippetSeed: "Snapshot isolation and vacuum are the core ideas behind Postgres MVCC."
  }),
  createDocumentRecord({
    id: "doc-rate-limiters",
    sourceId: "stripe-engineering",
    site: "Stripe Engineering",
    domain: "stripe.com",
    url: "https://stripe.com/blog/designing-rate-limiters",
    title: "Designing Rate Limiters That Stay Fair Under Bursts",
    headings: [
      "Token bucket versus leaky bucket",
      "Per-tenant fairness",
      "Observability for throttling decisions"
    ],
    body: "Rate limiting is a product behavior as much as an infrastructure control. This article compares token bucket and leaky bucket algorithms, discusses fairness across tenants, and shows how to instrument throttling decisions so operators can debug abuse without punishing healthy traffic.",
    anchorText: ["token bucket fairness", "rate limiter design", "per tenant throttling"],
    tags: ["systems", "apis", "reliability"],
    author: "Mira Kapoor",
    publishedAt: "2025-04-09T00:00:00.000Z",
    snippetSeed: "Fair rate limiting requires algorithm choice, tenant isolation, and good operational visibility."
  }),
  createDocumentRecord({
    id: "doc-bloom-filters",
    sourceId: "redis-blog",
    site: "Redis",
    domain: "redis.io",
    url: "https://redis.io/blog/bloom-filters-at-scale",
    title: "Bloom Filters at Scale: Cheap Membership Tests with Clear Trade-Offs",
    headings: [
      "False positives and memory efficiency",
      "When a Bloom filter belongs in front of storage",
      "Sizing filters for real traffic"
    ],
    body: "Bloom filters trade exactness for speed and memory efficiency. They are ideal when negative lookups dominate and the system can tolerate a controlled false positive rate. We cover bit arrays, hash function count, sizing formulas, and placement in front of key value stores or search indexes.",
    anchorText: ["bloom filter sizing", "membership test", "false positive rate"],
    tags: ["systems", "probabilistic-data-structures"],
    author: "Dev Malik",
    publishedAt: "2025-07-11T00:00:00.000Z",
    snippetSeed: "Bloom filters are most useful when missing keys are common and every avoided lookup matters."
  }),
  createDocumentRecord({
    id: "doc-consistent-hashing",
    sourceId: "engineering-at-meta",
    site: "Engineering at Meta",
    domain: "engineering.fb.com",
    url: "https://engineering.fb.com/consistent-hashing-in-practice",
    title: "Consistent Hashing in Practice for Caches and Distributed Storage",
    headings: [
      "Virtual nodes and balance",
      "Minimizing remapped keys",
      "Operational trade-offs in rolling deploys"
    ],
    body: "Consistent hashing reduces churn when nodes join or leave a cluster. This article explains the hash ring, virtual nodes, balance versus locality, and how cache hit rates behave during rolling deploys. It also shows how consistent hashing interacts with failure domains and hot-key mitigation.",
    anchorText: ["consistent hash ring", "virtual nodes", "cache sharding"],
    tags: ["distributed-systems", "caching"],
    author: "Fatima Khan",
    publishedAt: "2025-02-27T00:00:00.000Z",
    snippetSeed: "Consistent hashing matters because rebalancing cost often dominates the theory people remember."
  }),
  createDocumentRecord({
    id: "doc-wal",
    sourceId: "sqlite-docs",
    site: "SQLite",
    domain: "sqlite.org",
    url: "https://sqlite.org/wal-mode-explained",
    title: "Building a Write-Ahead Log That Recovers Cleanly",
    headings: [
      "Durability before compaction",
      "Crash recovery and checkpoints",
      "How WAL affects read concurrency"
    ],
    body: "A write-ahead log turns random page mutation into sequential durable intent. This piece explains why WAL records are replayed during recovery, how checkpoints bound replay cost, and why WAL mode usually improves concurrency for read heavy workloads. The examples connect database logging ideas back to storage fundamentals.",
    anchorText: ["write ahead log", "wal checkpoint", "crash recovery"],
    tags: ["database", "storage", "reliability"],
    author: "Kabir Desai",
    publishedAt: "2025-03-03T00:00:00.000Z",
    snippetSeed: "The WAL is the recovery contract that lets storage engines be both fast and durable."
  }),
  createDocumentRecord({
    id: "doc-observability",
    sourceId: "datadog-blog",
    site: "Datadog Engineering",
    domain: "datadoghq.com",
    url: "https://datadoghq.com/blog/observability-pipelines-and-backpressure",
    title: "Observability Pipelines, Backpressure, and Dropping Data Gracefully",
    headings: [
      "Why telemetry systems fail under bursts",
      "Queueing, shedding, and retry budgets",
      "Operational dashboards that surface loss quickly"
    ],
    body: "Telemetry pipelines are distributed systems under constant pressure. We cover queue backpressure, retry storms, graceful degradation, and how to measure loss when logs and traces spike. The article argues that pipeline reliability depends on explicit shed policies rather than wishful buffering.",
    anchorText: ["observability backpressure", "queue shedding", "telemetry pipelines"],
    tags: ["observability", "reliability", "systems"],
    author: "Priya Anand",
    publishedAt: "2024-10-09T00:00:00.000Z",
    snippetSeed: "Backpressure and deliberate shedding are healthier than pretending telemetry traffic will stay smooth."
  }),
  createDocumentRecord({
    id: "doc-page-rank-signals",
    sourceId: "google-research",
    site: "Google Research",
    domain: "research.google",
    url: "https://research.google/pubs/search-ranking-signals-beyond-lexical-match",
    title: "Search Ranking Signals Beyond Lexical Match",
    headings: [
      "Authority, freshness, and link structure",
      "Balancing precision against exploration",
      "Why explainability matters to operators"
    ],
    body: "Good search ranking blends lexical relevance with document quality signals. This article studies authority, freshness, structural cues, and why debugability matters when ranking changes move business metrics. The main lesson is that retrieval gets you candidates, while ranking decides whether users trust the engine.",
    anchorText: ["search authority signals", "ranking freshness", "retrieval versus ranking"],
    tags: ["search", "ranking", "information-retrieval"],
    author: "Elena Rossi",
    publishedAt: "2025-05-15T00:00:00.000Z",
    snippetSeed: "Retrieval finds possibilities, but ranking and diagnostics decide whether users trust the engine."
  })
];

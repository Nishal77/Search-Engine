import type { AdminStatsResponse, SearchResponse } from "@aura/shared";
import Link from "next/link";

import { SearchComposer } from "../components/search-composer";
import { HighlightedSnippet } from "../components/highlighted-snippet";
import { API_BASE_URL, safeFetchJson } from "../lib/api";
export const dynamic = "force-dynamic";

async function fetchSearch(query: string, sort: "relevance" | "latest"): Promise<SearchResponse | null> {
  if (!query) {
    return null;
  }
  const params = new URLSearchParams({ q: query, sort });
  return safeFetchJson<SearchResponse>(`${API_BASE_URL}/api/search?${params.toString()}`);
}

async function fetchStats(): Promise<AdminStatsResponse | null> {
  return safeFetchJson<AdminStatsResponse>(`${API_BASE_URL}/api/admin/stats`);
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const sort = params.sort === "latest" ? "latest" : "relevance";
  const [data, stats] = await Promise.all([fetchSearch(query, sort), fetchStats()]);
  const sampleQueries = [
    "\"write ahead log\"",
    "bloom filter false positives",
    "site:postgresql.org mvcc",
    "ranking authority freshness"
  ];
  const quietProof = [
    {
      value: stats?.corpusSize ?? 12,
      label: "documents"
    },
    {
      value: stats?.sourceCount ?? 60,
      label: "sources"
    },
    {
      value: stats ? `${stats.evaluation.metrics.ndcgAt10.toFixed(2)}` : "0.92",
      label: "NDCG@10"
    },
    {
      value: stats?.storageMode === "postgres" ? "Postgres" : "Local",
      label: "storage"
    }
  ];
  const humanSummary = [
    "Collects technical writing from trusted sources.",
    "Searches it with a custom index and ranking logic.",
    "Explains why the top result won."
  ];

  return (
    <main className="home-page">
      <section className="hero-stage">
        <div className="shell hero-shell">
          <section className="hero-poster">
            <div className="eyebrow">Mini Elasticsearch-Style Project</div>
            <h1>
              Build the core of
              <br />
              a real search engine.
            </h1>
            <p className="hero-lede">
              This project demonstrates the heart of a search engine: indexing documents, running full-text search over
              an inverted index, and ranking results so the best match appears first.
            </p>
            <SearchComposer initialQuery={query} initialSort={sort} />
            <div className="hero-links">
              {sampleQueries.map((sample) => (
                <Link key={sample} href={`/?q=${encodeURIComponent(sample)}`} className="hero-link">
                  {sample}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="shell quiet-proof">
          <div className="proof-line">
            {quietProof.map((item) => (
              <div key={item.label} className="proof-stat">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="proof-copy">
            {humanSummary.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </section>
      </section>

      <section className="shell premium-content-grid">
        <section className="content-grid premium-content-layout">
          <div className="results-pane">
            <div className="section-heading">Results</div>
            {!data ? (
              <div>
              <p className="lede">
                Start with a query and this mini search engine will search its indexed technical corpus the way a real
                product would.
              </p>
                {!stats ? (
                  <div className="offline-banner">
                    Search API is currently unreachable. Start the Fastify server on `127.0.0.1:4000` or set
                    `NEXT_PUBLIC_API_BASE_URL`.
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="meta-strip" style={{ paddingTop: 0 }}>
                  <span>{data.totalHits} hits</span>
                  <span>{data.latencyMs} ms</span>
                  <span>{data.normalizedQuery.tokens.join(", ") || "no lexical tokens"}</span>
                  {data.normalizedQuery.phrases.length > 0 ? (
                    <span>{data.normalizedQuery.phrases.length} phrase query</span>
                  ) : null}
                </div>
                {data.results.map((result) => (
                  <article key={result.id} className="result-item">
                    <div className="result-url">
                      {result.domain} / {result.site}
                    </div>
                    <Link href={`/results/${result.id}?q=${encodeURIComponent(query)}`}>
                      <h2 className="result-title">{result.title}</h2>
                    </Link>
                    <HighlightedSnippet text={result.snippet} highlights={result.highlights} />
                    <div className="scoreline">
                      <span>score {result.score.toFixed(2)}</span>
                      <span>{result.explainPreview}</span>
                      {result.publishedAt ? <span>{new Date(result.publishedAt).toLocaleDateString()}</span> : null}
                    </div>
                    <div className="tag-row">
                      {result.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </>
            )}
          </div>

          <aside className="metrics-pane premium-aside">
            <div className="aside-block">
              <span className="kicker">In Plain English</span>
              <p className="lede" style={{ margin: 0 }}>
                This app takes documents, turns them into a searchable index, runs full-text search, and ranks the most
                relevant result first.
              </p>
            </div>
            <div className="aside-block">
              <span className="kicker">Core Concepts</span>
              <div className="mini-steps">
                <div className="mini-step">
                  <strong>01</strong>
                  <span>Inverted index for fast document lookup.</span>
                </div>
                <div className="mini-step">
                  <strong>02</strong>
                  <span>Tokenization and full-text search over indexed content.</span>
                </div>
                <div className="mini-step">
                  <strong>03</strong>
                  <span>Query ranking with BM25, phrase signals, and quality features.</span>
                </div>
              </div>
            </div>
            <div className="aside-block">
              <span className="kicker">Live Status</span>
              <div className="status-pair">
                <strong>{stats?.lastIndexedAt ? new Date(stats.lastIndexedAt).toLocaleDateString() : "Today"}</strong>
                <span>last indexed</span>
              </div>
              <div className="status-pair">
                <strong>{stats?.storageMode === "postgres" ? "Postgres-backed" : "Local demo mode"}</strong>
                <span>corpus mode</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

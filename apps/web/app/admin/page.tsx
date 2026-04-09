import type { AdminStatsResponse } from "@aura/shared";

import { API_BASE_URL, safeFetchJson } from "../../lib/api";
export const dynamic = "force-dynamic";

async function fetchStats(): Promise<AdminStatsResponse | null> {
  return safeFetchJson<AdminStatsResponse>(`${API_BASE_URL}/api/admin/stats`);
}

export default async function AdminPage() {
  const stats = await fetchStats();

  return (
    <main className="shell">
      <section style={{ padding: "48px 0 28px" }}>
        <div className="eyebrow">Operations Console</div>
        <h1 className="page-title">Index health, search quality, and crawl status.</h1>
        <p className="lede">
          This page shows whether the search engine is indexing fresh content, how result ranking is performing, and
          whether the corpus is running in local demo mode or PostgreSQL-backed mode.
        </p>
      </section>

      {!stats ? (
        <section className="metrics-pane" style={{ marginBottom: 56 }}>
          Unable to reach the API. Start the Fastify server on `127.0.0.1:4000` or set `NEXT_PUBLIC_API_BASE_URL`.
        </section>
      ) : (
        <section className="admin-grid">
          <div className="results-pane">
            <div className="section-heading">System Metrics</div>
            <div className="metric-grid" style={{ marginBottom: 24 }}>
              <div>
                <div className="metric-value">{stats.corpusSize}</div>
                <div className="metric-label">Indexed docs</div>
              </div>
              <div>
                <div className="metric-value">{stats.sourceCount}</div>
                <div className="metric-label">Curated sources</div>
              </div>
              <div>
                <div className="metric-value">{stats.indexTerms}</div>
                <div className="metric-label">Lexicon terms</div>
              </div>
              <div>
                <div className="metric-value">{Math.round(stats.indexBytes / 1024)} KB</div>
                <div className="metric-label">Segment size</div>
              </div>
            </div>

            <div className="section-heading">Corpus Status</div>
            <table className="table">
              <tbody>
                <tr>
                  <td>Storage mode</td>
                  <td>{stats.storageMode === "postgres" ? "PostgreSQL-backed" : "Local memory + disk snapshots"}</td>
                </tr>
                <tr>
                  <td>Seeded documents</td>
                  <td>{stats.seedCorpusSize}</td>
                </tr>
                <tr>
                  <td>Live discovered documents</td>
                  <td>{stats.discoveredCorpusSize}</td>
                </tr>
                <tr>
                  <td>Last index build</td>
                  <td>{stats.lastIndexedAt ? new Date(stats.lastIndexedAt).toLocaleString() : "n/a"}</td>
                </tr>
              </tbody>
            </table>

            <div className="section-heading">Latency</div>
            <table className="table">
              <tbody>
                <tr>
                  <td>P50</td>
                  <td>{stats.latencyPercentiles.p50} ms</td>
                </tr>
                <tr>
                  <td>P95</td>
                  <td>{stats.latencyPercentiles.p95} ms</td>
                </tr>
                <tr>
                  <td>P99</td>
                  <td>{stats.latencyPercentiles.p99} ms</td>
                </tr>
              </tbody>
            </table>

            <div className="section-heading" style={{ marginTop: 28 }}>Evaluation</div>
            <table className="table">
              <tbody>
                <tr>
                  <td>Precision@10</td>
                  <td>{stats.evaluation.metrics.precisionAt10.toFixed(3)}</td>
                </tr>
                <tr>
                  <td>MRR</td>
                  <td>{stats.evaluation.metrics.mrr.toFixed(3)}</td>
                </tr>
                <tr>
                  <td>NDCG@10</td>
                  <td>{stats.evaluation.metrics.ndcgAt10.toFixed(3)}</td>
                </tr>
                <tr>
                  <td>Benchmark queries</td>
                  <td>{stats.evaluation.queryCount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <aside className="metrics-pane">
            <div className="aside-block">
              <span className="kicker">Freshness</span>
              <p className="subtle" style={{ margin: 0 }}>
                Latest fetch: {stats.freshestFetchAt ? new Date(stats.freshestFetchAt).toLocaleString() : "n/a"}
              </p>
            </div>
            <div className="aside-block">
              <span className="kicker">What This Means</span>
              <p className="subtle" style={{ margin: 0 }}>
                If discovered documents grows over time, the engine is moving beyond the demo corpus and learning from
                live crawled content.
              </p>
            </div>
            <div className="aside-block">
              <span className="kicker">Recent Queries</span>
              {stats.recentQueries.length === 0 ? (
                <p className="subtle" style={{ margin: 0 }}>
                  Run a few searches to populate latency logs.
                </p>
              ) : (
                <table className="table">
                  <tbody>
                    {stats.recentQueries.slice(0, 6).map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.query}</td>
                        <td>{entry.latencyMs} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="aside-block">
              <span className="kicker">Crawl Failures</span>
              {stats.crawlFailures.length === 0 ? (
                <p className="subtle" style={{ margin: 0 }}>
                  No crawl failures recorded in the current process.
                </p>
              ) : (
                <table className="table">
                  <tbody>
                    {stats.crawlFailures.map((failure) => (
                      <tr key={`${failure.sourceId}-${failure.createdAt}`}>
                        <td>{failure.sourceId}</td>
                        <td>{failure.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

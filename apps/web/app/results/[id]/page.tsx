import type { DocumentRecord, SearchExplainResponse } from "@aura/shared";

import { API_BASE_URL, safeFetchJson } from "../../../lib/api";
export const dynamic = "force-dynamic";

async function fetchDocument(id: string): Promise<DocumentRecord | null> {
  return safeFetchJson<DocumentRecord>(`${API_BASE_URL}/api/documents/${id}`);
}

async function fetchExplain(id: string, query: string): Promise<SearchExplainResponse | null> {
  if (!query) {
    return null;
  }
  const params = new URLSearchParams({ q: query, docId: id });
  return safeFetchJson<SearchExplainResponse>(`${API_BASE_URL}/api/search/explain?${params.toString()}`);
}

export default async function ResultDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
  const [document, explain] = await Promise.all([fetchDocument(id), fetchExplain(id, query)]);

  if (!document) {
    return (
      <main className="shell">
        <section className="detail-grid" style={{ paddingTop: 48 }}>
          <div className="detail-pane">
            <h1 className="detail-title">Document unavailable</h1>
            <p className="lede">
              The search API could not return this document. Make sure the API server is running on `127.0.0.1:4000`
              or set `NEXT_PUBLIC_API_BASE_URL`.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="detail-grid" style={{ paddingTop: 48 }}>
        <article className="detail-pane">
          <span className="kicker">
            {document.site} / {document.domain}
          </span>
          <h1 className="detail-title">{document.title}</h1>
          <p className="lede">
            {document.author ? `${document.author} · ` : ""}
            {document.publishedAt ? new Date(document.publishedAt).toLocaleDateString() : "Freshly indexed"}
          </p>
          <div className="tag-row">
            {document.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="detail-body">
            <p>{document.snippetSeed}</p>
            {document.headings.map((heading) => (
              <p key={heading}>
                <strong>{heading}.</strong>
              </p>
            ))}
            <p>{document.body}</p>
          </div>
        </article>

        <aside className="metrics-pane">
          <div className="aside-block">
            <span className="kicker">Canonical URL</span>
            <p className="subtle" style={{ margin: 0 }}>
              {document.canonicalUrl}
            </p>
          </div>
          <div className="aside-block">
            <span className="kicker">Ranking Trace</span>
            {explain ? (
              <>
                <div className="metric-grid">
                  <div>
                    <div className="metric-value">{explain.finalScore.toFixed(2)}</div>
                    <div className="metric-label">Final score</div>
                  </div>
                  <div>
                    <div className="metric-value">{explain.features.bm25.toFixed(2)}</div>
                    <div className="metric-label">BM25</div>
                  </div>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Title match ratio</td>
                      <td>{explain.features.titleMatchRatio.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Heading coverage</td>
                      <td>{explain.features.headingCoverage.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Exact phrase match</td>
                      <td>{explain.features.exactPhraseMatch.toFixed(0)}</td>
                    </tr>
                    <tr>
                      <td>Source authority</td>
                      <td>{explain.features.sourceAuthority.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Freshness</td>
                      <td>{explain.features.freshnessScore.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <p className="subtle" style={{ margin: 0 }}>
                Open this page from a search results click to inspect the ranking explanation for a specific query.
              </p>
            )}
          </div>
          {explain ? (
            <div className="aside-block">
              <span className="kicker">Matched Terms</span>
              <div className="tag-row">
                {explain.matchedTerms.map((term) => (
                  <span className="tag" key={term}>
                    {term}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

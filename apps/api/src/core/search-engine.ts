import type {
  AdminStatsResponse,
  DocumentRecord,
  EvaluationJudgement,
  EvaluationReport,
  PostingRecord,
  SearchExplainResponse,
  SearchIndexSnapshot,
  SearchResponse
} from "@aura/shared";

import { buildIndex } from "./index-builder.js";
import { summarizeMetrics } from "./metrics.js";
import { parseQuery } from "./query.js";
import { scoreDocument } from "./ranking.js";
import { createSnippet } from "./snippet.js";
import { editDistance, tokenize, uniqueTerms } from "./text.js";
import type { DiskIndexStore } from "../services/index-store.js";
import type { CrawlStore, DocumentStore, QueryLogStore, SourceRegistry } from "../services/store.js";
import { hashContent } from "../lib/hash.js";

function documentContainsPhrase(document: DocumentRecord, phrase: string[]): boolean {
  if (phrase.length === 0) {
    return false;
  }
  const target = phrase.join(" ");
  const haystacks = [
    tokenize(document.title).join(" "),
    tokenize(document.headings.join(" ")).join(" "),
    tokenize(document.body).join(" "),
    tokenize(document.anchorText.join(" ")).join(" ")
  ];
  return haystacks.some((haystack) => haystack.includes(target));
}

export class SearchEngine {
  private index: SearchIndexSnapshot | null = null;

  constructor(
    private readonly documents: DocumentStore,
    private readonly sources: SourceRegistry,
    private readonly crawlStore: CrawlStore,
    private readonly queryLogs: QueryLogStore,
    private readonly judgements: EvaluationJudgement[],
    private readonly indexStore: DiskIndexStore,
    private readonly options: {
      storageMode: "memory" | "postgres";
    }
  ) {}

  async init(): Promise<void> {
    const latest = await this.indexStore.loadLatest();
    this.index = latest ?? buildIndex(this.documents.all());
    if (!latest) {
      await this.indexStore.save(this.index);
    }
  }

  private ensureIndex(): SearchIndexSnapshot {
    if (!this.index) {
      throw new Error("Search index has not been initialized.");
    }
    return this.index;
  }

  async rebuild(): Promise<SearchIndexSnapshot> {
    this.index = buildIndex(this.documents.all());
    await this.indexStore.save(this.index);
    return this.index;
  }

  getDocument(docId: string): DocumentRecord | undefined {
    return this.documents.get(docId);
  }

  private expandTerms(index: SearchIndexSnapshot, terms: string[]): string[] {
    const expanded = new Set<string>();
    const lexiconTerms = Object.keys(index.lexicon);

    for (const term of terms) {
      if (index.lexicon[term]) {
        expanded.add(term);
        continue;
      }
      const candidates = lexiconTerms
        .filter((candidate) => Math.abs(candidate.length - term.length) <= 2 && candidate[0] === term[0])
        .map((candidate) => ({ candidate, distance: editDistance(candidate, term) }))
        .filter((entry) => entry.distance <= (term.length > 6 ? 2 : 1))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 3);

      if (candidates.length === 0) {
        expanded.add(term);
      } else {
        for (const candidate of candidates) {
          expanded.add(candidate.candidate);
        }
      }
    }

    return [...expanded];
  }

  private sourceAuthorityFor(document: DocumentRecord): number {
    const source = this.sources.get(document.sourceId);
    return source?.authorityScore ?? 0.5;
  }

  search(params: {
    q: string;
    page?: number;
    site?: string;
    sort?: "relevance" | "latest";
  }): SearchResponse {
    const index = this.ensureIndex();
    const startedAt = performance.now();
    const normalized = parseQuery(
      params.site ? `${params.q} site:${params.site}` : params.q,
      params.page,
      params.sort ?? "relevance"
    );

    const expandedTerms = this.expandTerms(index, normalized.tokens);
    const candidateIds = new Set<string>();
    const postingsCache = new Map<string, Map<string, PostingRecord>>();

    if (expandedTerms.length === 0) {
      for (const document of this.documents.all()) {
        candidateIds.add(document.id);
      }
    }

    for (const term of expandedTerms) {
      const lexiconEntry = index.lexicon[term];
      if (!lexiconEntry) {
        continue;
      }
      const map = new Map(lexiconEntry.postings.map((posting) => [posting.docId, posting]));
      postingsCache.set(term, map);
      for (const posting of lexiconEntry.postings) {
        candidateIds.add(posting.docId);
      }
    }

    const results = [...candidateIds]
      .map((docId) => this.documents.get(docId))
      .filter((document): document is DocumentRecord => Boolean(document))
      .filter((document) => {
        if (!normalized.siteFilter) {
          return true;
        }
        return document.domain.includes(normalized.siteFilter) || document.site.toLowerCase().includes(normalized.siteFilter);
      })
      .map((document) => {
        const matchedTerms = uniqueTerms(
          expandedTerms.filter((term) => {
            const posting = postingsCache.get(term)?.get(document.id);
            return Boolean(posting);
          })
        );
        const postingsByTerm = new Map(
          matchedTerms.map((term) => [term, postingsCache.get(term)?.get(document.id)!])
        );
        const phraseMatch = normalized.phrases.some((phrase) => documentContainsPhrase(document, phrase));
        const scored = scoreDocument({
          document,
          index,
          matchedTerms,
          postingsByTerm,
          phraseMatch,
          sourceAuthority: this.sourceAuthorityFor(document)
        });
        const snippet = createSnippet(document.body, normalized.tokens, document.snippetSeed);
        const explainPreview = [
          `BM25 ${scored.features.bm25.toFixed(2)}`,
          scored.features.exactPhraseMatch ? "phrase match" : "lexical match",
          `authority ${scored.features.sourceAuthority.toFixed(2)}`
        ].join(" • ");
        return {
          id: document.id,
          url: document.url,
          title: document.title,
          site: document.site,
          domain: document.domain,
          snippet: snippet.snippet,
          highlights: snippet.highlights,
          tags: document.tags,
          publishedAt: document.publishedAt,
          score: scored.finalScore,
          explainPreview
        };
      })
      .sort((left, right) => {
        if (normalized.sort === "latest") {
          return Date.parse(right.publishedAt ?? "1970-01-01") - Date.parse(left.publishedAt ?? "1970-01-01");
        }
        return right.score - left.score;
      });

    const pagedResults = results.slice((normalized.page - 1) * normalized.pageSize, normalized.page * normalized.pageSize);
    const latencyMs = Math.round(performance.now() - startedAt);
    this.queryLogs.push({
      id: hashContent(`${params.q}-${Date.now()}`).slice(0, 12),
      query: params.q,
      latencyMs,
      totalHits: results.length,
      createdAt: new Date().toISOString()
    });

    return {
      query: params.q,
      normalizedQuery: normalized,
      totalHits: results.length,
      page: normalized.page,
      pageSize: normalized.pageSize,
      latencyMs,
      results: pagedResults
    };
  }

  explain(q: string, docId: string): SearchExplainResponse | null {
    const index = this.ensureIndex();
    const normalized = parseQuery(q, 1, "relevance");
    const document = this.documents.get(docId);
    if (!document) {
      return null;
    }
    const expandedTerms = this.expandTerms(index, normalized.tokens);
    const postingsByTerm = new Map(
      expandedTerms.flatMap((term) => {
        const entry = index.lexicon[term];
        if (!entry) {
          return [];
        }
        const posting = entry.postings.find((candidate) => candidate.docId === docId);
        return posting ? [[term, posting] as const] : [];
      })
    );
    const matchedTerms = [...postingsByTerm.keys()];
    const scored = scoreDocument({
      document,
      index,
      matchedTerms,
      postingsByTerm,
      phraseMatch: normalized.phrases.some((phrase) => documentContainsPhrase(document, phrase)),
      sourceAuthority: this.sourceAuthorityFor(document)
    });

    return {
      query: q,
      docId,
      matchedTerms,
      fieldHits: scored.fieldHits,
      bm25Breakdown: scored.bm25Breakdown,
      features: scored.features,
      finalScore: scored.finalScore
    };
  }

  async evaluate(): Promise<EvaluationReport> {
    const grouped = new Map<string, EvaluationJudgement[]>();
    for (const judgement of this.judgements) {
      const list = grouped.get(judgement.query) ?? [];
      list.push(judgement);
      grouped.set(judgement.query, list);
    }
    const evaluationEntries = [...grouped.entries()].map(([query, judgements]) => ({
      query,
      retrievedDocIds: this.search({ q: query, page: 1, sort: "relevance" }).results.map((result) => result.id),
      judgements
    }));
    const { summary, perQuery } = summarizeMetrics(evaluationEntries);
    return {
      evaluatedAt: new Date().toISOString(),
      queryCount: evaluationEntries.length,
      metrics: summary,
      perQuery
    };
  }

  async adminStats(): Promise<AdminStatsResponse> {
    const index = this.ensureIndex();
    return {
      corpusSize: this.documents.all().length,
      seedCorpusSize: this.documents.countSeedDocuments(),
      discoveredCorpusSize: this.documents.countDiscoveredDocuments(),
      sourceCount: this.sources.all().length,
      indexTerms: Object.keys(index.lexicon).length,
      indexBytes: await this.indexStore.sizeBytes(),
      freshestFetchAt: this.documents.latestFetchAt(),
      lastIndexedAt: index.builtAt,
      storageMode: this.options.storageMode,
      liveCrawlEnabled: true,
      crawlFailures: this.crawlStore.allFailures(),
      latencyPercentiles: this.queryLogs.latencyPercentiles(),
      evaluation: await this.evaluate(),
      recentQueries: this.queryLogs.recent()
    };
  }
}

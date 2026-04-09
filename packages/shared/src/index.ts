export type SearchField = "title" | "headings" | "body" | "anchor";

export interface SourceRecord {
  id: string;
  name: string;
  domain: string;
  authorityScore: number;
  seeds: string[];
  tags: string[];
}

export interface DocumentRecord {
  id: string;
  sourceId: string;
  url: string;
  canonicalUrl: string;
  title: string;
  headings: string[];
  body: string;
  anchorText: string[];
  tags: string[];
  site: string;
  domain: string;
  author?: string;
  publishedAt?: string;
  fetchedAt: string;
  contentHash: string;
  snippetSeed: string;
}

export interface PostingPositions {
  title: number[];
  headings: number[];
  body: number[];
  anchor: number[];
}

export interface PostingRecord {
  docId: string;
  termFrequency: number;
  fieldTermFrequency: Record<SearchField, number>;
  positions: PostingPositions;
}

export interface LexiconEntry {
  term: string;
  documentFrequency: number;
  postings: PostingRecord[];
}

export interface IndexDocumentStats {
  docId: string;
  fieldLengths: Record<SearchField, number>;
  totalLength: number;
}

export interface SearchIndexSnapshot {
  builtAt: string;
  docCount: number;
  averageFieldLengths: Record<SearchField, number>;
  documents: Record<string, IndexDocumentStats>;
  lexicon: Record<string, LexiconEntry>;
}

export interface SearchQuery {
  raw: string;
  tokens: string[];
  phrases: string[][];
  siteFilter?: string;
  sort?: "relevance" | "latest";
  page: number;
  pageSize: number;
}

export interface HighlightSpan {
  start: number;
  end: number;
}

export interface RankingFeatures {
  bm25: number;
  titleMatchRatio: number;
  headingCoverage: number;
  exactPhraseMatch: number;
  sourceAuthority: number;
  freshnessScore: number;
  urlCleanliness: number;
  documentLengthScore: number;
}

export interface SearchExplainResponse {
  query: string;
  docId: string;
  matchedTerms: string[];
  fieldHits: Record<SearchField, number>;
  bm25Breakdown: Array<{
    term: string;
    field: SearchField;
    tf: number;
    df: number;
    idf: number;
    score: number;
  }>;
  features: RankingFeatures;
  finalScore: number;
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  site: string;
  domain: string;
  snippet: string;
  highlights: HighlightSpan[];
  tags: string[];
  publishedAt?: string;
  score: number;
  explainPreview: string;
}

export interface SearchResponse {
  query: string;
  normalizedQuery: SearchQuery;
  totalHits: number;
  page: number;
  pageSize: number;
  latencyMs: number;
  results: SearchResult[];
}

export interface CrawlJob {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt?: string;
  fetched: number;
  indexed: number;
  skipped: number;
  status: "running" | "completed" | "failed";
  error?: string;
}

export interface QueryLogRecord {
  id: string;
  query: string;
  latencyMs: number;
  totalHits: number;
  createdAt: string;
}

export interface FailureRecord {
  sourceId: string;
  url: string;
  error: string;
  createdAt: string;
}

export interface EvaluationJudgement {
  query: string;
  docId: string;
  relevance: 0 | 1 | 2 | 3;
}

export interface EvaluationMetricSummary {
  precisionAt10: number;
  mrr: number;
  ndcgAt10: number;
}

export interface EvaluationReport {
  evaluatedAt: string;
  queryCount: number;
  metrics: EvaluationMetricSummary;
  perQuery: Array<{
    query: string;
    precisionAt10: number;
    reciprocalRank: number;
    ndcgAt10: number;
    topResultIds: string[];
  }>;
}

export interface AdminStatsResponse {
  corpusSize: number;
  seedCorpusSize: number;
  discoveredCorpusSize: number;
  sourceCount: number;
  indexTerms: number;
  indexBytes: number;
  freshestFetchAt?: string;
  lastIndexedAt?: string;
  storageMode: "memory" | "postgres";
  liveCrawlEnabled: boolean;
  crawlFailures: FailureRecord[];
  latencyPercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  evaluation: EvaluationReport;
  recentQueries: QueryLogRecord[];
}

import type { DocumentRecord, PostingRecord, RankingFeatures, SearchExplainResponse, SearchField, SearchIndexSnapshot } from "@aura/shared";

import { scoreUrlCleanliness } from "../lib/url.js";

const FIELD_BOOSTS: Record<SearchField, number> = {
  title: 2.8,
  headings: 1.9,
  body: 1,
  anchor: 1.4
};

const BM25_K1 = 1.5;
const BM25_B = 0.75;

function bm25Contribution(
  tf: number,
  df: number,
  docCount: number,
  fieldLength: number,
  averageFieldLength: number
): { idf: number; score: number } {
  const safeAverage = averageFieldLength || 1;
  const idf = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
  const numerator = tf * (BM25_K1 + 1);
  const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (fieldLength / safeAverage));
  return {
    idf,
    score: idf * (numerator / denominator)
  };
}

export function scoreDocument(params: {
  document: DocumentRecord;
  index: SearchIndexSnapshot;
  matchedTerms: string[];
  postingsByTerm: Map<string, PostingRecord>;
  phraseMatch: boolean;
  sourceAuthority: number;
}): {
  finalScore: number;
  features: RankingFeatures;
  fieldHits: Record<SearchField, number>;
  bm25Breakdown: SearchExplainResponse["bm25Breakdown"];
} {
  const { document, index, matchedTerms, postingsByTerm, phraseMatch, sourceAuthority } = params;
  const docStats = index.documents[document.id];
  const fieldHits: Record<SearchField, number> = {
    title: 0,
    headings: 0,
    body: 0,
    anchor: 0
  };
  const bm25Breakdown: SearchExplainResponse["bm25Breakdown"] = [];
  let bm25 = 0;

  for (const term of matchedTerms) {
    const posting = postingsByTerm.get(term);
    const lexiconEntry = index.lexicon[term];
    if (!posting || !lexiconEntry) {
      continue;
    }
    for (const field of Object.keys(posting.fieldTermFrequency) as SearchField[]) {
      const tf = posting.fieldTermFrequency[field];
      if (!tf) {
        continue;
      }
      fieldHits[field] += tf;
      const { idf, score } = bm25Contribution(
        tf,
        lexiconEntry.documentFrequency,
        index.docCount || 1,
        docStats.fieldLengths[field],
        index.averageFieldLengths[field]
      );
      const boostedScore = score * FIELD_BOOSTS[field];
      bm25 += boostedScore;
      bm25Breakdown.push({
        term,
        field,
        tf,
        df: lexiconEntry.documentFrequency,
        idf,
        score: boostedScore
      });
    }
  }

  const normalizedTitle = document.title.toLowerCase();
  const titleMatchRatio = matchedTerms.length
    ? matchedTerms.filter((term) => normalizedTitle.includes(term)).length / matchedTerms.length
    : 0;
  const headingCoverage = matchedTerms.length
    ? matchedTerms.filter((term) => document.headings.join(" ").toLowerCase().includes(term)).length / matchedTerms.length
    : 0;
  const exactPhraseMatch = phraseMatch ? 1 : 0;
  const publishedDate = document.publishedAt ? Date.parse(document.publishedAt) : Date.parse(document.fetchedAt);
  const ageDays = Number.isFinite(publishedDate) ? (Date.now() - publishedDate) / (1000 * 60 * 60 * 24) : 365;
  const freshnessScore = Math.max(0.1, Math.exp(-ageDays / 1200));
  const urlCleanliness = scoreUrlCleanliness(document.url);
  const documentLengthScore = Math.max(0.2, 1 - Math.abs(docStats.totalLength - 700) / 1200);

  const features: RankingFeatures = {
    bm25,
    titleMatchRatio,
    headingCoverage,
    exactPhraseMatch,
    sourceAuthority,
    freshnessScore,
    urlCleanliness,
    documentLengthScore
  };

  const finalScore =
    features.bm25 +
    features.titleMatchRatio * 2.3 +
    features.headingCoverage * 1.5 +
    features.exactPhraseMatch * 3.2 +
    features.sourceAuthority * 1.8 +
    features.freshnessScore * 0.8 +
    features.urlCleanliness * 0.5 +
    features.documentLengthScore * 0.4;

  return {
    finalScore,
    features,
    fieldHits,
    bm25Breakdown
  };
}

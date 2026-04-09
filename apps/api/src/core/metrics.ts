import type { EvaluationJudgement, EvaluationMetricSummary } from "@aura/shared";

function precisionAtK(relevances: number[], k: number): number {
  const top = relevances.slice(0, k);
  if (top.length === 0) {
    return 0;
  }
  const relevant = top.filter((value) => value > 0).length;
  return relevant / k;
}

function reciprocalRank(relevances: number[]): number {
  const index = relevances.findIndex((value) => value > 0);
  return index === -1 ? 0 : 1 / (index + 1);
}

function dcg(relevances: number[], k: number): number {
  return relevances.slice(0, k).reduce((sum, relevance, index) => {
    const gain = 2 ** relevance - 1;
    const discount = Math.log2(index + 2);
    return sum + gain / discount;
  }, 0);
}

function ndcgAtK(relevances: number[], idealRelevances: number[], k: number): number {
  const ideal = dcg(idealRelevances, k);
  if (ideal === 0) {
    return 0;
  }
  return dcg(relevances, k) / ideal;
}

export function summarizeMetrics(entries: Array<{
  query: string;
  retrievedDocIds: string[];
  judgements: EvaluationJudgement[];
}>): {
  summary: EvaluationMetricSummary;
  perQuery: Array<{
    query: string;
    precisionAt10: number;
    reciprocalRank: number;
    ndcgAt10: number;
    topResultIds: string[];
  }>;
} {
  const perQuery = entries.map((entry) => {
    const judgementMap = new Map(entry.judgements.map((judgement) => [judgement.docId, judgement.relevance]));
    const relevances = entry.retrievedDocIds.slice(0, 10).map((docId) => judgementMap.get(docId) ?? 0);
    const idealRelevances = [...judgementMap.values()].sort((left, right) => right - left);
    return {
      query: entry.query,
      precisionAt10: precisionAtK(relevances, 10),
      reciprocalRank: reciprocalRank(relevances),
      ndcgAt10: ndcgAtK(relevances, idealRelevances, 10),
      topResultIds: entry.retrievedDocIds.slice(0, 10)
    };
  });

  const summary = perQuery.reduce(
    (aggregate, item, _, items) => ({
      precisionAt10: aggregate.precisionAt10 + item.precisionAt10 / items.length,
      mrr: aggregate.mrr + item.reciprocalRank / items.length,
      ndcgAt10: aggregate.ndcgAt10 + item.ndcgAt10 / items.length
    }),
    { precisionAt10: 0, mrr: 0, ndcgAt10: 0 }
  );

  return {
    summary,
    perQuery
  };
}

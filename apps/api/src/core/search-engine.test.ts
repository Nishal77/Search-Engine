import path from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { SearchEngine } from "./search-engine.js";
import { evaluationJudgements } from "../data/benchmark.js";
import { DiskIndexStore } from "../services/index-store.js";
import { CrawlStore, DocumentStore, QueryLogStore, SourceRegistry } from "../services/store.js";

async function createEngine() {
  const indexStore = new DiskIndexStore(path.join(tmpdir(), `aura-search-test-${Date.now()}`));
  const engine = new SearchEngine(
    new DocumentStore(),
    new SourceRegistry(),
    new CrawlStore(),
    new QueryLogStore(),
    evaluationJudgements,
    indexStore,
    { storageMode: "memory" }
  );
  await engine.init();
  return engine;
}

describe("SearchEngine", () => {
  it("ranks the best lexical match first for bm25 queries", async () => {
    const engine = await createEngine();

    const response = engine.search({ q: "bm25 ranking" });

    expect(response.results[0]?.id).toBe("doc-bm25-ranking");
  });

  it("handles basic typo tolerance for high-signal queries", async () => {
    const engine = await createEngine();

    const response = engine.search({ q: "conssistent hashng" });

    expect(response.results[0]?.id).toBe("doc-consistent-hashing");
  });

  it("returns phrase-aware explanations", async () => {
    const engine = await createEngine();

    const explanation = engine.explain('"write ahead log"', "doc-wal");

    expect(explanation?.features.exactPhraseMatch).toBe(1);
    expect(explanation?.matchedTerms).toContain("write");
  });
});

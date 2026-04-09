import type { EvaluationJudgement } from "@aura/shared";

import { SearchEngine } from "../core/search-engine.js";
import { evaluationJudgements } from "../data/benchmark.js";
import { DiskIndexStore } from "./index-store.js";
import { CrawlerService } from "./crawler.js";
import { PostgresPersistence } from "./postgres.js";
import { CrawlStore, DocumentStore, QueryLogStore, SourceRegistry } from "./store.js";

export interface AppServices {
  sources: SourceRegistry;
  documents: DocumentStore;
  crawlStore: CrawlStore;
  queryLogs: QueryLogStore;
  searchEngine: SearchEngine;
  crawler: CrawlerService;
  judgements: EvaluationJudgement[];
  storageMode: "memory" | "postgres";
}

export async function createServices(): Promise<AppServices> {
  const databaseUrl = process.env.DATABASE_URL;
  let persistence: PostgresPersistence | null = null;

  if (databaseUrl) {
    try {
      persistence = await PostgresPersistence.create(databaseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[aura] Failed to connect to Postgres, falling back to memory mode: ${message}`);
    }
  }

  if (persistence) {
    for (const source of new SourceRegistry().all()) {
      await persistence.persistSource(source);
    }
    for (const document of new DocumentStore().all()) {
      await persistence.persistDocument(document);
    }
    await persistence.persistJudgements(evaluationJudgements);
  }

  const sources = new SourceRegistry((await persistence?.loadSources()) ?? undefined, persistence ?? undefined);
  const documents = new DocumentStore((await persistence?.loadDocuments()) ?? undefined, persistence ?? undefined);
  const crawlStore = new CrawlStore(
    (await persistence?.loadCrawlJobs()) ?? [],
    (await persistence?.loadFailures()) ?? [],
    persistence ?? undefined
  );
  const queryLogs = new QueryLogStore((await persistence?.loadQueryLogs()) ?? [], persistence ?? undefined);
  const indexStore = new DiskIndexStore();
  const judgements = (await persistence?.loadJudgements()) ?? evaluationJudgements;
  const searchEngine = new SearchEngine(documents, sources, crawlStore, queryLogs, judgements, indexStore, {
    storageMode: persistence ? "postgres" : "memory"
  });
  await searchEngine.init();
  const crawler = new CrawlerService(sources, documents, crawlStore, searchEngine);

  return {
    sources,
    documents,
    crawlStore,
    queryLogs,
    searchEngine,
    crawler,
    judgements,
    storageMode: persistence ? "postgres" : "memory"
  };
}

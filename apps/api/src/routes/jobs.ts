import type { FastifyInstance } from "fastify";

import type { AppServices } from "../services/container.js";

export async function registerJobRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.post("/api/index/rebuild", async () => {
    const index = await services.searchEngine.rebuild();
    return {
      status: "ok",
      builtAt: index.builtAt,
      docCount: index.docCount,
      indexTerms: Object.keys(index.lexicon).length
    };
  });

  app.post("/api/crawl/run", async (request) => {
    const body = (request.body as { limit?: number } | undefined) ?? {};
    const jobs = await services.crawler.run(body.limit ?? 5);
    return {
      status: "ok",
      jobs
    };
  });
}

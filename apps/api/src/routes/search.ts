import type { FastifyInstance } from "fastify";

import type { AppServices } from "../services/container.js";

export async function registerSearchRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.get("/api/search", async (request) => {
    const query = request.query as {
      q?: string;
      page?: string;
      site?: string;
      sort?: "relevance" | "latest";
    };
    const q = query.q?.trim() ?? "";
    if (!q) {
      return {
        query: "",
        normalizedQuery: {
          raw: "",
          tokens: [],
          phrases: [],
          page: 1,
          pageSize: 10,
          sort: "relevance"
        },
        totalHits: 0,
        page: 1,
        pageSize: 10,
        latencyMs: 0,
        results: []
      };
    }
    return services.searchEngine.search({
      q,
      page: Number(query.page ?? "1"),
      site: query.site,
      sort: query.sort ?? "relevance"
    });
  });

  app.get("/api/search/explain", async (request, reply) => {
    const query = request.query as { q?: string; docId?: string };
    if (!query.q || !query.docId) {
      return reply.code(400).send({ error: "Both q and docId are required." });
    }
    const explanation = services.searchEngine.explain(query.q, query.docId);
    if (!explanation) {
      return reply.code(404).send({ error: "Document not found." });
    }
    return explanation;
  });

  app.get("/api/documents/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const document = services.searchEngine.getDocument(params.id);
    if (!document) {
      return reply.code(404).send({ error: "Document not found." });
    }
    return document;
  });
}

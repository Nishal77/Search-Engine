import type { FastifyInstance } from "fastify";

import type { AppServices } from "../services/container.js";

export async function registerAdminRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.get("/api/admin/stats", async () => services.searchEngine.adminStats());
}

import cors from "@fastify/cors";
import Fastify from "fastify";

import { registerAdminRoutes } from "./routes/admin.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerSearchRoutes } from "./routes/search.js";
import { createServices } from "./services/container.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  const services = await createServices();

  app.get("/api/health", async () => ({
    ok: true,
    docs: services.documents.all().length,
    sources: services.sources.all().length,
    storageMode: services.storageMode
  }));

  await registerSearchRoutes(app, services);
  await registerAdminRoutes(app, services);
  await registerJobRoutes(app, services);

  return app;
}

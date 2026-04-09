# Aura Search

Aura Search is a resume-grade vertical search engine for technical content. The repo is organized as a TypeScript monorepo with:

- `apps/api`: Fastify API, crawler, parser, custom inverted index, ranking logic, and evaluation jobs.
- `apps/web`: Next.js search UI with search, result detail, and admin views.
- `packages/shared`: shared interfaces for search results, explanations, crawl jobs, and evaluation reports.

## Local development

1. Install dependencies with `npm install`.
2. Run the API with `npm run dev:api`.
3. Run the web app with `npm run dev:web`.

The API seeds a technical corpus and can rebuild its on-disk index on demand. See [docs/architecture.md](/Users/nishalpoojary/Projects/codex/aura/docs/architecture.md) for the system design and [docs/resume-bullets.md](/Users/nishalpoojary/Projects/codex/aura/docs/resume-bullets.md) for resume framing.

## Optional PostgreSQL mode

Aura runs out of the box in demo mode, but it can also persist crawled content to PostgreSQL.

1. Start a local Postgres instance.
2. Set `DATABASE_URL` before starting the API.

Example:

```bash
export DATABASE_URL="postgresql://localhost:5432/aura"
npm run dev:api
```

When `DATABASE_URL` is available, Aura will:

- bootstrap the schema automatically
- seed the initial technical corpus into Postgres
- persist crawled documents, query logs, crawl jobs, and failures
- expose the storage mode and live corpus status in the UI

## Live crawling

To enrich the corpus with live content, trigger:

```bash
curl -X POST "http://localhost:4000/api/crawl/run" \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'
```

The crawler now attempts to discover article URLs from source homepages and sitemaps before parsing and indexing them.

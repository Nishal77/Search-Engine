# Resume Framing

## One-line project description

Built a vertical search engine for technical content with a custom inverted index, BM25 retrieval, feature-based reranking, crawl hygiene, and offline relevance evaluation.

## Strong bullet options

- Engineered a TypeScript search platform that crawls and indexes technical content with custom field-aware postings, phrase-aware BM25 ranking, typo tolerance, and explainable score breakdowns.
- Implemented search-engine primitives end to end, including URL normalization, deduplication, on-disk index segments, latency logging, and benchmark-driven relevance metrics such as Precision@10, MRR, and NDCG@10.
- Shipped a full-stack search product with Fastify and Next.js that exposes search, ranking explanation, crawl controls, and admin health metrics over a curated corpus of engineering content.

## Interview talking points

- Why a vertical search engine is more credible than a “mini Google”
- Why lexical retrieval and ranking diagnostics still matter in an AI-heavy market
- Trade-offs between single-node simplicity and distributed search architectures
- How judged queries protect retrieval quality during ranking changes

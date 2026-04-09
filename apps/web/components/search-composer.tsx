"use client";

import type { ChangeEvent, FormEvent } from "react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function syncUrl(pathname: string, query: string, sort: string, router: ReturnType<typeof useRouter>) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (sort !== "relevance") {
    params.set("sort", sort);
  }
  const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
  router.replace(target);
}

export function SearchComposer(props: { initialQuery: string; initialSort: "relevance" | "latest" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(props.initialQuery);
  const [sort, setSort] = useState(props.initialSort);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setSort((searchParams.get("sort") as "relevance" | "latest" | null) ?? "relevance");
  }, [searchParams]);

  return (
    <form
      className="searchbar"
      action={pathname}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(() => {
          syncUrl(pathname, query.trim(), sort, router);
        });
      }}
    >
      <input
        name="q"
        value={query}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
        placeholder='Try "bm25 ranking" or site:postgresql.org mvcc'
        aria-label="Search query"
      />
      <select
        aria-label="Sort results"
        value={sort}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          const nextSort = event.target.value as "relevance" | "latest";
          setSort(nextSort);
          startTransition(() => {
            syncUrl(pathname, deferredQuery.trim(), nextSort, router);
          });
        }}
      >
        <option value="relevance">Relevance</option>
        <option value="latest">Latest</option>
      </select>
      <button className="cta" type="submit">
        Search
      </button>
    </form>
  );
}

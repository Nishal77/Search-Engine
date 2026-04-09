import { describe, expect, it } from "vitest";

import { parseQuery } from "./query.js";

describe("parseQuery", () => {
  it("extracts phrases, site filters, and lexical terms", () => {
    const parsed = parseQuery('site:postgresql.org "write ahead log" wal checkpoints', 2, "latest");

    expect(parsed.siteFilter).toBe("postgresql.org");
    expect(parsed.phrases).toEqual([["write", "ahead", "log"]]);
    expect(parsed.tokens).toContain("wal");
    expect(parsed.tokens).toContain("checkpoint");
    expect(parsed.page).toBe(2);
    expect(parsed.sort).toBe("latest");
  });
});

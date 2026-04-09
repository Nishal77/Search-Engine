import { describe, expect, it } from "vitest";

import { seedDocuments } from "../data/documents.js";
import { DocumentStore } from "./store.js";

describe("DocumentStore", () => {
  it("deduplicates incoming documents by canonical URL", () => {
    const store = new DocumentStore();
    const duplicate = {
      ...seedDocuments[0],
      id: "doc-duplicate"
    };

    const result = store.upsert(duplicate);

    expect(result.inserted).toBe(false);
    expect(result.existingId).toBe(seedDocuments[0].id);
  });
});

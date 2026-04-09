import type {
  DocumentRecord,
  IndexDocumentStats,
  LexiconEntry,
  PostingRecord,
  SearchField,
  SearchIndexSnapshot
} from "@aura/shared";

import { tokenizeWithPositions } from "./text.js";

function emptyFieldFrequencies(): Record<SearchField, number> {
  return {
    title: 0,
    headings: 0,
    body: 0,
    anchor: 0
  };
}

function emptyPositions(): Record<SearchField, number[]> {
  return {
    title: [],
    headings: [],
    body: [],
    anchor: []
  };
}

export function buildIndex(documents: DocumentRecord[]): SearchIndexSnapshot {
  const lexicon = new Map<string, Map<string, PostingRecord>>();
  const documentStats = new Map<string, IndexDocumentStats>();
  const fieldLengthTotals: Record<SearchField, number> = {
    title: 0,
    headings: 0,
    body: 0,
    anchor: 0
  };

  for (const document of documents) {
    const fieldTokens = {
      title: tokenizeWithPositions(document.title),
      headings: tokenizeWithPositions(document.headings.join(" ")),
      body: tokenizeWithPositions(document.body),
      anchor: tokenizeWithPositions(document.anchorText.join(" "))
    };

    const fieldLengths: Record<SearchField, number> = {
      title: fieldTokens.title.length,
      headings: fieldTokens.headings.length,
      body: fieldTokens.body.length,
      anchor: fieldTokens.anchor.length
    };

    for (const field of Object.keys(fieldLengths) as SearchField[]) {
      fieldLengthTotals[field] += fieldLengths[field];
    }

    documentStats.set(document.id, {
      docId: document.id,
      fieldLengths,
      totalLength: fieldLengths.title + fieldLengths.headings + fieldLengths.body + fieldLengths.anchor
    });

    for (const field of Object.keys(fieldTokens) as SearchField[]) {
      for (const { term, position } of fieldTokens[field]) {
        let termPostings = lexicon.get(term);
        if (!termPostings) {
          termPostings = new Map();
          lexicon.set(term, termPostings);
        }
        let posting = termPostings.get(document.id);
        if (!posting) {
          posting = {
            docId: document.id,
            termFrequency: 0,
            fieldTermFrequency: emptyFieldFrequencies(),
            positions: emptyPositions()
          };
          termPostings.set(document.id, posting);
        }
        posting.termFrequency += 1;
        posting.fieldTermFrequency[field] += 1;
        posting.positions[field].push(position);
      }
    }
  }

  const snapshotLexicon: Record<string, LexiconEntry> = {};
  for (const [term, postingsByDoc] of lexicon.entries()) {
    snapshotLexicon[term] = {
      term,
      documentFrequency: postingsByDoc.size,
      postings: [...postingsByDoc.values()]
    };
  }

  const docCount = documents.length || 1;

  return {
    builtAt: new Date().toISOString(),
    docCount: documents.length,
    averageFieldLengths: {
      title: fieldLengthTotals.title / docCount,
      headings: fieldLengthTotals.headings / docCount,
      body: fieldLengthTotals.body / docCount,
      anchor: fieldLengthTotals.anchor / docCount
    },
    documents: Object.fromEntries(documentStats.entries()),
    lexicon: snapshotLexicon
  };
}

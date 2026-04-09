import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SearchIndexSnapshot } from "@aura/shared";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultIndexDir = path.resolve(moduleDir, "../../.index");

export class DiskIndexStore {
  constructor(private readonly indexDir = defaultIndexDir) {}

  async loadLatest(): Promise<SearchIndexSnapshot | null> {
    try {
      const latestPath = path.join(this.indexDir, "latest.json");
      const contents = await readFile(latestPath, "utf8");
      return JSON.parse(contents) as SearchIndexSnapshot;
    } catch {
      return null;
    }
  }

  async save(snapshot: SearchIndexSnapshot): Promise<string> {
    await mkdir(this.indexDir, { recursive: true });
    const timestamp = snapshot.builtAt.replace(/[:.]/g, "-");
    const segmentPath = path.join(this.indexDir, `segment-${timestamp}.json`);
    const serialized = JSON.stringify(snapshot, null, 2);
    await writeFile(segmentPath, serialized, "utf8");
    await writeFile(path.join(this.indexDir, "latest.json"), serialized, "utf8");
    return segmentPath;
  }

  async sizeBytes(): Promise<number> {
    try {
      const stats = await stat(path.join(this.indexDir, "latest.json"));
      return stats.size;
    } catch {
      return 0;
    }
  }
}

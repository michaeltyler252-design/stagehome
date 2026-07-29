import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface ManifestRecord {
  university: string;
  property: string;
  sourceFile: string;
  rawTextFile: string;
  knownIssues: string[];
}

export interface Manifest {
  importBatch: string;
  county: string;
  note: string;
  records: ManifestRecord[];
}

const SEED_DATA_ROOT = join(__dirname, "..", "..", "prisma", "seed-data");

/** Directory holding a given county's raw text + manifest (e.g. "nairobi", "kiambu"). */
export function countySeedDataDir(countySlug: string): string {
  return join(SEED_DATA_ROOT, countySlug);
}

export function loadManifest(countySlug: string): Manifest {
  const raw = readFileSync(join(countySeedDataDir(countySlug), "import-manifest.json"), "utf-8");
  return JSON.parse(raw) as Manifest;
}

export function computeBatchChecksum(countySlug: string, manifest: Manifest): string {
  const dir = countySeedDataDir(countySlug);
  const hash = createHash("sha256");
  hash.update(JSON.stringify(manifest.records.map((r) => r.rawTextFile).sort()));
  for (const record of manifest.records) {
    const text = readFileSync(join(dir, record.rawTextFile), "utf-8");
    hash.update(text);
  }
  return hash.digest("hex");
}

// --- Backward-compatible aliases for existing Nairobi tooling/tests ---
export const SEED_DATA_DIR = countySeedDataDir("nairobi");

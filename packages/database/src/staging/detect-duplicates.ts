import { prisma } from "../client";

// Implements the "fuzzy name match" signal from
// docs/data-quality/duplicate-conflict-detection-design.md, scoped to
// records already sitting in staging (before promotion to canonical
// tables). Geospatial matching (signal 3 in the design doc) is deliberately
// NOT implemented yet — the institution verification register found that
// GPS coordinates in the source document are not reliable enough to trust
// for a distance calculation until re-extracted and geocoded (Milestone 2
// does not perform that re-extraction; it is Milestone 4/6 scope).

export interface DuplicateCandidate {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  similarity: number;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

/**
 * Finds pairs of staged property records whose names are similar above
 * `threshold`, using PostgreSQL's pg_trgm similarity() function (already
 * enabled as a database extension in the Prisma schema).
 *
 * This intentionally does NOT auto-merge anything. Per the design doc, an
 * exact or fuzzy match with disagreeing fields must be FLAGGED, not merged,
 * and even a same-name match requires a human decision when either record is
 * incomplete (see the Station View Residency case).
 */
export async function findFuzzyDuplicateCandidates(
  batchId: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<DuplicateCandidate[]> {
  // Prisma leaves scalar column names in their camelCase schema form (quoted
  // identifiers) since no @map override was added to these fields — only the
  // table name is remapped via @@map. Quote them exactly here to match.
  const rows = await prisma.$queryRaw<
    Array<{ a_id: string; a_name: string; b_id: string; b_name: string; similarity: number }>
  >`
    SELECT
      a."id" AS a_id,
      a."propertyName" AS a_name,
      b."id" AS b_id,
      b."propertyName" AS b_name,
      similarity(a."propertyName", b."propertyName") AS similarity
    FROM staging.raw_property_records a
    JOIN staging.raw_property_records b
      ON a."id" < b."id"
     AND a."batchId" = ${batchId}
     AND b."batchId" = ${batchId}
    WHERE similarity(a."propertyName", b."propertyName") >= ${threshold}
    ORDER BY similarity DESC
  `;

  return rows.map((row: { a_id: string; a_name: string; b_id: string; b_name: string; similarity: number }) => ({
    aId: row.a_id,
    aName: row.a_name,
    bId: row.b_id,
    bName: row.b_name,
    similarity: row.similarity,
  }));
}

/**
 * Flags every candidate pair by setting conflict_status = 'FLAGGED' on both
 * records, unless a record is already 'RESOLVED'. Never merges or deletes —
 * merging is an explicit administrator action per the design doc's
 * resolution workflow.
 */
export async function flagDuplicateCandidates(candidates: DuplicateCandidate[]): Promise<number> {
  const idsToFlag = new Set<string>();
  for (const candidate of candidates) {
    idsToFlag.add(candidate.aId);
    idsToFlag.add(candidate.bId);
  }

  const result = await prisma.rawPropertyRecord.updateMany({
    where: {
      id: { in: Array.from(idsToFlag) },
      conflictStatus: { not: "RESOLVED" },
    },
    data: { conflictStatus: "FLAGGED" },
  });

  return result.count;
}

async function main() {
  const batchKey = process.argv[2];
  if (!batchKey) {
    console.error("Usage: tsx src/staging/detect-duplicates.ts <batchKey>");
    process.exitCode = 1;
    return;
  }

  const batch = await prisma.rawImportBatch.findUnique({ where: { batchKey } });
  if (!batch) {
    console.error(`No batch found with key "${batchKey}".`);
    process.exitCode = 1;
    return;
  }

  const candidates = await findFuzzyDuplicateCandidates(batch.id);
  console.log(`Found ${candidates.length} candidate duplicate pair(s):`);
  for (const c of candidates) {
    console.log(`  "${c.aName}" ~ "${c.bName}" (similarity: ${c.similarity.toFixed(2)})`);
  }

  if (candidates.length > 0) {
    const flagged = await flagDuplicateCandidates(candidates);
    console.log(`Flagged ${flagged} record(s) as conflict_status = FLAGGED.`);
  }
}

// Allow running as a script (`tsx src/staging/detect-duplicates.ts <batchKey>`)
// as well as importing the two functions above from application code.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

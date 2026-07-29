import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../client";
import { loadManifest, computeBatchChecksum, countySeedDataDir } from "./manifest";

// Imports one county's Part O source records into the STAGING schema only.
// Nothing here touches the public.properties / public.universities tables —
// promotion is a separate, explicit, logged step (see
// docs/data-quality/source-import-staging-design.md). This script's only job
// is to get the raw, unmodified source text into a queryable, auditable
// place, exactly as Part B rule 4 requires ("never invent").
//
// Generalised in Kiambu's Milestone 1 (Phase 1's second county) from the
// original Nairobi-only import-nairobi.ts, so the same tested logic runs
// for every subsequent county rather than being copy-pasted 14 more times.

export async function importCounty(countySlug: string): Promise<void> {
  const manifest = loadManifest(countySlug);
  const checksum = computeBatchChecksum(countySlug, manifest);
  const dir = countySeedDataDir(countySlug);

  const existingBatch = await prisma.rawImportBatch.findUnique({
    where: { batchKey: manifest.importBatch },
  });

  if (existingBatch && existingBatch.checksum === checksum) {
    console.log(
      `Batch "${manifest.importBatch}" already imported with an identical checksum. No-op (idempotent re-run).`
    );
    return;
  }

  const batch = await prisma.rawImportBatch.upsert({
    where: { batchKey: manifest.importBatch },
    update: { checksum, county: manifest.county },
    create: {
      batchKey: manifest.importBatch,
      checksum,
      county: manifest.county,
      importedBy: "staging-import-script",
    },
  });

  let propertyCount = 0;
  let universityCount = 0;
  let issueCount = 0;

  for (const record of manifest.records) {
    const rawText = readFileSync(join(dir, record.rawTextFile), "utf-8");

    const conflictStatus = record.knownIssues.some((issue) => issue.includes("FLAGGED"))
      ? "FLAGGED"
      : "NONE";

    await prisma.rawPropertyRecord.create({
      data: {
        batchId: batch.id,
        propertyName: record.property,
        universityName: record.university,
        sourceFile: record.sourceFile,
        rawText,
        conflictStatus,
      },
    });
    propertyCount += 1;

    const existingUniversityRecord = await prisma.rawUniversityRecord.findFirst({
      where: { batchId: batch.id, universityName: record.university },
    });
    if (!existingUniversityRecord) {
      await prisma.rawUniversityRecord.create({
        data: {
          batchId: batch.id,
          universityName: record.university,
          sourceFile: record.sourceFile,
        },
      });
      universityCount += 1;
    }

    for (const issue of record.knownIssues) {
      await prisma.rawFieldIssue.create({
        data: {
          batchId: batch.id,
          recordType: "property",
          recordRef: record.property,
          issue,
        },
      });
      issueCount += 1;
    }
  }

  console.log(
    `Imported batch "${manifest.importBatch}": ${propertyCount} property records, ` +
      `${universityCount} university records, ${issueCount} recorded field issues.`
  );
  console.log(
    "All records remain in the staging schema with SOURCE_SUPPLIED_UNVERIFIED status. " +
      "None are visible to the public API. Promotion to canonical tables is a separate step."
  );
}

if (require.main === module) {
  const countySlug = process.argv[2];
  if (!countySlug) {
    console.error("Usage: tsx src/staging/import-county.ts <county-slug>");
    process.exitCode = 1;
  } else {
    importCounty(countySlug)
      .catch((err) => {
        console.error(err);
        process.exitCode = 1;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  }
}

import { randomUUID } from "node:crypto";
import { prisma } from "../client";

// Bulk-runs the same "promote one staged record into public.universities"
// step as apps/api's UniversityVerificationService.promote(), for every
// raw_university_records row that hasn't been promoted yet, across every
// county already imported into staging.
//
// This is intentionally mechanical and non-judgmental: it copies a
// source-supplied name into the canonical table as-is, at
// verificationStatus = PENDING. It never sets VERIFIED — per
// docs/data-quality/source-import-staging-design.md, confirming an
// institution against the Commission for University Education register is
// a deliberate, audited administrator action (see
// POST /admin/verification/universities/:id/verify), not something a bulk
// script should decide on data's behalf. Running this script alone will
// NOT make anything appear on the public /universities page — it only
// moves records to the point where an admin can review and verify them.
//
// Safe to re-run: already-promoted records (promotedUniversityId is set)
// are skipped, and university names are matched case-insensitively so the
// same institution named in multiple counties' source files is attached
// once rather than duplicated.

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// See UniversityVerificationService for why this alias map exists — every
// other county's staging `county` string already matches its canonical
// County.name verbatim.
const STAGING_COUNTY_NAME_ALIASES: Record<string, string> = {
  Nairobi: "Nairobi City",
};

async function promoteOne(recordId: string, actor: string): Promise<"promoted" | "attached" | "skipped"> {
  const rawRecord = await prisma.rawUniversityRecord.findUnique({
    where: { id: recordId },
    include: { batch: true },
  });
  if (!rawRecord || rawRecord.promotedUniversityId) {
    return "skipped";
  }

  const existing = await prisma.university.findFirst({
    where: { officialName: { equals: rawRecord.universityName, mode: "insensitive" } },
  });

  if (existing) {
    await prisma.rawUniversityRecord.update({
      where: { id: rawRecord.id },
      data: { promotedUniversityId: existing.id },
    });
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: "university.attach_existing",
        entityType: "university",
        entityId: existing.id,
        metadataJson: { rawUniversityRecordId: rawRecord.id, runBy: actor },
      },
    });
    return "attached";
  }

  const countyName = STAGING_COUNTY_NAME_ALIASES[rawRecord.batch.county ?? ""] ?? rawRecord.batch.county;
  const county = countyName
    ? await prisma.county.findFirst({ where: { name: { equals: countyName, mode: "insensitive" } } })
    : null;

  if (!county) {
    console.warn(
      `  SKIPPED "${rawRecord.universityName}": could not resolve county "${rawRecord.batch.county}". ` +
        "Promote this one individually via the admin API with an explicit countySlug."
    );
    return "skipped";
  }

  const slugBase = slugify(rawRecord.universityName);
  let slug = slugBase;
  if (await prisma.university.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
  }

  const university = await prisma.university.create({
    data: {
      countyId: county.id,
      officialName: rawRecord.universityName,
      slug,
      sourceStatus: "SOURCE_SUPPLIED",
      verificationStatus: "PENDING",
      publicationStatus: "DRAFT",
      sourceFile: rawRecord.sourceFile,
      sourceRecordReference: rawRecord.id,
      confidenceLevel: "LOW",
    },
  });

  const sourceRecord = await prisma.sourceRecord.create({
    data: {
      sourceFile: rawRecord.sourceFile ?? "unknown",
      entityType: "university",
      entityId: university.id,
      rawExcerpt: rawRecord.rawExcerpt ?? undefined,
      importBatch: rawRecord.batch.batchKey,
    },
  });

  await prisma.verificationEvent.create({
    data: {
      sourceRecordId: sourceRecord.id,
      entityType: "university",
      entityId: university.id,
      previousStatus: "UNVERIFIED",
      newStatus: "PENDING",
      notes: `Bulk-promoted from staging raw university record ${rawRecord.id} (batch ${rawRecord.batch.batchKey}) by ${actor}.`,
    },
  });

  await prisma.rawUniversityRecord.update({
    where: { id: rawRecord.id },
    data: { promotedUniversityId: university.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "university.promote",
      entityType: "university",
      entityId: university.id,
      metadataJson: { rawUniversityRecordId: rawRecord.id, runBy: actor },
    },
  });

  return "promoted";
}

async function main() {
  const pending = await prisma.rawUniversityRecord.findMany({
    where: { promotedUniversityId: null },
    select: { id: true, universityName: true },
  });

  console.log(`Found ${pending.length} not-yet-promoted staged university record(s).`);

  let promoted = 0;
  let attached = 0;
  let skipped = 0;

  for (const record of pending) {
    const outcome = await promoteOne(record.id, "staging:promote-universities script");
    if (outcome === "promoted") promoted += 1;
    else if (outcome === "attached") attached += 1;
    else skipped += 1;
  }

  console.log(
    `Done. ${promoted} new university row(s) created (status PENDING), ` +
      `${attached} raw record(s) attached to an existing university, ${skipped} skipped.`
  );
  console.log(
    "Nothing here is publicly visible yet — PENDING universities still need an admin to run " +
      "POST /admin/verification/universities/:id/verify (or reject) after checking the CUE register."
  );
}

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

export { promoteOne };

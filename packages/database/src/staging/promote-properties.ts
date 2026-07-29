import { randomUUID } from "node:crypto";
import { prisma } from "../client";

// Bulk-runs the same "promote one staged record into public.properties"
// step as apps/api's PropertyPromotionService.promote(), for every
// raw_property_records row that hasn't been promoted yet, across every
// county already imported into staging. Mirrors promote-universities.ts.
//
// Intentionally mechanical: copies only the fields the source data
// genuinely supplies (title, description, county) into the canonical
// table, at publicationStatus = REVIEW / verificationStatus = PENDING. It
// never sets APPROVED or PUBLISHED — an admin still has to review each one
// via the existing verification queue (POST /admin/verification/properties/
// :id/approve, then :id/publish, which additionally enforces
// APPROVED_COUNTY_SLUGS). Running this script alone will NOT make
// anything appear on the public site.
//
// Safe to re-run: already-promoted records (promotedPropertyId is set) are
// skipped.

const STAGING_COUNTY_NAME_ALIASES: Record<string, string> = {
  Nairobi: "Nairobi City",
};

const SOURCE_SUPPLIED_ORGANISATION_NAME = "StageHome Verified Sources";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getOrCreateSourceSuppliedOrganisation(): Promise<string> {
  const existing = await prisma.organisation.findFirst({
    where: { name: SOURCE_SUPPLIED_ORGANISATION_NAME },
  });
  if (existing) return existing.id;
  const created = await prisma.organisation.create({
    data: { name: SOURCE_SUPPLIED_ORGANISATION_NAME, status: "VERIFIED" },
  });
  return created.id;
}

async function promoteOne(recordId: string, organisationId: string): Promise<"promoted" | "skipped"> {
  const rawRecord = await prisma.rawPropertyRecord.findUnique({
    where: { id: recordId },
    include: { batch: true },
  });
  if (!rawRecord || rawRecord.promotedPropertyId) {
    return "skipped";
  }

  const countyName = STAGING_COUNTY_NAME_ALIASES[rawRecord.batch.county ?? ""] ?? rawRecord.batch.county;
  const county = countyName
    ? await prisma.county.findFirst({ where: { name: { equals: countyName, mode: "insensitive" } } })
    : null;

  if (!county) {
    console.warn(
      `  SKIPPED "${rawRecord.propertyName}": could not resolve county "${rawRecord.batch.county}". ` +
        "Promote this one individually via the admin API with an explicit countySlug."
    );
    return "skipped";
  }

  const slugBase = slugify(rawRecord.propertyName);
  let slug = slugBase;
  if (await prisma.property.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
  }
  const publicReference = `SH-${randomUUID().slice(0, 8).toUpperCase()}`;

  const property = await prisma.property.create({
    data: {
      organisationId,
      countyId: county.id,
      title: rawRecord.propertyName,
      slug,
      publicReference,
      description: rawRecord.rawText,
      sourceStatus: "SOURCE_SUPPLIED",
      verificationStatus: "PENDING",
      publicationStatus: "REVIEW",
      sourceFile: rawRecord.sourceFile,
      sourceRecordReference: rawRecord.id,
      confidenceLevel: "LOW",
      conflictStatus: (rawRecord.conflictStatus ?? "NONE") as
        | "NONE"
        | "FLAGGED"
        | "UNDER_REVIEW"
        | "RESOLVED",
    },
  });

  const sourceRecord = await prisma.sourceRecord.create({
    data: {
      sourceFile: rawRecord.sourceFile ?? "unknown",
      entityType: "property",
      entityId: property.id,
      rawExcerpt: rawRecord.rawText.slice(0, 2000),
      importBatch: rawRecord.batch.batchKey,
    },
  });

  await prisma.verificationEvent.create({
    data: {
      sourceRecordId: sourceRecord.id,
      entityType: "property",
      entityId: property.id,
      previousStatus: "UNVERIFIED",
      newStatus: "PENDING",
      notes: `Bulk-promoted from staging raw property record ${rawRecord.id} (batch ${rawRecord.batch.batchKey}).`,
    },
  });

  await prisma.rawPropertyRecord.update({
    where: { id: rawRecord.id },
    data: { promotedPropertyId: property.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "property.promote",
      entityType: "property",
      entityId: property.id,
      metadataJson: { rawPropertyRecordId: rawRecord.id, runBy: "staging:promote-properties script" },
    },
  });

  return "promoted";
}

async function main() {
  const pending = await prisma.rawPropertyRecord.findMany({
    where: { promotedPropertyId: null },
    select: { id: true, propertyName: true },
  });
  console.log(`Found ${pending.length} not-yet-promoted staged property record(s).`);

  const organisationId = await getOrCreateSourceSuppliedOrganisation();

  let promoted = 0;
  let skipped = 0;
  for (const record of pending) {
    const outcome = await promoteOne(record.id, organisationId);
    if (outcome === "promoted") promoted += 1;
    else skipped += 1;
  }

  console.log(
    `Done. ${promoted} new property row(s) created (status REVIEW/PENDING), ${skipped} skipped.`
  );
  console.log(
    "Nothing here is publicly visible yet — REVIEW properties still need an admin to run " +
      "POST /admin/verification/properties/:id/approve, then :id/publish (which also enforces " +
      "APPROVED_COUNTY_SLUGS — currently nairobi-city, kiambu, nakuru)."
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

export { promoteOne, getOrCreateSourceSuppliedOrganisation };

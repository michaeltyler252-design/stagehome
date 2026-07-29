import { prisma } from "../client";
import { importCounty } from "./import-county";
import { promoteOne, getOrCreateSourceSuppliedOrganisation } from "./promote-properties";

// DEVELOPMENT/STAGING CONVENIENCE ONLY.
//
// The public search API (and the county pages, which now gate visibility
// on live PUBLISHED-property counts) will correctly show nothing until a
// property actually reaches publicationStatus: PUBLISHED. In a real
// environment that's the intended, human, audited path: stage -> promote
// -> admin approve -> admin publish. A fresh dev database has no admin
// sitting at the review queue, so this script exercises that exact same
// pipeline end-to-end, using only real, already-supplied Kenyan source
// data (packages/database/prisma/seed-data/{nairobi,kiambu,nakuru}) — it
// invents nothing.
//
// Scoped deliberately to nairobi-city, kiambu, and nakuru: those are the
// only counties in APPROVED_COUNTY_SLUGS
// (apps/api/src/verification/verification.service.ts) that publish() will
// actually allow through to PUBLISHED — promoting/approving properties in
// any other county would just leave them stuck at APPROVED with no way to
// reach the public site, which wouldn't actually test anything.
//
// Refuses to run outside development/test, for the same reason
// dev-promote-and-verify-universities.ts does: this bypasses the real,
// audited human review step, and must never touch a real database.
//
// Usage: pnpm --filter @student-housing/database dev:seed-search-data

const ALLOWED_ENVIRONMENTS = new Set(["development", "test"]);
const DEV_SEED_COUNTIES = ["nairobi", "kiambu", "nakuru"];

async function approveAndPublish(propertyId: string) {
  // Mirrors VerificationService.approve()/publish() exactly (that service
  // lives in apps/api and isn't importable from packages/database) — same
  // two state transitions, same APPROVED_COUNTY_SLUGS gate, just run
  // without a human clicking the buttons.
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      publicationStatus: "APPROVED",
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedBy: null,
    },
    include: { county: true },
  });

  await prisma.verificationEvent.create({
    data: {
      entityType: "property",
      entityId: propertyId,
      previousStatus: "PENDING",
      newStatus: "VERIFIED",
      method: "documentary",
      notes: "Dev-seeded via dev-seed-search-data script — not a real manual verification.",
    },
  });

  const APPROVED_COUNTY_SLUGS = ["nairobi-city", "kiambu", "nakuru"];
  if (!APPROVED_COUNTY_SLUGS.includes(property.county.slug)) {
    console.warn(`  Skipping publish for "${property.title}": ${property.county.name} isn't approved yet.`);
    return;
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { publicationStatus: "PUBLISHED" },
  });
}

async function main() {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !ALLOWED_ENVIRONMENTS.has(nodeEnv)) {
    throw new Error(
      `Refusing to run: NODE_ENV is "${nodeEnv ?? "unset"}". This script auto-approves and ` +
        "auto-publishes properties without a human review step and must only run with " +
        "NODE_ENV=development or NODE_ENV=test. In staging or production, use the admin " +
        "verification UI/API instead."
    );
  }

  for (const countySlug of DEV_SEED_COUNTIES) {
    await importCounty(countySlug);
  }

  const organisationId = await getOrCreateSourceSuppliedOrganisation();

  const pending = await prisma.rawPropertyRecord.findMany({
    where: { promotedPropertyId: null },
    select: { id: true },
  });
  console.log(`[dev] Promoting ${pending.length} staged property record(s)...`);
  const promotedIds: string[] = [];
  for (const record of pending) {
    const outcome = await promoteOne(record.id, organisationId);
    if (outcome === "promoted") {
      const updated = await prisma.rawPropertyRecord.findUnique({ where: { id: record.id } });
      if (updated?.promotedPropertyId) promotedIds.push(updated.promotedPropertyId);
    }
  }

  const toApprove = await prisma.property.findMany({
    where: { publicationStatus: "REVIEW" },
    select: { id: true, title: true },
  });
  console.log(`[dev] Approving and publishing ${toApprove.length} property/ies...`);
  for (const property of toApprove) {
    await approveAndPublish(property.id);
  }

  const publishedCount = await prisma.property.count({ where: { publicationStatus: "PUBLISHED" } });
  console.log(
    `[dev] Done. ${publishedCount} propert${publishedCount === 1 ? "y is" : "ies are"} now PUBLISHED ` +
      "and will appear in /search and on their county's page."
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

// Imports the complete list of CUE-accredited Kenyan universities
// (packages/database/src/seed/kenyan-universities.ts) directly as VERIFIED
// records. Unlike the property pipeline, this doesn't go through a
// staging→promote→verify flow: the data's own source (Kenya's Commission
// for University Education, the actual government accreditation
// authority) already constitutes real, independent, authoritative
// verification that these are genuinely accredited universities. Their
// county assignments were independently checked per-institution (see the
// source file's own header comment for citations and confidence notes).
//
// Idempotent: upserts by slug, safe to re-run. Skips (and reports) any
// entry whose countySlug doesn't match a seeded county, rather than
// silently failing.

import { prisma } from "../client";
import { KENYAN_UNIVERSITIES } from "../seed/kenyan-universities";

export async function main() {
  const counties = await prisma.county.findMany({ select: { id: true, slug: true } });
  const countyIdBySlug = new Map(counties.map((c) => [c.slug, c.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of KENYAN_UNIVERSITIES) {
    const countyId = countyIdBySlug.get(entry.countySlug);
    if (!countyId) {
      console.warn(`[import-all-kenyan-universities] Skipping "${entry.officialName}" — unknown county slug "${entry.countySlug}"`);
      skipped += 1;
      continue;
    }

    const existing = await prisma.university.findUnique({ where: { slug: entry.slug } });

    await prisma.university.upsert({
      where: { slug: entry.slug },
      update: {
        officialName: entry.officialName,
        countyId,
        type: entry.type,
      },
      create: {
        officialName: entry.officialName,
        slug: entry.slug,
        countyId,
        type: entry.type,
        sourceStatus: "OFFICIAL_SOURCE",
        verificationStatus: "VERIFIED",
        confidenceLevel: "HIGH",
        publicationStatus: "PUBLISHED",
        verifiedAt: new Date(),
        sourceFile: "CUE Approved Universities Register, March 2026",
        notes:
          "Imported from Kenya's Commission for University Education accreditation register. County assignment independently verified against the institution's own site/Wikipedia/news coverage — see packages/database/src/seed/kenyan-universities.ts for citations.",
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  console.log(
    `[import-all-kenyan-universities] Done. ${created} created, ${updated} updated, ${skipped} skipped (unknown county). Total in dataset: ${KENYAN_UNIVERSITIES.length}.`
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

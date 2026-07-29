import { prisma } from "../client";
import { promoteOne } from "./promote-universities";

// DEVELOPMENT/STAGING CONVENIENCE ONLY.
//
// promote-universities.ts (above) deliberately stops at PENDING: confirming
// an institution against the Commission for University Education register
// is meant to be a real, audited administrator decision, made through
// POST /admin/verification/universities/:id/verify. That's still exactly
// how it works in every real environment.
//
// But a fresh local/dev/staging database has no admin sitting at the
// verification queue clicking "Verify" — which means `pnpm prisma:seed`
// alone still leaves the public /universities page empty, for a totally
// different reason than the original bug (no rows, vs. rows stuck at
// PENDING). This script exists so a developer doesn't have to hand-edit
// the database to see real screens: it promotes every pending raw record
// and then auto-verifies every PENDING university, so the pipeline can be
// exercised end-to-end without touching Postgres directly.
//
// It refuses to run unless NODE_ENV is explicitly "development" or "test" —
// never against a real/production database, and never invents data: it
// only changes verificationStatus on records that a real import already
// staged from a real source file.

const ALLOWED_ENVIRONMENTS = new Set(["development", "test"]);

async function main() {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !ALLOWED_ENVIRONMENTS.has(nodeEnv)) {
    throw new Error(
      `Refusing to run: NODE_ENV is "${nodeEnv ?? "unset"}". This script auto-verifies ` +
        'universities without a human CUE-register check and must only run with NODE_ENV=development ' +
        "or NODE_ENV=test. In staging or production, use the admin verification UI/API instead."
    );
  }

  const pending = await prisma.rawUniversityRecord.findMany({
    where: { promotedUniversityId: null },
    select: { id: true },
  });
  console.log(`[dev] Promoting ${pending.length} staged university record(s)...`);
  for (const record of pending) {
    await promoteOne(record.id, "dev-promote-and-verify-universities script");
  }

  const toVerify = await prisma.university.findMany({
    where: { verificationStatus: "PENDING" },
    select: { id: true, officialName: true },
  });
  console.log(`[dev] Auto-verifying ${toVerify.length} promoted university/ies...`);

  for (const university of toVerify) {
    await prisma.university.update({
      where: { id: university.id },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy: null,
        accreditationStatus: "Verified (dev auto-verify — not a real CUE-register check)",
      },
    });
    await prisma.verificationEvent.create({
      data: {
        entityType: "university",
        entityId: university.id,
        previousStatus: "PENDING",
        newStatus: "VERIFIED",
        method: "documentary",
        notes:
          "Auto-verified by the dev-only dev-promote-and-verify-universities script. " +
          "This is NOT a real Commission for University Education register check — do not run in production.",
      },
    });
  }

  console.log(
    `[dev] Done. ${toVerify.length} university/ies are now VERIFIED and will appear on ` +
      "the public /universities page and gate their county into /counties."
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

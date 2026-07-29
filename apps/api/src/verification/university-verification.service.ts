import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";

// Closes the gap described in docs/data-quality/source-import-staging-design.md:
// raw university records land in staging.raw_university_records via the
// per-county staging:import:* scripts, but nothing ever promoted them into
// public.universities, so GET /public/universities always returned an empty
// array (hence the "No universities loaded yet" empty state on the web app).
//
// This mirrors the property verification workflow (see verification.service.ts)
// with a two-step lifecycle for universities:
//   1. promote()  — staging raw record -> canonical `University` row.
//      New rows start at verificationStatus = PENDING ("in the pipeline, not
//      yet confirmed"), not VERIFIED. This intentionally does NOT make a
//      university publicly visible by itself.
//   2. verify() / reject() — the explicit administrator action that checks
//      the institution against the Commission for University Education
//      register (the same standard named in the "No universities loaded
//      yet" empty-state copy) and moves it to VERIFIED or REJECTED.
//
// public.service.ts's listUniversities() comment already says "Only expose
// universities whose verification has at least started" — this change also
// makes that filter actually true (previously nothing excluded UNVERIFIED
// rows; there simply were never any rows). See that file's diff too.

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Only Nairobi's staging county name ("Nairobi") doesn't match its canonical
// County.name ("Nairobi City") verbatim — every other imported county's
// staging `county` string is identical to its ROLLOUT_COUNTIES name (verified
// against every current import-manifest.json). Kept as an explicit map
// rather than fuzzy string matching so county resolution can never silently
// attach a university to the wrong county.
const STAGING_COUNTY_NAME_ALIASES: Record<string, string> = {
  Nairobi: "Nairobi City",
};

@Injectable()
export class UniversityVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Staged university records not yet promoted into the canonical table. */
  async listPromotionQueue() {
    return this.prisma.rawUniversityRecord.findMany({
      where: { promotedUniversityId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        universityName: true,
        campusName: true,
        sourceFile: true,
        rawExcerpt: true,
        createdAt: true,
        batch: { select: { batchKey: true, county: true } },
      },
    });
  }

  /** Universities already promoted, pending the CUE-register verification step. */
  async listVerificationQueue() {
    return this.prisma.university.findMany({
      where: { verificationStatus: "PENDING" },
      include: { county: true },
      orderBy: { createdAt: "asc" },
    });
  }

  private async resolveCounty(batchCountyName: string | null, countySlugOverride?: string) {
    if (countySlugOverride) {
      const county = await this.prisma.county.findUnique({ where: { slug: countySlugOverride } });
      if (!county) {
        throw new BadRequestException(`No county found with slug "${countySlugOverride}".`);
      }
      return county;
    }

    if (!batchCountyName) {
      throw new BadRequestException(
        "This record's import batch has no county name recorded, and no countySlug override was given."
      );
    }

    const resolvedName = STAGING_COUNTY_NAME_ALIASES[batchCountyName] ?? batchCountyName;
    const county = await this.prisma.county.findFirst({
      where: { name: { equals: resolvedName, mode: "insensitive" } },
    });

    if (!county) {
      throw new BadRequestException(
        `Could not automatically resolve county "${batchCountyName}" to a canonical county. ` +
          "Pass countySlug explicitly to resolve this."
      );
    }

    return county;
  }

  /**
   * Promotes one staged raw university record into `public.universities`.
   * If a university with the same name (case-insensitive) already exists,
   * this attaches the raw record to it instead of creating a duplicate —
   * per the design doc, only an exact name match is auto-resolved this way;
   * anything less certain stays a job for the existing fuzzy-duplicate
   * tooling (staging/detect-duplicates.ts) and human review.
   */
  async promote(rawUniversityRecordId: string, adminUserId: string, countySlugOverride?: string) {
    const rawRecord = await this.prisma.rawUniversityRecord.findUnique({
      where: { id: rawUniversityRecordId },
      include: { batch: true },
    });
    if (!rawRecord) {
      throw new NotFoundException("Raw university record not found.");
    }
    if (rawRecord.promotedUniversityId) {
      throw new BadRequestException("This record has already been promoted.");
    }

    const existing = await this.prisma.university.findFirst({
      where: { officialName: { equals: rawRecord.universityName, mode: "insensitive" } },
    });

    if (existing) {
      await this.prisma.rawUniversityRecord.update({
        where: { id: rawRecord.id },
        data: { promotedUniversityId: existing.id },
      });
      await this.prisma.auditLog.create({
        data: {
          actorId: adminUserId,
          action: "university.attach_existing",
          entityType: "university",
          entityId: existing.id,
          metadataJson: { rawUniversityRecordId: rawRecord.id },
        },
      });
      return existing;
    }

    const county = await this.resolveCounty(rawRecord.batch.county, countySlugOverride);

    const slugBase = slugify(rawRecord.universityName);
    let slug = slugBase;
    if (await this.prisma.university.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
    }

    const university = await this.prisma.university.create({
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

    const sourceRecord = await this.prisma.sourceRecord.create({
      data: {
        sourceFile: rawRecord.sourceFile ?? "unknown",
        entityType: "university",
        entityId: university.id,
        rawExcerpt: rawRecord.rawExcerpt ?? undefined,
        importBatch: rawRecord.batch.batchKey,
      },
    });

    await this.prisma.verificationEvent.create({
      data: {
        sourceRecordId: sourceRecord.id,
        entityType: "university",
        entityId: university.id,
        // The raw staging record has no verification status of its own; a
        // freshly promoted row is treated as starting from UNVERIFIED.
        previousStatus: "UNVERIFIED",
        newStatus: "PENDING",
        performedBy: adminUserId,
        notes: `Promoted from staging raw university record ${rawRecord.id} (batch ${rawRecord.batch.batchKey}).`,
      },
    });

    await this.prisma.rawUniversityRecord.update({
      where: { id: rawRecord.id },
      data: { promotedUniversityId: university.id },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "university.promote",
        entityType: "university",
        entityId: university.id,
        metadataJson: { rawUniversityRecordId: rawRecord.id },
      },
    });

    return university;
  }

  /** The explicit "confirmed against the CUE register" step. */
  async verify(
    universityId: string,
    adminUserId: string,
    options: { method?: string; evidenceUrl?: string; notes?: string } = {}
  ) {
    const university = await this.prisma.university.findUnique({ where: { id: universityId } });
    if (!university) {
      throw new NotFoundException("University not found.");
    }
    if (university.verificationStatus !== "PENDING") {
      throw new BadRequestException(
        `Cannot verify a university in status "${university.verificationStatus}"; it must be PENDING ` +
          "(i.e. already promoted from staging)."
      );
    }

    const updated = await this.prisma.university.update({
      where: { id: universityId },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        accreditationStatus: "Verified",
      },
    });

    await this.prisma.verificationEvent.create({
      data: {
        entityType: "university",
        entityId: universityId,
        previousStatus: "PENDING",
        newStatus: "VERIFIED",
        method: options.method ?? "documentary",
        performedBy: adminUserId,
        evidenceUrl: options.evidenceUrl,
        notes: options.notes ?? "Confirmed against the Commission for University Education register.",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "university.verify",
        entityType: "university",
        entityId: universityId,
      },
    });

    return updated;
  }

  async reject(universityId: string, adminUserId: string, reason: string) {
    const university = await this.prisma.university.findUnique({ where: { id: universityId } });
    if (!university) {
      throw new NotFoundException("University not found.");
    }
    if (university.verificationStatus !== "PENDING") {
      throw new BadRequestException(
        `Cannot reject a university in status "${university.verificationStatus}"; it must be PENDING.`
      );
    }

    const updated = await this.prisma.university.update({
      where: { id: universityId },
      data: { verificationStatus: "REJECTED", notes: reason },
    });

    await this.prisma.verificationEvent.create({
      data: {
        entityType: "university",
        entityId: universityId,
        previousStatus: "PENDING",
        newStatus: "REJECTED",
        performedBy: adminUserId,
        notes: reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "university.reject",
        entityType: "university",
        entityId: universityId,
        metadataJson: { reason },
      },
    });

    return updated;
  }
}

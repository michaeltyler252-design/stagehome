import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";

// ROOT CAUSE of the reported "NO VERIFIED LISTINGS MATCH YET" / empty
// counties bug: every county's staging import (import-county.ts) has
// always written real, audited source data into
// `staging.raw_property_records` — but unlike universities (which got
// `UniversityVerificationService.promote()` in an earlier session),
// **nothing anywhere ever promoted a raw property record into the
// canonical `public.properties` table.** `RawPropertyRecord` already has a
// `promotedPropertyId` column reserved for exactly this — it was simply
// never wired up. `public.properties` had zero SOURCE_SUPPLIED rows in
// every environment, so search, county pages, and the admin review queue
// all correctly showed nothing, because there was genuinely nothing to
// show — not a data-loading bug, a missing pipeline step.
//
// This mirrors UniversityVerificationService.promote() as closely as the
// data allows, with one necessary difference: raw property records don't
// carry structured rent/bedroom/amenity data, only propertyName,
// universityName (as supplied, unresolved), and verbatim rawText. Rather
// than inventing pricing, bedroom counts, or a PropertyCampus/Campus link
// that would require data this script doesn't have, promotion only ever
// sets the fields the source data genuinely supports (title, description,
// county) — exactly Part B rule 4 ("never invent"). Structured commercial
// terms (units, pricing) are added afterwards by whoever is doing the real
// manager/admin data entry for that property, same as for any other
// listing.
//
// Promoted properties land at `publicationStatus: REVIEW` (not DRAFT) —
// unlike a brand-new manager draft, this is already real, audited source
// data ready for the same admin review step a manager's "submit for
// verification" triggers (VerificationService.listReviewQueue() already
// filters on REVIEW, so a promoted property appears in the existing
// verification queue with no other change needed). `VerificationService
// .publish()` still enforces `APPROVED_COUNTY_SLUGS` afterwards — this
// promotion step does not bypass that gate.

const STAGING_COUNTY_NAME_ALIASES: Record<string, string> = {
  Nairobi: "Nairobi City",
};

// Source-supplied properties (staged from real published listings/site
// documents, not submitted by any manager account) still need to satisfy
// Property.organisationId, which is required by the schema — every
// property has to belong to *someone*. Rather than inventing a fake
// landlord, this is the same "our research team sourced it from public
// listings" organisation already described to students on /how-it-works.
// One row, upserted by name — never duplicated.
const SOURCE_SUPPLIED_ORGANISATION_NAME = "StageHome Verified Sources";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class PropertyPromotionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Staged raw property records not yet promoted into public.properties. */
  async listPromotionQueue() {
    return this.prisma.rawPropertyRecord.findMany({
      where: { promotedPropertyId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        propertyName: true,
        universityName: true,
        sourceFile: true,
        conflictStatus: true,
        createdAt: true,
        batch: { select: { batchKey: true, county: true } },
      },
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

  private async getOrCreateSourceSuppliedOrganisation(): Promise<string> {
    const existing = await this.prisma.organisation.findFirst({
      where: { name: SOURCE_SUPPLIED_ORGANISATION_NAME },
    });
    if (existing) {
      return existing.id;
    }
    const created = await this.prisma.organisation.create({
      data: { name: SOURCE_SUPPLIED_ORGANISATION_NAME, status: "VERIFIED" },
    });
    return created.id;
  }

  /**
   * Promotes one staged raw property record into `public.properties`, at
   * `publicationStatus: REVIEW` / `verificationStatus: PENDING`. Never sets
   * APPROVED or PUBLISHED — those stay explicit admin actions via the
   * existing VerificationService, exactly like the university pipeline.
   */
  async promote(rawPropertyRecordId: string, adminUserId: string, countySlugOverride?: string) {
    const rawRecord = await this.prisma.rawPropertyRecord.findUnique({
      where: { id: rawPropertyRecordId },
      include: { batch: true },
    });
    if (!rawRecord) {
      throw new NotFoundException("Raw property record not found.");
    }
    if (rawRecord.promotedPropertyId) {
      throw new BadRequestException("This record has already been promoted.");
    }

    const county = await this.resolveCounty(rawRecord.batch.county, countySlugOverride);
    const organisationId = await this.getOrCreateSourceSuppliedOrganisation();

    const slugBase = slugify(rawRecord.propertyName);
    let slug = slugBase;
    if (await this.prisma.property.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
    }
    const publicReference = `SH-${randomUUID().slice(0, 8).toUpperCase()}`;

    const property = await this.prisma.property.create({
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
        conflictStatus: rawRecord.conflictStatus as "NONE" | "FLAGGED" | "UNDER_REVIEW" | "RESOLVED",
      },
    });

    const sourceRecord = await this.prisma.sourceRecord.create({
      data: {
        sourceFile: rawRecord.sourceFile ?? "unknown",
        entityType: "property",
        entityId: property.id,
        rawExcerpt: rawRecord.rawText.slice(0, 2000),
        importBatch: rawRecord.batch.batchKey,
      },
    });

    await this.prisma.verificationEvent.create({
      data: {
        sourceRecordId: sourceRecord.id,
        entityType: "property",
        entityId: property.id,
        previousStatus: "UNVERIFIED",
        newStatus: "PENDING",
        performedBy: adminUserId,
        notes: `Promoted from staging raw property record ${rawRecord.id} (batch ${rawRecord.batch.batchKey}).`,
      },
    });

    await this.prisma.rawPropertyRecord.update({
      where: { id: rawRecord.id },
      data: { promotedPropertyId: property.id },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "property.promote",
        entityType: "property",
        entityId: property.id,
        metadataJson: { rawPropertyRecordId: rawRecord.id },
      },
    });

    return property;
  }
}

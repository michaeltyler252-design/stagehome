import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

// The set of counties explicitly approved to publish, by slug. This
// replaced a numeric "rolloutPhase <= N" threshold on 2026-07-27, when the
// master county list was expanded to all 47 Kenyan counties in a specific
// operator-defined order (see packages/database/src/seed/rollout-counties.ts).
// That reorder moved Nakuru from position 3 to position 11 in the list —
// not contiguous with Nairobi (1) and Kiambu (2) anymore. A numeric
// threshold would have forced an impossible choice: either silently
// *un-approve* Nakuru (setting the threshold to 2) or silently *approve*
// eight counties that were never actually decided on (setting it to 11,
// which would also cover Embu/Meru/Tharaka-Nithi/Nyeri/Kirinyaga/Murang'a/
// Nyandarua/Laikipia at positions 3–10). An explicit set has no such
// failure mode: reordering or expanding the master county list never
// changes what's actually approved. Advancing this set is still a
// deliberate code change requiring explicit approval per county, one at a
// time — matching Part B rule 12 — exactly as the numeric threshold did.
export const APPROVED_COUNTY_SLUGS: string[] = ["nairobi-city", "kiambu", "nakuru"];

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async listReviewQueue() {
    return this.prisma.property.findMany({
      where: { publicationStatus: "REVIEW" },
      include: { county: true, organisation: true },
      orderBy: { updatedAt: "asc" },
    });
  }

  async approve(propertyId: string, adminUserId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException("Property not found.");
    }
    if (property.publicationStatus !== "REVIEW") {
      throw new BadRequestException(
        `Cannot approve a property in status "${property.publicationStatus}"; it must be in REVIEW.`
      );
    }
    if (property.conflictStatus === "FLAGGED") {
      throw new BadRequestException(
        "This property has an unresolved data conflict and cannot be approved until it is resolved (see docs/data-quality/duplicate-conflict-detection-design.md)."
      );
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        publicationStatus: "APPROVED",
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
      },
    });

    await this.prisma.verificationEvent.create({
      data: {
        entityType: "property",
        entityId: propertyId,
        previousStatus: property.verificationStatus,
        newStatus: "VERIFIED",
        method: "documentary",
        performedBy: adminUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "property.approve",
        entityType: "property",
        entityId: propertyId,
      },
    });

    return updated;
  }

  async publish(propertyId: string, adminUserId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { county: true },
    });
    if (!property) {
      throw new NotFoundException("Property not found.");
    }
    if (property.publicationStatus !== "APPROVED") {
      throw new BadRequestException(
        `Cannot publish a property in status "${property.publicationStatus}"; it must be APPROVED first.`
      );
    }

    if (!APPROVED_COUNTY_SLUGS.includes(property.county.slug)) {
      throw new BadRequestException(
        `${property.county.name} has not been approved to launch yet (Part C). ` +
          `Currently approved counties: ${APPROVED_COUNTY_SLUGS.join(", ")}.`
      );
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: { publicationStatus: "PUBLISHED" },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "property.publish",
        entityType: "property",
        entityId: propertyId,
      },
    });

    return updated;
  }

  async reject(propertyId: string, adminUserId: string, reason: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException("Property not found.");
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        publicationStatus: "DRAFT",
        verificationStatus: "REJECTED",
        notes: reason,
      },
    });

    await this.prisma.verificationEvent.create({
      data: {
        entityType: "property",
        entityId: propertyId,
        previousStatus: property.verificationStatus,
        newStatus: "REJECTED",
        method: "documentary",
        performedBy: adminUserId,
        notes: reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "property.reject",
        entityType: "property",
        entityId: propertyId,
        metadataJson: { reason },
      },
    });

    return updated;
  }
}

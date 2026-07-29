import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { CreateUnitDto } from "./dto/create-unit.dto";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Confirms the current user may manage the given organisation's
   * properties: either they are an Admin, or they are a member of that
   * organisation. Managers can never see or edit another organisation's
   * inventory (Part K: manager dashboards are scoped to their own
   * organisation).
   */
  private async assertCanManageOrganisation(
    user: AuthenticatedUser,
    organisationId: string
  ): Promise<void> {
    if (user.roles.includes("Admin")) {
      return;
    }
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId: user.userId } },
    });
    if (!membership) {
      throw new ForbiddenException("You do not have access to this organisation's properties.");
    }
  }

  private async getOrganisationIdForProperty(propertyId: string): Promise<string> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { organisationId: true },
    });
    if (!property) {
      throw new NotFoundException("Property not found.");
    }
    return property.organisationId;
  }

  async create(user: AuthenticatedUser, organisationId: string, dto: CreatePropertyDto) {
    await this.assertCanManageOrganisation(user, organisationId);

    const slugBase = slugify(dto.title);
    const publicReference = `SH-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Ensure slug uniqueness by appending a short suffix on collision rather
    // than failing the create outright.
    let slug = slugBase;
    const existing = await this.prisma.property.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
    }

    return this.prisma.property.create({
      data: {
        organisationId,
        countyId: dto.countyId,
        townId: dto.townId,
        estateId: dto.estateId,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        publicReference,
        description: dto.description,
        address: dto.address,
        privateLat: dto.privateLat,
        privateLng: dto.privateLng,
        // Every manager-created listing starts exactly where a
        // source-supplied one does: unverified and unpublished, per Part I's
        // listing verification workflow.
        sourceStatus: "MANAGER_SUPPLIED",
        verificationStatus: "UNVERIFIED",
        publicationStatus: "DRAFT",
      },
    });
  }

  async listForOrganisation(user: AuthenticatedUser, organisationId: string) {
    await this.assertCanManageOrganisation(user, organisationId);
    return this.prisma.property.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
      include: { units: true, county: true, town: true, estate: true },
    });
  }

  async getOne(user: AuthenticatedUser, propertyId: string) {
    const organisationId = await this.getOrganisationIdForProperty(propertyId);
    await this.assertCanManageOrganisation(user, organisationId);
    return this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        units: true,
        media: true,
        propertyAmenities: { include: { amenity: true } },
        propertyUtilities: { include: { utility: true } },
        county: true,
        town: true,
        estate: true,
      },
    });
  }

  async update(user: AuthenticatedUser, propertyId: string, dto: UpdatePropertyDto) {
    const organisationId = await this.getOrganisationIdForProperty(propertyId);
    await this.assertCanManageOrganisation(user, organisationId);

    // Part K: "Prevent managers from retrospectively changing confirmed
    // booking prices or policy snapshots." Property-level edits are fine;
    // pricing changes after a booking is confirmed are enforced at the
    // booking/pricing-rule layer (Milestone 7), not blocked here.
    return this.prisma.property.update({
      where: { id: propertyId },
      data: {
        title: dto.title,
        countyId: dto.countyId,
        townId: dto.townId,
        estateId: dto.estateId,
        categoryId: dto.categoryId,
        description: dto.description,
        address: dto.address,
        privateLat: dto.privateLat,
        privateLng: dto.privateLng,
      },
    });
  }

  async submitForVerification(user: AuthenticatedUser, propertyId: string) {
    const organisationId = await this.getOrganisationIdForProperty(propertyId);
    await this.assertCanManageOrganisation(user, organisationId);

    return this.prisma.property.update({
      where: { id: propertyId },
      data: { publicationStatus: "REVIEW" },
    });
  }

  async addUnit(user: AuthenticatedUser, propertyId: string, dto: CreateUnitDto) {
    const organisationId = await this.getOrganisationIdForProperty(propertyId);
    await this.assertCanManageOrganisation(user, organisationId);

    return this.prisma.unit.create({
      data: {
        propertyId,
        categoryId: dto.categoryId,
        publicLabel: dto.publicLabel,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        furnished: dto.furnished,
        sourceStatus: "MANAGER_SUPPLIED",
        verificationStatus: "UNVERIFIED",
        publicationStatus: "DRAFT",
      },
    });
  }
}

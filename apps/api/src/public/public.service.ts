import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SearchPropertiesDto } from "./dto/search-properties.dto";
import { SearchService } from "../search/search.service";

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService
  ) {}

  /**
   * A county belongs on the public site only once it actually has
   * something verified to show: a PUBLISHED property, or a VERIFIED
   * university. This replaced a hard-coded COUNTIES_WITH_DATA slug array —
   * that list had to be edited by hand every time a county's data cleared
   * verification, which is exactly the "requires a code change" failure
   * the brief asked to eliminate. Querying live status means a county
   * appears or disappears the moment its underlying data does, with no
   * deploy required.
   */
  private async listCountyIdsWithVerifiedData(): Promise<string[]> {
    const [publishedProperties, verifiedUniversities] = await Promise.all([
      this.prisma.property.findMany({
        where: { publicationStatus: "PUBLISHED" },
        select: { countyId: true },
        distinct: ["countyId"],
      }),
      this.prisma.university.findMany({
        where: { verificationStatus: "VERIFIED" },
        select: { countyId: true },
        distinct: ["countyId"],
      }),
    ]);

    return Array.from(
      new Set([
        ...publishedProperties.map((p: { countyId: string }) => p.countyId),
        ...verifiedUniversities.map((u: { countyId: string }) => u.countyId),
      ])
    );
  }

  async listCounties() {
    const countyIds = await this.listCountyIdsWithVerifiedData();
    if (countyIds.length === 0) {
      return [];
    }
    return this.prisma.county.findMany({
      where: { id: { in: countyIds } },
      orderBy: { rolloutPhase: "asc" },
      select: { id: true, name: true, slug: true, rolloutPhase: true },
    });
  }

  async getCountyBySlug(slug: string) {
    const county = await this.prisma.county.findUnique({ where: { slug } });
    if (!county) {
      throw new NotFoundException("County not found.");
    }

    const [publishedPropertyCount, verifiedUniversityCount] = await Promise.all([
      this.prisma.property.count({
        where: { countyId: county.id, publicationStatus: "PUBLISHED" },
      }),
      this.prisma.university.count({
        where: { countyId: county.id, verificationStatus: "VERIFIED" },
      }),
    ]);

    // Same rule as listCounties(): a county with nothing verified yet isn't
    // part of the public site, even navigated to directly by URL.
    if (publishedPropertyCount === 0 && verifiedUniversityCount === 0) {
      throw new NotFoundException("County not found.");
    }

    return { ...county, publishedPropertyCount, verifiedUniversityCount };
  }

  async listUniversities(countySlug?: string) {
    return this.prisma.university.findMany({
      where: {
        // The public /universities page tells students "Institution pages
        // are added once [a] university is confirmed against the
        // Commission for University Education register" — so the only
        // status that belongs here is VERIFIED. PENDING (promoted from
        // staging but not yet confirmed) and REJECTED must stay hidden;
        // showing them would make that copy untrue (Part L: "do not index
        // empty or automatically generated thin pages").
        verificationStatus: "VERIFIED",
        ...(countySlug ? { county: { slug: countySlug } } : {}),
      },
      orderBy: { officialName: "asc" },
      select: { officialName: true, slug: true, verificationStatus: true },
    });
  }

  async getUniversityBySlug(slug: string) {
    const university = await this.prisma.university.findUnique({
      where: { slug },
      include: { campuses: true, county: true },
    });
    // Same rule as listUniversities(): an unconfirmed university isn't part
    // of the public site yet, even if someone navigates to its URL directly
    // (mirrors the existing getCountyBySlug guard above).
    if (!university || university.verificationStatus !== "VERIFIED") {
      throw new NotFoundException("University not found.");
    }
    return university;
  }

  async searchProperties(query: SearchPropertiesDto) {
    return this.searchService.search(query);
  }

  async getPropertyBySlug(slug: string) {
    const property = await this.prisma.property.findFirst({
      where: { slug, publicationStatus: "PUBLISHED" },
      include: {
        county: true,
        town: true,
        estate: true,
        category: true,
        units: true,
        media: true,
        floorPlans: true,
        propertyAmenities: { include: { amenity: true } },
        propertyUtilities: { include: { utility: true } },
        propertyCampuses: { include: { university: true, campus: true } },
        pricingRules: true,
        deposits: true,
        fees: true,
        houseRules: true,
        verificationBadges: true,
        reviews: { include: { categories: true } },
      },
    });

    if (!property) {
      throw new NotFoundException(
        "Property not found or not yet published. Every listing stays private until it passes verification (Part B, rule 8)."
      );
    }

    return property;
  }
}

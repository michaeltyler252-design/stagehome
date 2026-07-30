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
   * Returns every county with its live published-property and
   * verified-university counts, so the frontend can show a real "No
   * listings available yet" state for counties without live data yet,
   * rather than hiding them from the page entirely. (Previously this
   * endpoint only returned counties that already had verified data — see
   * git history for that rationale — but product direction is now to list
   * every county so people can see the full rollout picture.)
   */
  async listCounties() {
    const counties = await this.prisma.county.findMany({
      orderBy: { rolloutPhase: "asc" },
      select: { id: true, name: true, slug: true, rolloutPhase: true },
    });

    const [publishedProperties, verifiedUniversities] = await Promise.all([
      this.prisma.property.findMany({
        where: { publicationStatus: "PUBLISHED" },
        select: { countyId: true },
      }),
      this.prisma.university.findMany({
        where: { verificationStatus: "VERIFIED" },
        select: { countyId: true },
      }),
    ]);

    const propertyCountByCounty = new Map<string, number>();
    for (const p of publishedProperties as { countyId: string }[]) {
      propertyCountByCounty.set(p.countyId, (propertyCountByCounty.get(p.countyId) ?? 0) + 1);
    }
    const universityCountByCounty = new Map<string, number>();
    for (const u of verifiedUniversities as { countyId: string }[]) {
      universityCountByCounty.set(u.countyId, (universityCountByCounty.get(u.countyId) ?? 0) + 1);
    }

    return counties.map((county: { id: string; name: string; slug: string; rolloutPhase: number | null }) => ({
      ...county,
      publishedPropertyCount: propertyCountByCounty.get(county.id) ?? 0,
      verifiedUniversityCount: universityCountByCounty.get(county.id) ?? 0,
    }));
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

    // Every county page is now reachable directly — a county with nothing
    // verified yet just shows an honest "no listings yet" state instead of
    // a 404.
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

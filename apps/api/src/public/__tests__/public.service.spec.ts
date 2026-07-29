import { NotFoundException } from "@nestjs/common";
import { PublicService } from "../public.service";
import { SearchService } from "../../search/search.service";

function buildPrismaMock() {
  return {
    county: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    university: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    property: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
}

describe("PublicService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PublicService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PublicService(prisma as any, new SearchService(prisma as any));
  });

  describe("searchProperties", () => {
    it("always scopes the query to publicationStatus PUBLISHED, even with no filters supplied", async () => {
      await service.searchProperties({});

      const whereArg = prisma.property.findMany.mock.calls[0][0].where;
      expect(whereArg.publicationStatus).toBe("PUBLISHED");

      const countWhereArg = prisma.property.count.mock.calls[0][0].where;
      expect(countWhereArg.publicationStatus).toBe("PUBLISHED");
    });

    it("returns an empty result set gracefully when nothing is published yet (current Nairobi state)", async () => {
      prisma.property.findMany.mockResolvedValue([]);
      prisma.property.count.mockResolvedValue(0);

      const result = await service.searchProperties({});

      expect(result.results).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("applies county, category, university, keyword, and rent filters on top of the PUBLISHED scope", async () => {
      await service.searchProperties({
        countySlug: "nairobi-city",
        categoryKey: "studio",
        universitySlug: "kenyatta-university",
        keyword: "Kilimani",
        minRent: 10000,
        maxRent: 30000,
        page: 2,
        limit: 10,
      });

      const whereArg = prisma.property.findMany.mock.calls[0][0].where;
      expect(whereArg.publicationStatus).toBe("PUBLISHED");
      expect(whereArg.county).toEqual({ slug: "nairobi-city" });
      expect(whereArg.category).toEqual({ key: "studio" });
      expect(whereArg.propertyCampuses.some.university.slug).toBe("kenyatta-university");
      expect(whereArg.title.contains).toBe("Kilimani");

      const callArgs = prisma.property.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(10); // (page 2 - 1) * limit 10
      expect(callArgs.take).toBe(10);
    });
  });

  describe("getPropertyBySlug", () => {
    it("throws NotFoundException for a property that exists but is not PUBLISHED", async () => {
      // Simulates the Prisma query itself filtering it out (findFirst with
      // publicationStatus: PUBLISHED in the where clause returns null).
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(service.getPropertyBySlug("some-draft-property")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("scopes the findFirst query to publicationStatus PUBLISHED", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", slug: "test-property" });

      await service.getPropertyBySlug("test-property");

      const whereArg = prisma.property.findFirst.mock.calls[0][0].where;
      expect(whereArg.publicationStatus).toBe("PUBLISHED");
      expect(whereArg.slug).toBe("test-property");
    });

    it("returns the property when it is genuinely PUBLISHED", async () => {
      prisma.property.findFirst.mockResolvedValue({
        id: "p1",
        slug: "test-property",
        publicationStatus: "PUBLISHED",
      });

      const result = await service.getPropertyBySlug("test-property");
      expect(result.slug).toBe("test-property");
    });
  });

  describe("listCounties", () => {
    it("derives visible counties from published properties and verified universities, not a static list", async () => {
      prisma.property.findMany.mockResolvedValue([{ countyId: "county-nairobi" }]);
      prisma.university.findMany.mockResolvedValue([{ countyId: "county-embu" }]);
      prisma.county.findMany.mockResolvedValue([
        { id: "county-nairobi", name: "Nairobi City", slug: "nairobi-city", rolloutPhase: 1 },
        { id: "county-embu", name: "Embu", slug: "embu", rolloutPhase: 3 },
      ]);

      await service.listCounties();

      expect(prisma.property.findMany).toHaveBeenCalledWith({
        where: { publicationStatus: "PUBLISHED" },
        select: { countyId: true },
        distinct: ["countyId"],
      });
      expect(prisma.university.findMany).toHaveBeenCalledWith({
        where: { verificationStatus: "VERIFIED" },
        select: { countyId: true },
        distinct: ["countyId"],
      });
      const whereArg = prisma.county.findMany.mock.calls[0][0].where;
      expect(whereArg.id.in).toEqual(expect.arrayContaining(["county-nairobi", "county-embu"]));
    });

    it("never queries counties at all when nothing is published or verified anywhere yet", async () => {
      prisma.property.findMany.mockResolvedValue([]);
      prisma.university.findMany.mockResolvedValue([]);

      const result = await service.listCounties();

      expect(result).toEqual([]);
      expect(prisma.county.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getCountyBySlug", () => {
    it("throws NotFoundException for an unknown county slug", async () => {
      prisma.county.findUnique.mockResolvedValue(null);
      await expect(service.getCountyBySlug("nonexistent-county")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("throws NotFoundException for a real, seeded county that has zero published properties and zero verified universities (e.g. Narok)", async () => {
      prisma.county.findUnique.mockResolvedValue({ id: "county-narok", name: "Narok", slug: "narok" });
      prisma.property.count.mockResolvedValue(0);
      prisma.university.count.mockResolvedValue(0);

      await expect(service.getCountyBySlug("narok")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("reports published-property and verified-university counts scoped correctly", async () => {
      prisma.county.findUnique.mockResolvedValue({ id: "c1", name: "Nairobi City", slug: "nairobi-city" });
      prisma.property.count.mockResolvedValue(3);
      prisma.university.count.mockResolvedValue(2);

      const result = await service.getCountyBySlug("nairobi-city");

      const propertyCountWhere = prisma.property.count.mock.calls[0][0].where;
      expect(propertyCountWhere.publicationStatus).toBe("PUBLISHED");
      const universityCountWhere = prisma.university.count.mock.calls[0][0].where;
      expect(universityCountWhere.verificationStatus).toBe("VERIFIED");
      expect(result.publishedPropertyCount).toBe(3);
      expect(result.verifiedUniversityCount).toBe(2);
    });

    it("is visible on a verified-university-only county with zero published properties", async () => {
      prisma.county.findUnique.mockResolvedValue({ id: "c2", name: "Embu", slug: "embu" });
      prisma.property.count.mockResolvedValue(0);
      prisma.university.count.mockResolvedValue(1);

      const result = await service.getCountyBySlug("embu");
      expect(result.verifiedUniversityCount).toBe(1);
    });
  });
});

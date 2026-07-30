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
    it("returns every seeded county, each annotated with its real published-property and verified-university counts", async () => {
      prisma.county.findMany.mockResolvedValue([
        { id: "county-nairobi", name: "Nairobi City", slug: "nairobi-city", rolloutPhase: 1 },
        { id: "county-embu", name: "Embu", slug: "embu", rolloutPhase: 3 },
        { id: "county-narok", name: "Narok", slug: "narok", rolloutPhase: 12 },
      ]);
      prisma.property.findMany.mockResolvedValue([{ countyId: "county-nairobi" }]);
      prisma.university.findMany.mockResolvedValue([{ countyId: "county-embu" }]);

      const result = await service.listCounties();

      expect(result).toHaveLength(3);
      expect(result.find((c: any) => c.slug === "nairobi-city")).toMatchObject({
        publishedPropertyCount: 1,
        verifiedUniversityCount: 0,
      });
      expect(result.find((c: any) => c.slug === "embu")).toMatchObject({
        publishedPropertyCount: 0,
        verifiedUniversityCount: 1,
      });
      // Narok has neither — it must still appear, not be hidden, with
      // honest zero counts so the frontend can show "no listings yet".
      expect(result.find((c: any) => c.slug === "narok")).toMatchObject({
        publishedPropertyCount: 0,
        verifiedUniversityCount: 0,
      });
    });

    it("still returns all counties (with zero counts) when nothing is published or verified anywhere yet", async () => {
      prisma.county.findMany.mockResolvedValue([
        { id: "county-nairobi", name: "Nairobi City", slug: "nairobi-city", rolloutPhase: 1 },
      ]);
      prisma.property.findMany.mockResolvedValue([]);
      prisma.university.findMany.mockResolvedValue([]);

      const result = await service.listCounties();

      expect(result).toEqual([
        {
          id: "county-nairobi",
          name: "Nairobi City",
          slug: "nairobi-city",
          rolloutPhase: 1,
          publishedPropertyCount: 0,
          verifiedUniversityCount: 0,
        },
      ]);
    });
  });

  describe("getCountyBySlug", () => {
    it("throws NotFoundException for an unknown county slug", async () => {
      prisma.county.findUnique.mockResolvedValue(null);
      await expect(service.getCountyBySlug("nonexistent-county")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("returns a real, seeded county with zero counts rather than 404ing, when it has no published properties or verified universities yet (e.g. Narok)", async () => {
      prisma.county.findUnique.mockResolvedValue({ id: "county-narok", name: "Narok", slug: "narok" });
      prisma.property.count.mockResolvedValue(0);
      prisma.university.count.mockResolvedValue(0);

      const result = await service.getCountyBySlug("narok");
      expect(result.publishedPropertyCount).toBe(0);
      expect(result.verifiedUniversityCount).toBe(0);
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

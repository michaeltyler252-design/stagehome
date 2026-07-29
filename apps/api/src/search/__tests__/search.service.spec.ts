import { SearchService } from "../search.service";

function buildPrismaMock() {
  return {
    property: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

describe("SearchService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: SearchService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new SearchService(prisma as any);
  });

  describe("buildWhereClause", () => {
    it("always scopes to PUBLISHED", () => {
      expect(service.buildWhereClause({}).publicationStatus).toBe("PUBLISHED");
    });

    it("adds a map-bounds filter only when all four corners are supplied", () => {
      const partial = service.buildWhereClause({ swLat: -1.3 });
      expect(partial.publicLat).toBeUndefined();

      const full = service.buildWhereClause({ swLat: -1.3, swLng: 36.7, neLat: -1.2, neLng: 36.9 });
      expect(full.publicLat).toEqual({ gte: -1.3, lte: -1.2 });
      expect(full.publicLng).toEqual({ gte: 36.7, lte: 36.9 });
    });

    it("applies maxWalkingMinutes only alongside a universitySlug filter", () => {
      const where = service.buildWhereClause({
        universitySlug: "kenyatta-university",
        maxWalkingMinutes: 15,
      }) as any;
      expect(where.propertyCampuses.some.university.slug).toBe("kenyatta-university");
      expect(where.propertyCampuses.some.walkingMinutes).toEqual({ lte: 15 });
    });
  });

  describe("buildOrderBy", () => {
    it("orders by createdAt desc for newest/recommended/undefined", () => {
      expect(service.buildOrderBy("newest")).toEqual({ createdAt: "desc" });
      expect(service.buildOrderBy("recommended")).toEqual({ createdAt: "desc" });
      expect(service.buildOrderBy(undefined)).toEqual({ createdAt: "desc" });
    });

    it("orders by review count desc for most_reviewed", () => {
      expect(service.buildOrderBy("most_reviewed")).toEqual({ reviews: { _count: "desc" } });
    });

    it("returns undefined for sorts that require in-memory handling", () => {
      expect(service.buildOrderBy("lowest_rent")).toBeUndefined();
      expect(service.buildOrderBy("highest_rent")).toBeUndefined();
      expect(service.buildOrderBy("highest_verified_rating")).toBeUndefined();
      expect(service.buildOrderBy("available_soonest")).toBeUndefined();
      expect(service.buildOrderBy("nearest")).toBeUndefined();
    });
  });

  describe("applyInMemorySort", () => {
    const properties = [
      { id: "a", pricingRules: [{ rentAmountMin: "30000" }], reviews: [{ overallRating: "3.0" }] },
      { id: "b", pricingRules: [{ rentAmountMin: "15000" }], reviews: [{ overallRating: "4.8" }] },
      { id: "c", pricingRules: [{ rentAmountMin: "20000" }], reviews: [] },
    ];

    it("sorts by lowest rent ascending", () => {
      const sorted = service.applyInMemorySort(properties as any, "lowest_rent");
      expect(sorted.map((p) => p.id)).toEqual(["b", "c", "a"]);
    });

    it("sorts by highest rent descending", () => {
      const sorted = service.applyInMemorySort(properties as any, "highest_rent");
      expect(sorted.map((p) => p.id)).toEqual(["a", "c", "b"]);
    });

    it("sorts by highest verified rating, treating no reviews as lowest", () => {
      const sorted = service.applyInMemorySort(properties as any, "highest_verified_rating");
      expect(sorted.map((p) => p.id)).toEqual(["b", "a", "c"]);
    });

    it("does not mutate the input array", () => {
      const original = [...properties];
      service.applyInMemorySort(properties as any, "lowest_rent");
      expect(properties).toEqual(original);
    });
  });

  describe("search", () => {
    it("issues a PostGIS ST_DWithin raw query when lat/lng/radiusKm are supplied", async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: "p1", distance_km: 0.4 }]);
      prisma.property.findMany.mockResolvedValue([{ id: "p1" }]);

      await service.search({ lat: -1.29, lng: 36.82, radiusKm: 2 });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const whereArg = prisma.property.findMany.mock.calls[0][0].where;
      expect(whereArg.id).toEqual({ in: ["p1"] });
    });

    it("returns an empty page without error when nothing is within the radius", async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.property.findMany.mockResolvedValue([]);
      prisma.property.count.mockResolvedValue(0);

      const result = await service.search({ lat: -1.29, lng: 36.82, radiusKm: 2 });
      expect(result.results).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("paginates correctly at the database level for a DB-sortable sort", async () => {
      await service.search({ sort: "newest", page: 2, limit: 5 });
      const callArgs = prisma.property.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(5);
      expect(callArgs.take).toBe(5);
    });

    it("paginates in memory (post-fetch) for a sort requiring it, fetching the full set first", async () => {
      prisma.property.findMany.mockResolvedValue([
        { id: "a", pricingRules: [{ rentAmountMin: "30000" }] },
        { id: "b", pricingRules: [{ rentAmountMin: "15000" }] },
      ]);

      const result = await service.search({ sort: "lowest_rent", page: 1, limit: 1 });

      const callArgs = prisma.property.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBeUndefined();
      expect(callArgs.take).toBeUndefined();
      expect(result.results).toHaveLength(1);
      expect((result.results[0] as any).id).toBe("b"); // lowest rent first
    });
  });
});

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SearchPropertiesDto } from "../public/dto/search-properties.dto";

interface RadiusRow {
  id: string;
  distance_km: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Uses PostGIS (already enabled as a database extension in the schema) to
   * find property ids within `radiusKm` of the given point, computed against
   * the privacy-safe `publicLat`/`publicLng` columns — never the exact
   * private coordinates (Part G: "privacy-safe public map location" is what
   * search and map display use; `privateLat`/`privateLng` never leave the
   * manager/admin dashboards).
   *
   * Returns rows ordered nearest-first so "nearest" sorting can reuse the
   * same query without a second round trip.
   */
  private async findWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<RadiusRow[]> {
    return this.prisma.$queryRaw<RadiusRow[]>`
      SELECT
        "id",
        ST_Distance(
          ST_MakePoint("publicLng", "publicLat")::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) / 1000 AS distance_km
      FROM "properties"
      WHERE "publicationStatus" = 'PUBLISHED'
        AND "publicLat" IS NOT NULL
        AND "publicLng" IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint("publicLng", "publicLat")::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusKm * 1000}
        )
      ORDER BY distance_km ASC
    `;
  }

  buildWhereClause(query: SearchPropertiesDto): Record<string, unknown> {
    const where: Record<string, unknown> = {
      publicationStatus: "PUBLISHED",
    };

    if (query.countySlug) {
      where.county = { slug: query.countySlug };
    }
    if (query.categoryKey) {
      where.category = { key: query.categoryKey };
    }
    if (query.universitySlug) {
      where.propertyCampuses = {
        some: {
          university: { slug: query.universitySlug },
          ...(query.maxWalkingMinutes !== undefined
            ? { walkingMinutes: { lte: query.maxWalkingMinutes } }
            : {}),
        },
      };
    }
    if (query.keyword) {
      where.title = { contains: query.keyword, mode: "insensitive" };
    }
    if (query.minRent !== undefined || query.maxRent !== undefined) {
      where.pricingRules = {
        some: {
          ...(query.minRent !== undefined ? { rentAmountMax: { gte: query.minRent } } : {}),
          ...(query.maxRent !== undefined ? { rentAmountMin: { lte: query.maxRent } } : {}),
        },
      };
    }

    // Part H: "map bounds" — a simple lat/lng bounding box on the
    // privacy-safe public coordinates.
    if (
      query.swLat !== undefined &&
      query.swLng !== undefined &&
      query.neLat !== undefined &&
      query.neLng !== undefined
    ) {
      where.publicLat = { gte: query.swLat, lte: query.neLat };
      where.publicLng = { gte: query.swLng, lte: query.neLng };
    }

    return where;
  }

  /**
   * Sorts that Prisma can express directly against the database. Sorts that
   * need a related table's aggregate value it can't order by natively
   * (lowest/highest rent, highest verified rating, available soonest) are
   * applied afterwards in `applyInMemorySort`, on the current page only.
   *
   * KNOWN LIMITATION (documented rather than hidden): the in-memory sorts
   * below are correct within a single page but not globally correct across
   * pages until Milestone 2's `pricing_rules`/`reviews`/`availability_periods`
   * data is either indexed or denormalised onto `properties` with a computed
   * column. At today's data volume (zero published properties) this has no
   * observable effect; it should be revisited before Nairobi's inventory
   * grows past a page or two of results.
   */
  buildOrderBy(sort?: string): Record<string, unknown> | undefined {
    switch (sort) {
      case "newest":
      case "recommended":
      case undefined:
        return { createdAt: "desc" };
      case "most_reviewed":
        return { reviews: { _count: "desc" } };
      default:
        return undefined; // handled in-memory
    }
  }

  applyInMemorySort<T extends { id: string; pricingRules?: any[]; reviews?: any[]; availabilityPeriods?: any[] }>(
    results: T[],
    sort?: string
  ): T[] {
    switch (sort) {
      case "lowest_rent":
        return [...results].sort(
          (a, b) => Number(a.pricingRules?.[0]?.rentAmountMin ?? Infinity) -
            Number(b.pricingRules?.[0]?.rentAmountMin ?? Infinity)
        );
      case "highest_rent":
        return [...results].sort(
          (a, b) => Number(b.pricingRules?.[0]?.rentAmountMin ?? 0) -
            Number(a.pricingRules?.[0]?.rentAmountMin ?? 0)
        );
      case "highest_verified_rating": {
        const avg = (p: T) => {
          const ratings = (p.reviews ?? []).map((r: any) => Number(r.overallRating));
          return ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : -1;
        };
        return [...results].sort((a, b) => avg(b) - avg(a));
      }
      case "available_soonest":
        return [...results].sort((a, b) => {
          const aDate = a.availabilityPeriods?.[0]?.availableFrom;
          const bDate = b.availabilityPeriods?.[0]?.availableFrom;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        });
      default:
        return results;
    }
  }

  async search(query: SearchPropertiesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhereClause(query);

    let radiusDistanceById: Map<string, number> | null = null;
    if (query.lat !== undefined && query.lng !== undefined && query.radiusKm !== undefined) {
      const radiusRows = await this.findWithinRadius(query.lat, query.lng, query.radiusKm);
      radiusDistanceById = new Map(radiusRows.map((row) => [row.id, row.distance_km]));
      where.id = { in: radiusRows.map((row) => row.id) };
    }

    // "nearest" and the in-memory sorts need the full matching set fetched
    // before slicing to a page; every other sort can be paginated by the
    // database directly, even when a radius filter narrowed `where` above.
    const needsFullSetSort = query.sort === "nearest" || (Boolean(query.sort) && !this.buildOrderBy(query.sort));
    const dbOrderBy = needsFullSetSort ? undefined : this.buildOrderBy(query.sort);

    const [rawResults, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip: needsFullSetSort ? undefined : (page - 1) * limit,
        take: needsFullSetSort ? undefined : limit,
        orderBy: dbOrderBy ?? { createdAt: "desc" },
        include: {
          county: true,
          estate: true,
          category: true,
          media: { take: 1 },
          pricingRules: true,
          reviews: true,
          availabilityPeriods: true,
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    let results = rawResults;

    if (query.sort === "nearest" && radiusDistanceById) {
      results = [...results].sort(
        (a, b) => (radiusDistanceById!.get(a.id) ?? Infinity) - (radiusDistanceById!.get(b.id) ?? Infinity)
      );
    } else if (needsFullSetSort) {
      results = this.applyInMemorySort(results, query.sort);
    }

    if (needsFullSetSort) {
      results = results.slice((page - 1) * limit, page * limit);
    }

    return {
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

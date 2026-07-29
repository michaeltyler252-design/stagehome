import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PropertyPromotionService } from "../property-promotion.service";

function buildPrismaMock() {
  return {
    rawPropertyRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    county: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    organisation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    sourceRecord: {
      create: jest.fn().mockResolvedValue({ id: "source-1" }),
    },
    verificationEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

describe("PropertyPromotionService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PropertyPromotionService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PropertyPromotionService(prisma as any);
  });

  describe("promote", () => {
    it("throws when the raw record does not exist", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue(null);
      await expect(service.promote("missing", "admin-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to re-promote a record that already has a promotedPropertyId", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedPropertyId: "p1",
      });
      await expect(service.promote("r1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws if the batch's county can't be resolved and no override is given", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedPropertyId: null,
        propertyName: "Test Apartments",
        rawText: "raw text",
        sourceFile: "source.txt",
        conflictStatus: "NONE",
        batch: { county: "Nonexistent County", batchKey: "batch-1" },
      });
      prisma.county.findFirst.mockResolvedValue(null);
      await expect(service.promote("r1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("resolves Nairobi's staging county alias to Nairobi City", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedPropertyId: null,
        propertyName: "Kilimani Heights",
        rawText: "raw text",
        sourceFile: "nairobi.txt",
        conflictStatus: "NONE",
        batch: { county: "Nairobi", batchKey: "nairobi-batch" },
      });
      prisma.county.findFirst.mockResolvedValue({ id: "county-nairobi", name: "Nairobi City" });
      prisma.organisation.findFirst.mockResolvedValue({ id: "org-1" });
      prisma.property.findUnique.mockResolvedValue(null);
      prisma.property.create.mockResolvedValue({ id: "property-1", slug: "kilimani-heights" });

      await service.promote("r1", "admin-1");

      expect(prisma.county.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: "Nairobi City", mode: "insensitive" } },
      });
    });

    it("reuses an existing 'StageHome Verified Sources' organisation instead of creating a duplicate", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedPropertyId: null,
        propertyName: "Egerton View",
        rawText: "raw text",
        sourceFile: "nakuru.txt",
        conflictStatus: "NONE",
        batch: { county: "Nakuru", batchKey: "nakuru-batch" },
      });
      prisma.county.findFirst.mockResolvedValue({ id: "county-nakuru", name: "Nakuru" });
      prisma.organisation.findFirst.mockResolvedValue({ id: "existing-org" });
      prisma.property.findUnique.mockResolvedValue(null);
      prisma.property.create.mockResolvedValue({ id: "property-2" });

      await service.promote("r1", "admin-1");

      expect(prisma.organisation.create).not.toHaveBeenCalled();
      const createArgs = prisma.property.create.mock.calls[0][0];
      expect(createArgs.data.organisationId).toBe("existing-org");
    });

    it("creates the property at REVIEW/PENDING/SOURCE_SUPPLIED, never APPROVED or PUBLISHED", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedPropertyId: null,
        propertyName: "Kisumu Boulevard",
        rawText: "the full verbatim source text",
        sourceFile: "kisumu.txt",
        conflictStatus: "NONE",
        batch: { county: "Kisumu", batchKey: "kisumu-batch" },
      });
      prisma.county.findFirst.mockResolvedValue({ id: "county-kisumu", name: "Kisumu" });
      prisma.organisation.findFirst.mockResolvedValue(null);
      prisma.organisation.create.mockResolvedValue({ id: "new-org" });
      prisma.property.findUnique.mockResolvedValue(null);
      prisma.property.create.mockResolvedValue({ id: "property-3" });

      await service.promote("r1", "admin-1");

      const createArgs = prisma.property.create.mock.calls[0][0];
      expect(createArgs.data.publicationStatus).toBe("REVIEW");
      expect(createArgs.data.verificationStatus).toBe("PENDING");
      expect(createArgs.data.sourceStatus).toBe("SOURCE_SUPPLIED");
      expect(createArgs.data.countyId).toBe("county-kisumu");
      expect(createArgs.data.description).toBe("the full verbatim source text");

      expect(prisma.rawPropertyRecord.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { promotedPropertyId: "property-3" },
      });
    });

    it("de-duplicates the slug on collision instead of failing", async () => {
      prisma.rawPropertyRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedPropertyId: null,
        propertyName: "Boulevard Apartments",
        rawText: "raw text",
        sourceFile: "source.txt",
        conflictStatus: "NONE",
        batch: { county: "Kiambu", batchKey: "kiambu-batch" },
      });
      prisma.county.findFirst.mockResolvedValue({ id: "county-kiambu", name: "Kiambu" });
      prisma.organisation.findFirst.mockResolvedValue({ id: "org-1" });
      prisma.property.findUnique.mockResolvedValue({ id: "existing-property" }); // slug taken
      prisma.property.create.mockResolvedValue({ id: "property-4" });

      await service.promote("r1", "admin-1");

      const createArgs = prisma.property.create.mock.calls[0][0];
      expect(createArgs.data.slug).toMatch(/^boulevard-apartments-[a-f0-9]{6}$/);
    });
  });
});

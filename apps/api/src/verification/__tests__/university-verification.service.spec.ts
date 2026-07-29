import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UniversityVerificationService } from "../university-verification.service";

function buildPrismaMock() {
  return {
    rawUniversityRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    university: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    county: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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

describe("UniversityVerificationService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: UniversityVerificationService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new UniversityVerificationService(prisma as any);
  });

  describe("promote", () => {
    it("throws when the raw record does not exist", async () => {
      prisma.rawUniversityRecord.findUnique.mockResolvedValue(null);
      await expect(service.promote("missing", "admin-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to re-promote a record that already has a promotedUniversityId", async () => {
      prisma.rawUniversityRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedUniversityId: "u1",
      });
      await expect(service.promote("r1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("attaches to an existing university instead of creating a duplicate on an exact name match", async () => {
      prisma.rawUniversityRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedUniversityId: null,
        universityName: "Kenyatta University",
        sourceFile: "file.txt",
        rawExcerpt: null,
        batch: { batchKey: "nairobi-phase1-milestone2-audit", county: "Nairobi" },
      });
      prisma.university.findFirst.mockResolvedValue({ id: "existing-u1", officialName: "Kenyatta University" });

      const result = await service.promote("r1", "admin-1");

      expect(result).toEqual({ id: "existing-u1", officialName: "Kenyatta University" });
      expect(prisma.university.create).not.toHaveBeenCalled();
      expect(prisma.rawUniversityRecord.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { promotedUniversityId: "existing-u1" },
      });
    });

    it("creates a new PENDING university, resolving Nairobi's staging name to Nairobi City", async () => {
      prisma.rawUniversityRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedUniversityId: null,
        universityName: "Africa International University (AIU)",
        sourceFile: "file.txt",
        rawExcerpt: "raw excerpt text",
        batch: { batchKey: "nairobi-phase1-milestone2-audit", county: "Nairobi" },
      });
      prisma.university.findFirst.mockResolvedValue(null);
      prisma.county.findFirst.mockResolvedValue({ id: "county-nairobi", name: "Nairobi City", slug: "nairobi-city" });
      prisma.university.findUnique.mockResolvedValue(null); // slug is free
      prisma.university.create.mockResolvedValue({
        id: "new-u1",
        officialName: "Africa International University (AIU)",
        verificationStatus: "PENDING",
      });

      const result = await service.promote("r1", "admin-1");

      expect(prisma.county.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: "Nairobi City", mode: "insensitive" } },
      });
      expect(prisma.university.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            countyId: "county-nairobi",
            officialName: "Africa International University (AIU)",
            verificationStatus: "PENDING",
            publicationStatus: "DRAFT",
          }),
        })
      );
      expect(result.verificationStatus).toBe("PENDING");
      expect(prisma.rawUniversityRecord.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { promotedUniversityId: "new-u1" },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: "admin-1", action: "university.promote" }),
      });
    });

    it("throws a clear error when the county can't be auto-resolved and no override was given", async () => {
      prisma.rawUniversityRecord.findUnique.mockResolvedValue({
        id: "r1",
        promotedUniversityId: null,
        universityName: "Some University",
        sourceFile: "file.txt",
        rawExcerpt: null,
        batch: { batchKey: "mystery-county-batch", county: "Nonexistent County" },
      });
      prisma.university.findFirst.mockResolvedValue(null);
      prisma.county.findFirst.mockResolvedValue(null);

      await expect(service.promote("r1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.university.create).not.toHaveBeenCalled();
    });
  });

  describe("verify", () => {
    it("throws when the university does not exist", async () => {
      prisma.university.findUnique.mockResolvedValue(null);
      await expect(service.verify("missing", "admin-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to verify a university that isn't PENDING", async () => {
      prisma.university.findUnique.mockResolvedValue({ id: "u1", verificationStatus: "UNVERIFIED" });
      await expect(service.verify("u1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("verifies a PENDING university and logs the event", async () => {
      prisma.university.findUnique.mockResolvedValue({ id: "u1", verificationStatus: "PENDING" });
      prisma.university.update.mockResolvedValue({ id: "u1", verificationStatus: "VERIFIED" });

      const result = await service.verify("u1", "admin-1", { method: "documentary" });

      expect(result.verificationStatus).toBe("VERIFIED");
      expect(prisma.verificationEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: "university",
          entityId: "u1",
          previousStatus: "PENDING",
          newStatus: "VERIFIED",
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: "admin-1", action: "university.verify" }),
      });
    });
  });

  describe("reject", () => {
    it("refuses to reject a university that isn't PENDING", async () => {
      prisma.university.findUnique.mockResolvedValue({ id: "u1", verificationStatus: "VERIFIED" });
      await expect(service.reject("u1", "admin-1", "Name does not match any CUE-listed institution")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("rejects a PENDING university and records the reason", async () => {
      prisma.university.findUnique.mockResolvedValue({ id: "u1", verificationStatus: "PENDING" });
      prisma.university.update.mockResolvedValue({
        id: "u1",
        verificationStatus: "REJECTED",
        notes: "Name does not match any CUE-listed institution",
      });

      const result = await service.reject("u1", "admin-1", "Name does not match any CUE-listed institution");

      expect(result.verificationStatus).toBe("REJECTED");
      expect(prisma.verificationEvent.create).toHaveBeenCalledTimes(1);
    });
  });
});

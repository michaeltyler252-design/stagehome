import { BadRequestException, NotFoundException } from "@nestjs/common";
import { VerificationService, APPROVED_COUNTY_SLUGS } from "../verification.service";

function buildPrismaMock() {
  return {
    property: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    verificationEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

describe("VerificationService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: VerificationService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new VerificationService(prisma as any);
  });

  describe("approve", () => {
    it("throws when the property does not exist", async () => {
      prisma.property.findUnique.mockResolvedValue(null);
      await expect(service.approve("missing", "admin-1")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("refuses to approve a property not currently in REVIEW", async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        publicationStatus: "DRAFT",
        conflictStatus: "NONE",
        verificationStatus: "UNVERIFIED",
      });
      await expect(service.approve("p1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to approve a property with a flagged conflict (Station View Residency case)", async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        publicationStatus: "REVIEW",
        conflictStatus: "FLAGGED",
        verificationStatus: "UNVERIFIED",
      });
      await expect(service.approve("p1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("approves a clean REVIEW property and logs a verification event", async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        publicationStatus: "REVIEW",
        conflictStatus: "NONE",
        verificationStatus: "UNVERIFIED",
      });
      prisma.property.update.mockResolvedValue({ id: "p1", publicationStatus: "APPROVED" });

      const result = await service.approve("p1", "admin-1");

      expect(result.publicationStatus).toBe("APPROVED");
      expect(prisma.verificationEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: "admin-1", action: "property.approve" }),
      });
    });
  });

  describe("publish", () => {
    it("refuses to publish a property that isn't APPROVED yet", async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        publicationStatus: "REVIEW",
        county: { name: "Nairobi City", slug: "nairobi-city" },
      });
      await expect(service.publish("p1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("publishes an APPROVED property in every currently-approved county", async () => {
      for (const [slug, name] of [
        ["nairobi-city", "Nairobi City"],
        ["kiambu", "Kiambu"],
        ["nakuru", "Nakuru"],
      ] as const) {
        prisma.property.findUnique.mockResolvedValue({
          id: "p1",
          publicationStatus: "APPROVED",
          county: { name, slug },
        });
        prisma.property.update.mockResolvedValue({ id: "p1", publicationStatus: "PUBLISHED" });

        const result = await service.publish("p1", "admin-1");
        expect(result.publicationStatus).toBe("PUBLISHED");
      }
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: "admin-1", action: "property.publish" }),
      });
    });

    it("refuses to publish a property in a county that hasn't been explicitly approved yet — Mombasa", async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        publicationStatus: "APPROVED",
        county: { name: "Mombasa", slug: "mombasa" },
      });
      await expect(service.publish("p1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.property.update).not.toHaveBeenCalled();
    });

    it("refuses even for counties positioned earlier in the master list than an approved one, if never explicitly approved — Embu is position 3, still not approved", async () => {
      // Regression test for the exact bug the numeric-threshold mechanism
      // could not avoid: Embu sits between Kiambu (2) and Nakuru (11) in
      // the 47-county master list, but was never itself approved.
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        publicationStatus: "APPROVED",
        county: { name: "Embu", slug: "embu" },
      });
      await expect(service.publish("p1", "admin-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.property.update).not.toHaveBeenCalled();
    });

    it("APPROVED_COUNTY_SLUGS contains exactly the three counties actually approved so far, nothing more", () => {
      expect(APPROVED_COUNTY_SLUGS).toEqual(["nairobi-city", "kiambu", "nakuru"]);
    });
  });

  describe("reject", () => {
    it("resets a property to DRAFT/REJECTED and logs the reason", async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: "p1",
        verificationStatus: "UNVERIFIED",
      });
      prisma.property.update.mockResolvedValue({
        id: "p1",
        publicationStatus: "DRAFT",
        verificationStatus: "REJECTED",
      });

      const result = await service.reject("p1", "admin-1", "Manager phone number unreachable");
      expect(result.publicationStatus).toBe("DRAFT");
      expect(result.verificationStatus).toBe("REJECTED");
      expect(prisma.verificationEvent.create).toHaveBeenCalledTimes(1);
    });
  });
});

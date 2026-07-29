import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PropertiesService } from "../properties.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    organisationMember: {
      findUnique: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    unit: {
      create: jest.fn(),
    },
  };
}

const managerUser: AuthenticatedUser = {
  userId: "manager-1",
  email: "manager@example.com",
  roles: ["Manager"],
};

const adminUser: AuthenticatedUser = {
  userId: "admin-1",
  email: "admin@example.com",
  roles: ["Admin"],
};

describe("PropertiesService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PropertiesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PropertiesService(prisma as any);
  });

  describe("create", () => {
    it("rejects a manager who is not a member of the target organisation", async () => {
      prisma.organisationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create(managerUser, "org-other", {
          title: "Some Property",
          countyId: "county-1",
        })
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.property.create).not.toHaveBeenCalled();
    });

    it("allows a manager who belongs to the organisation and defaults to DRAFT/UNVERIFIED", async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: "member-1" });
      prisma.property.findUnique.mockResolvedValue(null); // no slug collision
      prisma.property.create.mockResolvedValue({ id: "property-1" });

      await service.create(managerUser, "org-1", {
        title: "Kilimani Test Studios",
        countyId: "county-1",
      });

      expect(prisma.property.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.property.create.mock.calls[0][0].data;
      expect(createArgs.publicationStatus).toBe("DRAFT");
      expect(createArgs.verificationStatus).toBe("UNVERIFIED");
      expect(createArgs.sourceStatus).toBe("MANAGER_SUPPLIED");
      expect(createArgs.slug).toBe("kilimani-test-studios");
    });

    it("appends a suffix to the slug when a collision is detected", async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: "member-1" });
      prisma.property.findUnique.mockResolvedValue({ id: "existing-property" }); // collision
      prisma.property.create.mockResolvedValue({ id: "property-2" });

      await service.create(managerUser, "org-1", {
        title: "Kilimani Test Studios",
        countyId: "county-1",
      });

      const createArgs = prisma.property.create.mock.calls[0][0].data;
      expect(createArgs.slug).not.toBe("kilimani-test-studios");
      expect(createArgs.slug.startsWith("kilimani-test-studios-")).toBe(true);
    });

    it("allows an Admin to create a property in any organisation without membership", async () => {
      prisma.property.findUnique.mockResolvedValue(null);
      prisma.property.create.mockResolvedValue({ id: "property-3" });

      await service.create(adminUser, "org-not-theirs", {
        title: "Admin Created Property",
        countyId: "county-1",
      });

      expect(prisma.organisationMember.findUnique).not.toHaveBeenCalled();
      expect(prisma.property.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOne", () => {
    it("throws NotFoundException when the property does not exist", async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);
      await expect(service.getOne(managerUser, "nonexistent")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("rejects a manager fetching a property belonging to another organisation", async () => {
      prisma.property.findUnique.mockResolvedValueOnce({ organisationId: "org-other" });
      prisma.organisationMember.findUnique.mockResolvedValue(null);

      await expect(service.getOne(managerUser, "property-1")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });
  });

  describe("submitForVerification", () => {
    it("moves publicationStatus from DRAFT to REVIEW", async () => {
      prisma.property.findUnique.mockResolvedValueOnce({ organisationId: "org-1" });
      prisma.organisationMember.findUnique.mockResolvedValue({ id: "member-1" });
      prisma.property.update.mockResolvedValue({ id: "property-1", publicationStatus: "REVIEW" });

      const result = await service.submitForVerification(managerUser, "property-1");

      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: "property-1" },
        data: { publicationStatus: "REVIEW" },
      });
      expect(result.publicationStatus).toBe("REVIEW");
    });
  });
});

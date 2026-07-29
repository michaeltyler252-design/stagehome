import { NotFoundException } from "@nestjs/common";
import { FavouritesService } from "../favourites.service";

function buildPrismaMock() {
  return {
    property: {
      findUnique: jest.fn(),
    },
    favourite: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

const baseUser = { userId: "user-1", roles: ["Tenant"] } as any;

describe("FavouritesService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: FavouritesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new FavouritesService(prisma as any);
  });

  describe("add", () => {
    it("throws when the property does not exist", async () => {
      prisma.property.findUnique.mockResolvedValue(null);

      await expect(service.add(baseUser, "prop-1")).rejects.toThrow(NotFoundException);
      expect(prisma.favourite.upsert).not.toHaveBeenCalled();
    });

    it("upserts (idempotent) rather than erroring on an already-favourited property", async () => {
      prisma.property.findUnique.mockResolvedValue({ id: "prop-1" });
      prisma.favourite.upsert.mockResolvedValue({ id: "fav-1", userId: "user-1", propertyId: "prop-1" });

      const result = await service.add(baseUser, "prop-1");

      expect(prisma.favourite.upsert).toHaveBeenCalledWith({
        where: { userId_propertyId: { userId: "user-1", propertyId: "prop-1" } },
        update: {},
        create: { userId: "user-1", propertyId: "prop-1" },
      });
      expect(result).toEqual({ id: "fav-1", userId: "user-1", propertyId: "prop-1" });
    });
  });

  describe("remove", () => {
    it("deletes the favourite scoped to the current user", async () => {
      prisma.favourite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove(baseUser, "prop-1");

      expect(prisma.favourite.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", propertyId: "prop-1" },
      });
      expect(result).toEqual({ removed: true });
    });
  });

  describe("listMine", () => {
    it("lists only the current user's favourites, newest first", async () => {
      prisma.favourite.findMany.mockResolvedValue([{ id: "fav-1" }]);

      const result = await service.listMine(baseUser);

      expect(prisma.favourite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { createdAt: "desc" },
        })
      );
      expect(result).toEqual([{ id: "fav-1" }]);
    });
  });
});

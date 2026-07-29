import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { BookingsService } from "../bookings.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    unit: { findUnique: jest.fn() },
    bookingQuote: { create: jest.fn(), findUnique: jest.fn() },
    bookingHold: { create: jest.fn(), findUnique: jest.fn() },
    booking: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  };
}

function buildRedisServiceMock() {
  const client = {
    set: jest.fn(),
    del: jest.fn(),
  };
  return { getClient: () => client, __client: client };
}

const tenantUser: AuthenticatedUser = {
  userId: "user-1",
  email: "tenant@example.com",
  roles: ["Tenant"],
};

describe("BookingsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let redis: ReturnType<typeof buildRedisServiceMock>;
  let service: BookingsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    redis = buildRedisServiceMock();
    service = new BookingsService(prisma as any, redis as any);
  });

  describe("createQuote", () => {
    it("refuses to quote a unit whose property is not PUBLISHED", async () => {
      prisma.unit.findUnique.mockResolvedValue({
        id: "unit-1",
        property: { publicationStatus: "DRAFT", pricingRules: [], deposits: [], fees: [] },
        pricingRules: [],
      });

      await expect(service.createQuote("user-1", "unit-1", {})).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("refuses to quote a unit with no pricing configured", async () => {
      prisma.unit.findUnique.mockResolvedValue({
        id: "unit-1",
        property: { publicationStatus: "PUBLISHED", pricingRules: [], deposits: [], fees: [] },
        pricingRules: [],
      });

      await expect(service.createQuote("user-1", "unit-1", {})).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("creates a quote with a 30-minute expiry from the unit's pricing rule", async () => {
      prisma.unit.findUnique.mockResolvedValue({
        id: "unit-1",
        property: {
          publicationStatus: "PUBLISHED",
          pricingRules: [{ rentAmountMin: 20000 }],
          deposits: [{ amount: 20000 }],
          fees: [{ feeType: "booking_fee", amount: 2000 }],
        },
        pricingRules: [],
      });
      prisma.bookingQuote.create.mockResolvedValue({ id: "quote-1" });

      const before = Date.now();
      await service.createQuote("user-1", "unit-1", {});
      const createArgs = prisma.bookingQuote.create.mock.calls[0][0].data;

      expect(createArgs.quotedRent).toBe(20000);
      expect(createArgs.quotedDeposit).toBe(20000);
      expect(createArgs.quotedFees).toBe(2000);
      const expiresInMs = new Date(createArgs.expiresAt).getTime() - before;
      expect(expiresInMs).toBeGreaterThan(29 * 60 * 1000);
      expect(expiresInMs).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);
    });
  });

  describe("createHold — double-booking prevention", () => {
    const validQuote = {
      id: "quote-1",
      unitId: "unit-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    it("throws NotFoundException for a nonexistent quote", async () => {
      prisma.bookingQuote.findUnique.mockResolvedValue(null);
      await expect(service.createHold("user-1", "missing")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("refuses to hold an expired quote", async () => {
      prisma.bookingQuote.findUnique.mockResolvedValue({
        ...validQuote,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.createHold("user-1", "quote-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("rejects a quote belonging to a different user", async () => {
      prisma.bookingQuote.findUnique.mockResolvedValue({ ...validQuote, userId: "someone-else" });
      await expect(service.createHold("user-1", "quote-1")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("acquires the Redis lock with NX and creates a hold on success", async () => {
      prisma.bookingQuote.findUnique.mockResolvedValue(validQuote);
      redis.__client.set.mockResolvedValue("OK");
      prisma.bookingHold.create.mockResolvedValue({ id: "hold-1" });

      await service.createHold("user-1", "quote-1");

      expect(redis.__client.set).toHaveBeenCalledWith(
        "unit-hold:unit-1",
        expect.any(String),
        "PX",
        expect.any(Number),
        "NX"
      );
      expect(prisma.bookingHold.create).toHaveBeenCalledTimes(1);
    });

    it("throws ConflictException when the unit is already locked by another hold (the core double-booking test)", async () => {
      prisma.bookingQuote.findUnique.mockResolvedValue(validQuote);
      redis.__client.set.mockResolvedValue(null); // NX failed — someone else holds it

      await expect(service.createHold("user-1", "quote-1")).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(prisma.bookingHold.create).not.toHaveBeenCalled();
    });
  });

  describe("confirmBooking", () => {
    const hold = {
      id: "hold-1",
      lockKey: "unit-hold:unit-1:token-abc",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      bookingQuote: {
        id: "quote-1",
        unitId: "unit-1",
        moveInDate: new Date("2026-09-01"),
        quotedRent: 20000,
        quotedDeposit: 20000,
      },
    };

    it("refuses to confirm an expired hold", async () => {
      prisma.bookingHold.findUnique.mockResolvedValue({
        ...hold,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.confirmBooking(tenantUser, "hold-1", {})).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("freezes a policySnapshotJson onto the booking at confirmation time", async () => {
      prisma.bookingHold.findUnique.mockResolvedValue(hold);
      prisma.unit.findUnique.mockResolvedValue({
        id: "unit-1",
        property: {
          houseRules: [{ ruleType: "pets", detail: "No pets" }],
          deposits: [{ amount: 20000, basis: "1 month" }],
        },
      });
      prisma.booking.create.mockResolvedValue({ id: "booking-1", status: "PENDING_PAYMENT" });

      await service.confirmBooking(tenantUser, "hold-1", {});

      const createArgs = prisma.booking.create.mock.calls[0][0].data;
      expect(createArgs.status).toBe("PENDING_PAYMENT");
      expect(createArgs.policySnapshotJson.houseRules).toEqual([
        { ruleType: "pets", detail: "No pets" },
      ]);
      expect(createArgs.policySnapshotJson.frozenAt).toBeDefined();
    });

    it("releases the Redis lock once the booking is confirmed", async () => {
      prisma.bookingHold.findUnique.mockResolvedValue(hold);
      prisma.unit.findUnique.mockResolvedValue({
        id: "unit-1",
        property: { houseRules: [], deposits: [] },
      });
      prisma.booking.create.mockResolvedValue({ id: "booking-1" });

      await service.confirmBooking(tenantUser, "hold-1", {});

      expect(redis.__client.del).toHaveBeenCalledWith("unit-hold:unit-1");
    });
  });

  describe("cancelBooking", () => {
    it("refuses to cancel someone else's booking", async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: "b1", userId: "other-user", status: "PENDING_PAYMENT" });
      await expect(service.cancelBooking(tenantUser, "b1")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("refuses to cancel a booking that is no longer PENDING_PAYMENT", async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: "b1", userId: "user-1", status: "CONFIRMED" });
      await expect(service.cancelBooking(tenantUser, "b1")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("cancels a PENDING_PAYMENT booking owned by the caller", async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: "b1", userId: "user-1", status: "PENDING_PAYMENT" });
      prisma.booking.update.mockResolvedValue({ id: "b1", status: "CANCELLED" });

      const result = await service.cancelBooking(tenantUser, "b1");
      expect(result.status).toBe("CANCELLED");
    });
  });
});

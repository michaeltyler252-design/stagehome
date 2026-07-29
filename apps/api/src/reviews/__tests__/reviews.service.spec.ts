import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ReviewsService } from "../reviews.service";

function buildPrismaMock() {
  return {
    booking: {
      findUnique: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    organisationMember: {
      findUnique: jest.fn(),
    },
    reviewResponse: {
      create: jest.fn(),
    },
  };
}

const baseUser = { userId: "user-1", roles: ["Tenant"] } as any;

describe("ReviewsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ReviewsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ReviewsService(prisma as any);
  });

  describe("createForBooking", () => {
    it("throws when the booking does not exist", async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.createForBooking(baseUser, "b1", { overallRating: 4, categories: [] })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to let a user review someone else's booking", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "someone-else",
        status: "COMPLETED",
        reviews: [],
        unit: { propertyId: "p1" },
      });
      await expect(
        service.createForBooking(baseUser, "b1", { overallRating: 4, categories: [] })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses to review a booking that isn't COMPLETED", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "CONFIRMED",
        reviews: [],
        unit: { propertyId: "p1" },
      });
      await expect(
        service.createForBooking(baseUser, "b1", { overallRating: 4, categories: [] })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a second review on the same booking", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "COMPLETED",
        reviews: [{ id: "existing-review" }],
        unit: { propertyId: "p1" },
      });
      await expect(
        service.createForBooking(baseUser, "b1", { overallRating: 4, categories: [] })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates a review with categories for a completed, unreviewed booking owned by the caller", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "COMPLETED",
        reviews: [],
        unit: { propertyId: "p1" },
      });
      prisma.review.create.mockResolvedValue({ id: "review-1" });

      const dto = { overallRating: 4.5, categories: [{ category: "security", rating: 5 }] };
      const result = await service.createForBooking(baseUser, "b1", dto as any);

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          propertyId: "p1",
          bookingId: "b1",
          userId: "user-1",
          overallRating: 4.5,
          categories: { create: [{ category: "security", rating: 5 }] },
        },
        include: { categories: true },
      });
      expect(result).toEqual({ id: "review-1" });
    });
  });

  describe("respond", () => {
    it("throws when the review does not exist", async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(
        service.respond(baseUser, "r1", { body: "Thanks!" })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses a non-Admin who is not a member of the property's organisation", async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: "r1",
        property: { organisationId: "org-1" },
      });
      prisma.organisationMember.findUnique.mockResolvedValue(null);
      await expect(
        service.respond(baseUser, "r1", { body: "Thanks!" })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows an Admin to respond even without organisation membership", async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: "r1",
        property: { organisationId: "org-1" },
      });
      prisma.reviewResponse.create.mockResolvedValue({ id: "response-1" });

      const admin = { userId: "admin-1", roles: ["Admin"] } as any;
      const result = await service.respond(admin, "r1", { body: "Thanks!" });

      expect(prisma.organisationMember.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({ id: "response-1" });
    });

    it("allows an organisation member to respond", async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: "r1",
        property: { organisationId: "org-1" },
      });
      prisma.organisationMember.findUnique.mockResolvedValue({ id: "member-1" });
      prisma.reviewResponse.create.mockResolvedValue({ id: "response-1" });

      const result = await service.respond(baseUser, "r1", { body: "Thanks for staying!" });

      expect(prisma.reviewResponse.create).toHaveBeenCalledWith({
        data: { reviewId: "r1", responderId: "user-1", body: "Thanks for staying!" },
      });
      expect(result).toEqual({ id: "response-1" });
    });
  });
});

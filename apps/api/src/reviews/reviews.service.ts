import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateReviewDto } from "./dto/create-review.dto";
import { CreateReviewResponseDto } from "./dto/create-review-response.dto";

// The `reviews` Prisma model, the search service's `most_reviewed` /
// `highest_verified_rating` sort options (apps/api/src/search/search.service.ts),
// and the public property response (public.service.ts's getPropertyBySlug
// already `include`s `reviews: { include: { categories: true } }`) all
// existed already. Nothing ever wrote a review or exposed a way to respond
// to one — this module closes that gap without touching any of the above.
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Only the tenant on a COMPLETED booking may review the stay, and only
   * once per booking — this is the "verified stays only" rule referenced by
   * the Review model's own `bookingId` comment.
   */
  async createForBooking(user: AuthenticatedUser, bookingId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { unit: { include: { property: true } }, reviews: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    if (booking.userId !== user.userId) {
      throw new ForbiddenException("You can only review your own bookings.");
    }
    if (booking.status !== "COMPLETED") {
      throw new BadRequestException(
        "A stay can only be reviewed once the booking is marked COMPLETED."
      );
    }
    if (booking.reviews.length > 0) {
      throw new ConflictException("This booking has already been reviewed.");
    }

    return this.prisma.review.create({
      data: {
        propertyId: booking.unit.propertyId,
        bookingId: booking.id,
        userId: user.userId,
        overallRating: dto.overallRating,
        categories: {
          create: dto.categories.map((c) => ({
            category: c.category,
            rating: c.rating,
          })),
        },
      },
      include: { categories: true },
    });
  }

  /**
   * A manager (member of the property's organisation) or Admin may respond
   * once, publicly, to a review — mirrors assertCanManageOrganisation's
   * access rule in properties.service.ts.
   */
  async respond(user: AuthenticatedUser, reviewId: string, dto: CreateReviewResponseDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { property: { select: { organisationId: true } } },
    });
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (!user.roles.includes("Admin")) {
      const membership = await this.prisma.organisationMember.findUnique({
        where: {
          organisationId_userId: { organisationId: review.property.organisationId, userId: user.userId },
        },
      });
      if (!membership) {
        throw new ForbiddenException("You do not manage the property this review is about.");
      }
    }

    return this.prisma.reviewResponse.create({
      data: {
        reviewId,
        responderId: user.userId,
        body: dto.body,
      },
    });
  }

  /** Public, paginated-free list for a property — same data already embedded
   * in getPropertyBySlug, exposed standalone for the account/manager views. */
  async listForProperty(propertyId: string) {
    return this.prisma.review.findMany({
      where: { propertyId },
      include: { categories: true, responses: true },
      orderBy: { createdAt: "desc" },
    });
  }
}

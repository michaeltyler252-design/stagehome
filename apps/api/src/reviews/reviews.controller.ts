import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { CreateReviewResponseDto } from "./dto/create-review-response.dto";

@ApiTags("reviews")
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("public/properties/:propertyId/reviews")
  listForProperty(@Param("propertyId") propertyId: string) {
    return this.reviewsService.listForProperty(propertyId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("bookings/:bookingId/reviews")
  createForBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookingId") bookingId: string,
    @Body() dto: CreateReviewDto
  ) {
    return this.reviewsService.createForBooking(user, bookingId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reviews/:reviewId/responses")
  respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reviewId") reviewId: string,
    @Body() dto: CreateReviewResponseDto
  ) {
    return this.reviewsService.respond(user, reviewId, dto);
  }
}

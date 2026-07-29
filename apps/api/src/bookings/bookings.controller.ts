import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { BookingsService } from "./bookings.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ConfirmBookingDto } from "./dto/confirm-booking.dto";

@ApiTags("bookings")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post("units/:unitId/quotes")
  createQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("unitId") unitId: string,
    @Body() dto: CreateQuoteDto
  ) {
    return this.bookingsService.createQuote(user.userId, unitId, dto);
  }

  @Post("quotes/:quoteId/hold")
  createHold(@CurrentUser() user: AuthenticatedUser, @Param("quoteId") quoteId: string) {
    return this.bookingsService.createHold(user.userId, quoteId);
  }

  @Post("holds/:holdId/confirm")
  confirmBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param("holdId") holdId: string,
    @Body() dto: ConfirmBookingDto
  ) {
    return this.bookingsService.confirmBooking(user, holdId, dto);
  }

  @Post("bookings/:bookingId/cancel")
  cancelBooking(@CurrentUser() user: AuthenticatedUser, @Param("bookingId") bookingId: string) {
    return this.bookingsService.cancelBooking(user, bookingId);
  }

  @Get("bookings/mine")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.listMine(user.userId);
  }
}

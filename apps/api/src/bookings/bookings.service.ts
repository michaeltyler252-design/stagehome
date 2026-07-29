import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { RedisService } from "../common/redis/redis.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ConfirmBookingDto } from "./dto/confirm-booking.dto";

const QUOTE_TTL_MINUTES = 30;
const HOLD_TTL_MINUTES = 15;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  /**
   * A renter can only quote a unit whose property is actually PUBLISHED —
   * this is the booking-side enforcement of Part B rule 8, mirroring the
   * public search API's own scope.
   */
  async createQuote(userId: string, unitId: string, dto: CreateQuoteDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: { include: { pricingRules: true, deposits: true, fees: true } },
        pricingRules: true,
      },
    });

    if (!unit || unit.property.publicationStatus !== "PUBLISHED") {
      throw new NotFoundException("This unit is not available to book.");
    }

    const pricingRule = unit.pricingRules[0] ?? unit.property.pricingRules[0];
    if (!pricingRule) {
      throw new BadRequestException("This unit does not have pricing configured yet.");
    }
    const deposit = unit.property.deposits[0];
    const bookingFee = unit.property.fees.find(
      (f: { feeType: string }) => f.feeType === "booking_fee"
    );

    return this.prisma.bookingQuote.create({
      data: {
        unitId,
        userId,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : undefined,
        quotedRent: pricingRule.rentAmountMin,
        quotedDeposit: deposit?.amount,
        quotedFees: bookingFee?.amount,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000),
      },
    });
  }

  /**
   * Places a short reservation lock on the unit in Redis (Part D: "Redis for
   * ... reservation locks") so two renters can't simultaneously hold the
   * same unit while one of them fills in booking details. Uses SET NX so
   * the lock acquisition itself is atomic — no race condition between
   * "check if locked" and "set the lock".
   */
  async createHold(userId: string, quoteId: string) {
    const quote = await this.prisma.bookingQuote.findUnique({ where: { id: quoteId } });
    if (!quote) {
      throw new NotFoundException("Quote not found.");
    }
    if (quote.userId && quote.userId !== userId) {
      throw new ForbiddenException("This quote belongs to a different account.");
    }
    if (quote.expiresAt < new Date()) {
      throw new BadRequestException("This quote has expired. Request a new one.");
    }

    const redis = this.redisService.getClient();
    const lockKey = `unit-hold:${quote.unitId}`;
    const lockToken = randomUUID();

    const acquired = await redis.set(lockKey, lockToken, "PX", HOLD_TTL_MINUTES * 60 * 1000, "NX");
    if (!acquired) {
      throw new ConflictException(
        "This unit is currently held by another renter. Try again in a few minutes."
      );
    }

    return this.prisma.bookingHold.create({
      data: {
        bookingQuoteId: quoteId,
        lockKey: `${lockKey}:${lockToken}`,
        expiresAt: new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000),
      },
    });
  }

  /**
   * Converts a hold into a real booking. The pricing/policy figures are
   * copied onto the booking as `policySnapshotJson` at this exact moment —
   * once frozen here, a manager cannot retroactively change a confirmed
   * booking's price or policy (Part K).
   */
  async confirmBooking(user: AuthenticatedUser, holdId: string, dto: ConfirmBookingDto) {
    const hold = await this.prisma.bookingHold.findUnique({
      where: { id: holdId },
      include: { bookingQuote: true },
    });
    if (!hold) {
      throw new NotFoundException("Hold not found.");
    }
    if (hold.expiresAt < new Date()) {
      throw new BadRequestException("This hold has expired. Start again from a new quote.");
    }

    const quote = hold.bookingQuote;
    const unit = await this.prisma.unit.findUnique({
      where: { id: quote.unitId },
      include: { property: { include: { houseRules: true, deposits: true } } },
    });
    if (!unit) {
      throw new NotFoundException("Unit no longer exists.");
    }

    const booking = await this.prisma.booking.create({
      data: {
        unitId: quote.unitId,
        userId: user.userId,
        status: "PENDING_PAYMENT",
        moveInDate: quote.moveInDate,
        agreedRent: quote.quotedRent,
        agreedDeposit: quote.quotedDeposit,
        policySnapshotJson: {
          houseRules: unit.property.houseRules,
          depositPolicy: unit.property.deposits[0] ?? null,
          frozenAt: new Date().toISOString(),
        },
        guests: dto.guests?.length
          ? { create: dto.guests.map((g) => ({ fullName: g.fullName, phone: g.phone })) }
          : undefined,
        installments: {
          // Milestone 7 scope: a single full-rent installment. Real
          // multi-installment plans (Part I: "Deposit, full rent, and
          // instalments") are a Milestone 8 payment-integration concern,
          // once a real payment provider can actually collect them.
          create: [
            {
              sequence: 1,
              amountDue: quote.quotedRent,
              dueDate: quote.moveInDate ?? new Date(),
            },
          ],
        },
      },
      include: { guests: true, installments: true },
    });

    // The hold's job is done — release the Redis lock immediately rather
    // than waiting for its TTL, so the unit becomes bookable again the
    // instant this booking either gets paid or is separately cancelled.
    // (Full release-on-payment-timeout is Milestone 8 scope, via a BullMQ
    // job in apps/worker — noted as a follow-up, not implemented here.)
    const redis = this.redisService.getClient();
    await redis.del(hold.lockKey.split(":").slice(0, 2).join(":"));

    return booking;
  }

  async cancelBooking(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    if (booking.userId !== user.userId && !user.roles.includes("Admin")) {
      throw new ForbiddenException("This booking belongs to a different account.");
    }
    if (booking.status !== "PENDING_PAYMENT") {
      throw new BadRequestException(
        `Cannot cancel a booking in status "${booking.status}". Only PENDING_PAYMENT bookings can be self-cancelled before payment (Part I refund workflow governs post-payment cancellation).`
      );
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }

  async listMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { unit: { include: { property: true } }, installments: true },
    });
  }
}

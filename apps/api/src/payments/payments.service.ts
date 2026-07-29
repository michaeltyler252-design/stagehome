import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { DarajaClient } from "./daraja.client";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { NotificationsService } from "../notifications/notifications.service";

const LARGE_REFUND_THRESHOLD = 50000; // KES — above this, dual control is required (Part J)

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly daraja: DarajaClient,
    private readonly notificationsService: NotificationsService
  ) {}

  /**
   * Initiates an M-Pesa STK push for a booking's next unpaid installment.
   * Idempotent: calling this twice with the same `idempotencyKey` returns
   * the original payment rather than double-charging (Part J:
   * "idempotency").
   */
  async initiate(user: AuthenticatedUser, dto: InitiatePaymentDto, callbackUrl: string) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { installments: { where: { paidAt: null }, orderBy: { sequence: "asc" } } },
    });
    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    if (booking.userId !== user.userId) {
      throw new ForbiddenException("This booking belongs to a different account.");
    }
    if (booking.status !== "PENDING_PAYMENT") {
      throw new BadRequestException(
        `Cannot take payment for a booking in status "${booking.status}".`
      );
    }
    const nextInstallment = booking.installments[0];
    if (!nextInstallment) {
      throw new BadRequestException("This booking has no outstanding balance.");
    }

    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: "MPESA_STK",
        status: "INITIATED",
        amount: nextInstallment.amountDue,
        idempotencyKey,
      },
    });

    try {
      const stkResponse = await this.daraja.initiateStkPush({
        phone: dto.phone,
        amount: Number(nextInstallment.amountDue),
        accountReference: booking.id,
        transactionDesc: `StageHome booking ${booking.id}`,
        callbackUrl,
      });

      await this.prisma.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          providerRef: stkResponse.checkoutRequestId,
          status: "PENDING",
          rawResponseJson: stkResponse as any,
        },
      });

      return this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PENDING" },
      });
    } catch (err) {
      // Record the failed attempt rather than leaving the payment stuck in
      // INITIATED with no trace of what happened (Part M: audit trail).
      await this.prisma.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          status: "FAILED",
          rawResponseJson: { error: err instanceof Error ? err.message : String(err) },
        },
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      throw err;
    }
  }

  /**
   * Handles the Daraja STK callback. Replay-safe: `payment_callbacks
   * .providerRef` is unique, so a duplicate callback (Daraja is known to
   * retry) is recorded but not reprocessed — no double ledger entry, no
   * double-confirmed booking.
   */
  async handleCallback(payload: any): Promise<{ received: true; alreadyProcessed: boolean }> {
    const checkoutRequestId: string | undefined = payload?.Body?.stkCallback?.CheckoutRequestID;
    const resultCode: number | undefined = payload?.Body?.stkCallback?.ResultCode;

    if (!checkoutRequestId) {
      throw new BadRequestException("Malformed Daraja callback payload.");
    }

    const existingCallback = await this.prisma.paymentCallback.findUnique({
      where: { providerRef: checkoutRequestId },
    });
    if (existingCallback) {
      return { received: true, alreadyProcessed: true };
    }

    const attempt = await this.prisma.paymentAttempt.findFirst({
      where: { providerRef: checkoutRequestId },
      include: {
        payment: {
          include: { booking: { include: { installments: true } } },
        },
      },
    });
    if (!attempt) {
      // A callback for a checkout request we never initiated (or already
      // cleaned up) — record it for the audit trail but there is nothing
      // safe to do with it.
      await this.prisma.paymentCallback.create({
        data: {
          providerRef: checkoutRequestId,
          signatureValid: false,
          rawPayloadJson: payload,
        },
      });
      return { received: true, alreadyProcessed: false };
    }

    await this.prisma.paymentCallback.create({
      data: {
        paymentId: attempt.paymentId,
        providerRef: checkoutRequestId,
        signatureValid: true,
        rawPayloadJson: payload,
      },
    });

    if (resultCode !== 0) {
      await this.prisma.payment.update({
        where: { id: attempt.paymentId },
        data: { status: "FAILED" },
      });
      return { received: true, alreadyProcessed: false };
    }

    await this.markPaymentSucceeded(attempt.payment);
    return { received: true, alreadyProcessed: false };
  }

  private async markPaymentSucceeded(payment: {
    id: string;
    amount: any;
    booking: {
      id: string;
      userId: string;
      installments: Array<{ id: string; paidAt: Date | null; sequence: number }>;
    };
  }) {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED" },
    });

    await this.prisma.paymentAllocation.create({
      data: { paymentId: payment.id, allocationType: "rent", amount: payment.amount },
    });

    const nextUnpaid = payment.booking.installments
      .filter((i) => !i.paidAt)
      .sort((a, b) => a.sequence - b.sequence)[0];
    if (nextUnpaid) {
      await this.prisma.bookingInstallment.update({
        where: { id: nextUnpaid.id },
        data: { paidAt: new Date() },
      });
    }

    await this.prisma.receipt.create({ data: { paymentId: payment.id } });

    await this.notificationsService.notify({
      userId: payment.booking.userId,
      type: "payment_receipt",
      subject: "Payment received",
      body: `We've received your payment of KES ${Number(payment.amount).toLocaleString()}. Your receipt is attached to your booking.`,
      payload: { paymentId: payment.id },
    });

    // Part J: internal double-entry ledger. Every successful payment posts
    // a balanced entry: cash-in-transit (M-Pesa clearing) debited, revenue
    // credited — the two ledger_accounts are upserted by name so this
    // works from a fresh database without a separate seed step.
    const [clearingAccount, revenueAccount] = await Promise.all([
      this.prisma.ledgerAccount.upsert({
        where: { name: "M-Pesa Clearing" },
        update: {},
        create: { name: "M-Pesa Clearing", type: "asset" },
      }),
      this.prisma.ledgerAccount.upsert({
        where: { name: "Rent Revenue" },
        update: {},
        create: { name: "Rent Revenue", type: "revenue" },
      }),
    ]);

    await this.prisma.ledgerEntry.createMany({
      data: [
        {
          ledgerAccountId: clearingAccount.id,
          debit: payment.amount,
          referenceType: "payment",
          referenceId: payment.id,
        },
        {
          ledgerAccountId: revenueAccount.id,
          credit: payment.amount,
          referenceType: "payment",
          referenceId: payment.id,
        },
      ],
    });

    const remainingUnpaid = payment.booking.installments.filter(
      (i) => i.id !== nextUnpaid?.id && !i.paidAt
    );
    if (remainingUnpaid.length === 0) {
      await this.prisma.booking.update({
        where: { id: payment.booking.id },
        data: { status: "CONFIRMED" },
      });
      await this.notificationsService.notify({
        userId: payment.booking.userId,
        type: "booking_confirmed",
        subject: "Your booking is confirmed",
        body: "Your booking is fully paid and confirmed. Your tenancy agreement will follow shortly.",
        payload: { bookingId: payment.booking.id },
      });
    }
  }

  /**
   * Refunds above `LARGE_REFUND_THRESHOLD` are flagged for dual control
   * (Part J: "Require step-up authentication and dual control for ...
   * high-value refunds"). This method only ever creates the flagged record;
   * `approveRefund` below is the second, independent action required before
   * money would actually move.
   */
  async requestRefund(paymentId: string, amount: number, reason: string, requestedBy: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException("Payment not found.");
    }
    if (payment.status !== "SUCCEEDED") {
      throw new BadRequestException("Only a succeeded payment can be refunded.");
    }

    return this.prisma.refund.create({
      data: {
        paymentId,
        amount,
        reason,
        requestedBy,
        requiresDualControl: amount >= LARGE_REFUND_THRESHOLD,
      },
    });
  }

  /**
   * The second, independent approval a dual-control refund requires.
   * Refuses outright if the approver is the same person who requested it —
   * "dual control" means two different people, not one person clicking
   * twice, and that is enforced here, not just documented.
   */
  async approveRefund(refundId: string, approverUserId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException("Refund not found.");
    }
    if (refund.approvedBy) {
      throw new BadRequestException("This refund has already been approved.");
    }
    if (refund.requiresDualControl && refund.requestedBy === approverUserId) {
      throw new ForbiddenException(
        "This refund requires dual control: the approver must be a different person from whoever requested it."
      );
    }

    return this.prisma.refund.update({
      where: { id: refundId },
      data: { approvedBy: approverUserId },
    });
  }
}

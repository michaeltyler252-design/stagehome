import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PaymentsService } from "../payments.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    booking: { findUnique: jest.fn(), update: jest.fn() },
    paymentAttempt: { create: jest.fn(), findFirst: jest.fn() },
    paymentCallback: { findUnique: jest.fn(), create: jest.fn() },
    paymentAllocation: { create: jest.fn() },
    bookingInstallment: { update: jest.fn() },
    receipt: { create: jest.fn() },
    ledgerAccount: { upsert: jest.fn() },
    ledgerEntry: { createMany: jest.fn() },
    refund: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
}

function buildDarajaMock() {
  return {
    initiateStkPush: jest.fn(),
  };
}

const tenantUser: AuthenticatedUser = {
  userId: "user-1",
  email: "tenant@example.com",
  roles: ["Tenant"],
};

describe("PaymentsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let daraja: ReturnType<typeof buildDarajaMock>;
  let notify: jest.Mock;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    daraja = buildDarajaMock();
    notify = jest.fn().mockResolvedValue(undefined);
    service = new PaymentsService(prisma as any, daraja as any, { notify } as any);
  });

  describe("initiate", () => {
    it("returns the existing payment instead of creating a new one when idempotencyKey matches (no double charge)", async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: "payment-existing" });

      const result = await service.initiate(
        tenantUser,
        { bookingId: "b1", phone: "254712345678", idempotencyKey: "11111111-1111-1111-1111-111111111111" },
        "https://example.com/callback"
      );

      expect(result).toEqual({ id: "payment-existing" });
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(daraja.initiateStkPush).not.toHaveBeenCalled();
    });

    it("rejects initiating payment for someone else's booking", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "someone-else",
        status: "PENDING_PAYMENT",
        installments: [],
      });

      await expect(
        service.initiate(tenantUser, { bookingId: "b1", phone: "254712345678" }, "cb")
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects initiating payment for a booking that isn't PENDING_PAYMENT", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "CONFIRMED",
        installments: [],
      });

      await expect(
        service.initiate(tenantUser, { bookingId: "b1", phone: "254712345678" }, "cb")
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects when there is no outstanding installment", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "PENDING_PAYMENT",
        installments: [],
      });

      await expect(
        service.initiate(tenantUser, { bookingId: "b1", phone: "254712345678" }, "cb")
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates a payment and calls Daraja's STK push with the next installment's amount", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "PENDING_PAYMENT",
        installments: [{ id: "inst-1", amountDue: 20000, sequence: 1 }],
      });
      prisma.payment.create.mockResolvedValue({ id: "payment-1" });
      daraja.initiateStkPush.mockResolvedValue({
        merchantRequestId: "m1",
        checkoutRequestId: "c1",
        responseCode: "0",
        responseDescription: "Success",
      });
      prisma.payment.update.mockResolvedValue({ id: "payment-1", status: "PENDING" });

      await service.initiate(tenantUser, { bookingId: "b1", phone: "254712345678" }, "https://cb");

      expect(daraja.initiateStkPush).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "254712345678", amount: 20000 })
      );
      expect(prisma.paymentAttempt.create).toHaveBeenCalledTimes(1);
    });

    it("records a failed attempt and rethrows when Daraja is not configured/fails", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.booking.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user-1",
        status: "PENDING_PAYMENT",
        installments: [{ id: "inst-1", amountDue: 20000, sequence: 1 }],
      });
      prisma.payment.create.mockResolvedValue({ id: "payment-1" });
      daraja.initiateStkPush.mockRejectedValue(new Error("M-Pesa not configured"));

      await expect(
        service.initiate(tenantUser, { bookingId: "b1", phone: "254712345678" }, "https://cb")
      ).rejects.toThrow("M-Pesa not configured");

      const attemptArgs = prisma.paymentAttempt.create.mock.calls[0][0].data;
      expect(attemptArgs.status).toBe("FAILED");
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: { status: "FAILED" },
      });
    });
  });

  describe("handleCallback — replay protection and idempotency", () => {
    it("rejects a malformed callback with no CheckoutRequestID", async () => {
      await expect(service.handleCallback({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it("does not reprocess a callback it has already recorded (replay-safe)", async () => {
      prisma.paymentCallback.findUnique.mockResolvedValue({ id: "existing-callback" });

      const result = await service.handleCallback({
        Body: { stkCallback: { CheckoutRequestID: "c1", ResultCode: 0 } },
      });

      expect(result.alreadyProcessed).toBe(true);
      expect(prisma.paymentCallback.create).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("marks the payment FAILED when Daraja reports a non-zero ResultCode", async () => {
      prisma.paymentCallback.findUnique.mockResolvedValue(null);
      prisma.paymentAttempt.findFirst.mockResolvedValue({
        paymentId: "payment-1",
        payment: { id: "payment-1", amount: 20000, booking: { id: "b1", installments: [] } },
      });

      await service.handleCallback({
        Body: { stkCallback: { CheckoutRequestID: "c1", ResultCode: 1032 } },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: { status: "FAILED" },
      });
      expect(prisma.ledgerEntry.createMany).not.toHaveBeenCalled();
    });

    it("posts a balanced double-entry ledger and confirms the booking on full payment success", async () => {
      prisma.paymentCallback.findUnique.mockResolvedValue(null);
      prisma.paymentAttempt.findFirst.mockResolvedValue({
        paymentId: "payment-1",
        payment: {
          id: "payment-1",
          amount: 20000,
          booking: {
            id: "b1",
            installments: [{ id: "inst-1", paidAt: null, sequence: 1 }],
          },
        },
      });
      prisma.ledgerAccount.upsert
        .mockResolvedValueOnce({ id: "acct-clearing" })
        .mockResolvedValueOnce({ id: "acct-revenue" });

      await service.handleCallback({
        Body: { stkCallback: { CheckoutRequestID: "c1", ResultCode: 0 } },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: { status: "SUCCEEDED" },
      });
      expect(prisma.bookingInstallment.update).toHaveBeenCalledWith({
        where: { id: "inst-1" },
        data: { paidAt: expect.any(Date) },
      });

      const ledgerArgs = prisma.ledgerEntry.createMany.mock.calls[0][0].data;
      const totalDebits = ledgerArgs.reduce((sum: number, e: any) => sum + (e.debit ?? 0), 0);
      const totalCredits = ledgerArgs.reduce((sum: number, e: any) => sum + (e.credit ?? 0), 0);
      expect(totalDebits).toBe(totalCredits); // a real double-entry ledger must balance

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: { status: "CONFIRMED" },
      });
    });

    it("does NOT confirm the booking yet if other installments remain unpaid", async () => {
      prisma.paymentCallback.findUnique.mockResolvedValue(null);
      prisma.paymentAttempt.findFirst.mockResolvedValue({
        paymentId: "payment-1",
        payment: {
          id: "payment-1",
          amount: 10000,
          booking: {
            id: "b1",
            installments: [
              { id: "inst-1", paidAt: null, sequence: 1 },
              { id: "inst-2", paidAt: null, sequence: 2 },
            ],
          },
        },
      });
      prisma.ledgerAccount.upsert
        .mockResolvedValueOnce({ id: "acct-clearing" })
        .mockResolvedValueOnce({ id: "acct-revenue" });

      await service.handleCallback({
        Body: { stkCallback: { CheckoutRequestID: "c1", ResultCode: 0 } },
      });

      expect(prisma.booking.update).not.toHaveBeenCalled();
    });
  });

  describe("requestRefund", () => {
    it("flags dual control for a refund at/above the large-refund threshold", async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: "payment-1", status: "SUCCEEDED" });
      prisma.refund.create.mockResolvedValue({ id: "refund-1", requiresDualControl: true });

      await service.requestRefund("payment-1", 50000, "Manager cancelled", "admin-1");

      const createArgs = prisma.refund.create.mock.calls[0][0].data;
      expect(createArgs.requiresDualControl).toBe(true);
      expect(createArgs.requestedBy).toBe("admin-1");
    });

    it("does not flag dual control for a small refund", async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: "payment-1", status: "SUCCEEDED" });
      prisma.refund.create.mockResolvedValue({ id: "refund-1" });

      await service.requestRefund("payment-1", 500, "Booking fee waived", "admin-1");

      const createArgs = prisma.refund.create.mock.calls[0][0].data;
      expect(createArgs.requiresDualControl).toBe(false);
    });

    it("refuses to refund a payment that never succeeded", async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: "payment-1", status: "FAILED" });

      await expect(
        service.requestRefund("payment-1", 1000, "test", "admin-1")
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws NotFoundException for a nonexistent payment", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.requestRefund("missing", 1000, "test", "admin-1")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("approveRefund — dual control enforcement", () => {
    it("throws NotFoundException for a nonexistent refund", async () => {
      prisma.refund.findUnique.mockResolvedValue(null);
      await expect(service.approveRefund("missing", "admin-2")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("refuses to re-approve a refund that's already been approved", async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: "refund-1",
        requestedBy: "admin-1",
        approvedBy: "admin-2",
        requiresDualControl: true,
      });
      await expect(service.approveRefund("refund-1", "admin-3")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("refuses to let the requester approve their own dual-control refund (the core test)", async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: "refund-1",
        requestedBy: "admin-1",
        approvedBy: null,
        requiresDualControl: true,
      });
      await expect(service.approveRefund("refund-1", "admin-1")).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(prisma.refund.update).not.toHaveBeenCalled();
    });

    it("allows a different admin to approve a dual-control refund", async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: "refund-1",
        requestedBy: "admin-1",
        approvedBy: null,
        requiresDualControl: true,
      });
      prisma.refund.update.mockResolvedValue({ id: "refund-1", approvedBy: "admin-2" });

      const result = await service.approveRefund("refund-1", "admin-2");
      expect(result.approvedBy).toBe("admin-2");
    });

    it("allows the same person to approve a refund that never required dual control", async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: "refund-1",
        requestedBy: "admin-1",
        approvedBy: null,
        requiresDualControl: false,
      });
      prisma.refund.update.mockResolvedValue({ id: "refund-1", approvedBy: "admin-1" });

      await expect(service.approveRefund("refund-1", "admin-1")).resolves.toBeDefined();
    });
  });
});

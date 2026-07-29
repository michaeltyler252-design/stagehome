import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AgreementsService } from "../agreements.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    booking: { findUnique: jest.fn() },
    agreement: { create: jest.fn(), update: jest.fn() },
    agreementSignatory: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    signatureRequest: { create: jest.fn(), findUnique: jest.fn() },
    signatureEvent: { create: jest.fn() },
    signedDocument: { create: jest.fn() },
  };
}

const tenantUser: AuthenticatedUser = {
  userId: "user-1",
  email: "tenant@example.com",
  roles: ["Tenant"],
};

const baseBooking = {
  id: "booking-1",
  userId: "user-1",
  status: "CONFIRMED",
  agreedRent: 20000,
  agreedDeposit: 20000,
  moveInDate: new Date("2026-09-01"),
  agreements: [] as any[],
  user: { email: "tenant@example.com", phone: null, profile: { firstName: "Wanjiru", lastName: "Kamau" } },
  unit: {
    publicLabel: "Studio A",
    property: {
      title: "Kilimani Premium Studios",
      address: "Ngong Road",
      houseRules: [],
      organisation: { name: "Acme Housing" },
    },
  },
};

describe("AgreementsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let notify: jest.Mock;
  let service: AgreementsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    notify = jest.fn().mockResolvedValue(undefined);
    service = new AgreementsService(prisma as any, { notify } as any);
  });

  describe("generate", () => {
    it("throws NotFoundException for a nonexistent booking", async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.generate(tenantUser, "missing")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("rejects generating an agreement for someone else's booking", async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...baseBooking, userId: "someone-else" });
      await expect(service.generate(tenantUser, "booking-1")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("refuses to generate an agreement before the booking is CONFIRMED", async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...baseBooking, status: "PENDING_PAYMENT" });
      await expect(service.generate(tenantUser, "booking-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("refuses to regenerate an agreement once one is already FULLY_SIGNED (no silent replacement)", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...baseBooking,
        agreements: [{ status: "FULLY_SIGNED" }],
      });
      await expect(service.generate(tenantUser, "booking-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(prisma.agreement.create).not.toHaveBeenCalled();
    });

    it("creates the agreement, a v1 version with a document hash, and one signing link per signatory", async () => {
      prisma.booking.findUnique.mockResolvedValue(baseBooking);
      prisma.agreement.create.mockResolvedValue({ id: "agreement-1", versions: [{ version: 1 }] });
      prisma.agreementSignatory.create
        .mockResolvedValueOnce({ id: "sig-tenant", role: "tenant" })
        .mockResolvedValueOnce({ id: "sig-manager", role: "manager" });
      prisma.signatureRequest.create
        .mockResolvedValueOnce({ authenticatedLinkToken: "token-tenant" })
        .mockResolvedValueOnce({ authenticatedLinkToken: "token-manager" });

      const result = await service.generate(tenantUser, "booking-1");

      const agreementCreateArgs = prisma.agreement.create.mock.calls[0][0].data;
      expect(agreementCreateArgs.versions.create.version).toBe(1);
      expect(agreementCreateArgs.versions.create.documentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.signingLinks).toEqual([
        { role: "tenant", token: "token-tenant" },
        { role: "manager", token: "token-manager" },
      ]);
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", type: "agreement_signing_link" })
      );
    });
  });

  describe("getByToken", () => {
    it("throws NotFoundException for an unknown token", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue(null);
      await expect(service.getByToken("bad-token")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException for an expired signing link", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: "req-1",
        expiresAt: new Date(Date.now() - 1000),
        signatory: { role: "tenant", signedAt: null, agreement: { status: "SENT", versions: [] } },
      });
      await expect(service.getByToken("expired-token")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("records a 'viewed' signature event on successful lookup", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: "req-1",
        expiresAt: new Date(Date.now() + 10000),
        signatory: { role: "tenant", signedAt: null, agreement: { status: "SENT", versions: [{ version: 1 }] } },
      });

      await service.getByToken("good-token", "203.0.113.5");

      expect(prisma.signatureEvent.create).toHaveBeenCalledWith({
        data: { signatureRequestId: "req-1", eventType: "viewed", ipAddress: "203.0.113.5" },
      });
    });
  });

  describe("sign", () => {
    it("refuses a signatory who already signed", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: "req-1",
        expiresAt: new Date(Date.now() + 10000),
        signatory: { id: "sig-1", agreementId: "agreement-1", signedAt: new Date() },
      });
      await expect(service.sign("token")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("moves the agreement to PARTIALLY_SIGNED when one of two signatories has signed", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: "req-1",
        expiresAt: new Date(Date.now() + 10000),
        signatory: { id: "sig-tenant", agreementId: "agreement-1", signedAt: null },
      });
      prisma.agreementSignatory.findMany.mockResolvedValue([
        { id: "sig-tenant", signedAt: new Date() },
        { id: "sig-manager", signedAt: null },
      ]);

      const result = await service.sign("token-tenant", "203.0.113.5");

      expect(result.fullySigned).toBe(false);
      expect(prisma.agreement.update).toHaveBeenCalledWith({
        where: { id: "agreement-1" },
        data: { status: "PARTIALLY_SIGNED" },
      });
      expect(prisma.signedDocument.create).not.toHaveBeenCalled();
    });

    it("seals the agreement (FULLY_SIGNED + SignedDocument) once the last signatory signs", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: "req-2",
        expiresAt: new Date(Date.now() + 10000),
        signatory: { id: "sig-manager", agreementId: "agreement-1", signedAt: null },
      });
      prisma.agreementSignatory.findMany.mockResolvedValue([
        { id: "sig-tenant", signedAt: new Date() },
        { id: "sig-manager", signedAt: new Date() },
      ]);

      const result = await service.sign("token-manager", "203.0.113.6");

      expect(result.fullySigned).toBe(true);
      expect(prisma.agreement.update).toHaveBeenCalledWith({
        where: { id: "agreement-1" },
        data: { status: "FULLY_SIGNED" },
      });
      expect(prisma.signedDocument.create).toHaveBeenCalledTimes(1);
    });

    it("records both a 'consented' and a 'signed' event as audit evidence", async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: "req-1",
        expiresAt: new Date(Date.now() + 10000),
        signatory: { id: "sig-tenant", agreementId: "agreement-1", signedAt: null },
      });
      prisma.agreementSignatory.findMany.mockResolvedValue([
        { id: "sig-tenant", signedAt: new Date() },
        { id: "sig-manager", signedAt: null },
      ]);

      await service.sign("token", "203.0.113.5");

      const eventTypes = prisma.signatureEvent.create.mock.calls.map((c) => c[0].data.eventType);
      expect(eventTypes).toEqual(["consented", "signed"]);
    });
  });
});

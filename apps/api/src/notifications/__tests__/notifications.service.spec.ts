import { NotificationsService } from "../notifications.service";

function buildPrismaMock() {
  return {
    user: { findUnique: jest.fn() },
    notificationPreference: { findUnique: jest.fn() },
    notification: { create: jest.fn(), update: jest.fn() },
  };
}

describe("NotificationsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let emailClient: { send: jest.Mock };
  let smsClient: { send: jest.Mock };
  let whatsAppClient: { send: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    emailClient = { send: jest.fn().mockResolvedValue(undefined) };
    smsClient = { send: jest.fn().mockResolvedValue(undefined) };
    whatsAppClient = { send: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationsService(
      prisma as any,
      emailClient as any,
      smsClient as any,
      whatsAppClient as any
    );
    prisma.notification.create.mockResolvedValue({ id: "notif-1" });
  });

  it("does nothing (and doesn't throw) for a nonexistent user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await service.notify({
      userId: "missing",
      type: "booking_confirmed",
      subject: "s",
      body: "b",
    });
    expect(emailClient.send).not.toHaveBeenCalled();
  });

  it("sends email and SMS by default (opt-in true) but not WhatsApp (opt-in false) when no preference row exists", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@example.com", phone: "254712345678" });
    prisma.notificationPreference.findUnique.mockResolvedValue(null);

    await service.notify({ userId: "u1", type: "booking_confirmed", subject: "s", body: "b" });

    expect(emailClient.send).toHaveBeenCalledTimes(1);
    expect(smsClient.send).toHaveBeenCalledTimes(1);
    expect(whatsAppClient.send).not.toHaveBeenCalled();
  });

  it("respects an explicit preference row that opts out of email", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@example.com", phone: "254712345678" });
    prisma.notificationPreference.findUnique.mockResolvedValue({
      emailOptIn: false,
      smsOptIn: true,
      whatsappOptIn: true,
    });

    await service.notify({ userId: "u1", type: "payment_receipt", subject: "s", body: "b" });

    expect(emailClient.send).not.toHaveBeenCalled();
    expect(smsClient.send).toHaveBeenCalledTimes(1);
    expect(whatsAppClient.send).toHaveBeenCalledTimes(1);
  });

  it("never sends to a channel the user has no contact detail for, even if opted in", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: null, phone: "254712345678" });
    prisma.notificationPreference.findUnique.mockResolvedValue({
      emailOptIn: true,
      smsOptIn: true,
      whatsappOptIn: false,
    });

    await service.notify({ userId: "u1", type: "booking_confirmed", subject: "s", body: "b" });

    expect(emailClient.send).not.toHaveBeenCalled();
    expect(smsClient.send).toHaveBeenCalledTimes(1);
  });

  it("does not let one channel's failure stop the others, and never throws out of notify()", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@example.com", phone: "254712345678" });
    prisma.notificationPreference.findUnique.mockResolvedValue({
      emailOptIn: true,
      smsOptIn: true,
      whatsappOptIn: false,
    });
    emailClient.send.mockRejectedValue(new Error("provider down"));

    await expect(
      service.notify({ userId: "u1", type: "booking_confirmed", subject: "s", body: "b" })
    ).resolves.toBeUndefined();

    expect(smsClient.send).toHaveBeenCalledTimes(1);
  });

  it("records a Notification row per attempted channel and marks sentAt on success", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@example.com", phone: null });
    prisma.notificationPreference.findUnique.mockResolvedValue({
      emailOptIn: true,
      smsOptIn: true,
      whatsappOptIn: false,
    });

    await service.notify({ userId: "u1", type: "booking_confirmed", subject: "s", body: "b" });

    expect(prisma.notification.create).toHaveBeenCalledTimes(1); // only email — no phone on file
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { sentAt: expect.any(Date) },
    });
  });
});

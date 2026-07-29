import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { SupportService } from "../support.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    supportTicket: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    supportMessage: { create: jest.fn() },
  };
}

const tenantUser: AuthenticatedUser = { userId: "user-1", email: "t@example.com", roles: ["Tenant"] };
const adminUser: AuthenticatedUser = { userId: "admin-1", email: "a@example.com", roles: ["Admin"] };

describe("SupportService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let notify: jest.Mock;
  let service: SupportService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    notify = jest.fn().mockResolvedValue(undefined);
    service = new SupportService(prisma as any, { notify } as any);
  });

  describe("createTicket", () => {
    it("defaults priority to P4 when none is given", async () => {
      prisma.supportTicket.create.mockResolvedValue({ id: "t1" });

      await service.createTicket(tenantUser, { subject: "Can't find my receipt", body: "Help" });

      const createArgs = prisma.supportTicket.create.mock.calls[0][0].data;
      expect(createArgs.priority).toBe("P4");
      expect(createArgs.status).toBe("OPEN");
    });

    it("respects an explicit priority", async () => {
      prisma.supportTicket.create.mockResolvedValue({ id: "t1" });
      await service.createTicket(tenantUser, { subject: "Payment stuck", body: "Help", priority: "P1" });
      expect(prisma.supportTicket.create.mock.calls[0][0].data.priority).toBe("P1");
    });
  });

  describe("addMessage", () => {
    it("throws NotFoundException for a nonexistent ticket", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);
      await expect(service.addMessage(tenantUser, "missing", "hi")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("rejects adding a message to someone else's ticket", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: "t1", userId: "someone-else" });
      await expect(service.addMessage(tenantUser, "t1", "hi")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("allows an Admin to message any ticket", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: "t1", userId: "someone-else" });
      prisma.supportMessage.create.mockResolvedValue({ id: "m1" });
      await expect(service.addMessage(adminUser, "t1", "We're on it")).resolves.toEqual({ id: "m1" });
    });
  });

  describe("updateStatus", () => {
    it("notifies the ticket owner (not the caller) when status changes", async () => {
      prisma.supportTicket.update.mockResolvedValue({
        id: "t1",
        userId: "user-1",
        subject: "Payment stuck",
        status: "RESOLVED",
      });

      await service.updateStatus("t1", "RESOLVED");

      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", type: "support_status" })
      );
    });
  });
});

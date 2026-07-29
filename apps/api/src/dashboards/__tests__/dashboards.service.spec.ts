import { ForbiddenException } from "@nestjs/common";
import { DashboardsService } from "../dashboards.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function buildPrismaMock() {
  return {
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    supportTicket: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    favourite: { count: jest.fn().mockResolvedValue(0) },
    savedSearch: { count: jest.fn().mockResolvedValue(0) },
    organisationMember: { findUnique: jest.fn() },
    property: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
    user: { count: jest.fn().mockResolvedValue(0) },
    refund: { count: jest.fn().mockResolvedValue(0) },
  };
}

const managerUser: AuthenticatedUser = { userId: "user-1", email: "m@example.com", roles: ["Manager"] };
const adminUser: AuthenticatedUser = { userId: "admin-1", email: "a@example.com", roles: ["Admin"] };

describe("DashboardsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: DashboardsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new DashboardsService(prisma as any);
  });

  describe("tenantDashboard", () => {
    it("counts only PENDING_PAYMENT and CONFIRMED bookings as active", async () => {
      prisma.booking.findMany.mockResolvedValue([
        { status: "PENDING_PAYMENT" },
        { status: "CONFIRMED" },
        { status: "CANCELLED" },
        { status: "COMPLETED" },
      ]);

      const result = await service.tenantDashboard("user-1");
      expect(result.counts.activeBookings).toBe(2);
    });
  });

  describe("managerDashboard", () => {
    it("rejects a manager with no membership in the target organisation", async () => {
      prisma.organisationMember.findUnique.mockResolvedValue(null);
      await expect(service.managerDashboard(managerUser, "org-other")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("allows an Admin without requiring organisation membership", async () => {
      await service.managerDashboard(adminUser, "org-any");
      expect(prisma.organisationMember.findUnique).not.toHaveBeenCalled();
    });

    it("sums unit counts across all of the organisation's properties", async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: "member-1" });
      prisma.property.findMany.mockResolvedValue([
        { id: "p1", units: [{ id: "u1" }, { id: "u2" }] },
        { id: "p2", units: [{ id: "u3" }] },
      ]);

      const result = await service.managerDashboard(managerUser, "org-1");
      expect(result.totalUnits).toBe(3);
      expect(result.totalProperties).toBe(2);
    });

    it("defaults totalRevenue to 0 when there are no successful payments yet", async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: "member-1" });
      const result = await service.managerDashboard(managerUser, "org-1");
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe("adminDashboard", () => {
    it("only counts refunds still pending dual control (not yet approved)", async () => {
      await service.adminDashboard();
      const countArgs = prisma.refund.count.mock.calls[0][0].where;
      expect(countArgs.requiresDualControl).toBe(true);
      expect(countArgs.approvedBy).toBeNull();
    });

    it("only counts properties with a FLAGGED conflict status, not all properties", async () => {
      await service.adminDashboard();
      const countArgs = prisma.property.count.mock.calls[0][0].where;
      expect(countArgs.conflictStatus).toBe("FLAGGED");
    });

    it("scopes the verification queue count to REVIEW status only", async () => {
      await service.adminDashboard();
      const countArgs = prisma.property.count.mock.calls[1][0].where;
      expect(countArgs.publicationStatus).toBe("REVIEW");
    });
  });
});

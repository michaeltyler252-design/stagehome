import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Part K tenant dashboard: bookings, payments, agreements, support tickets — theirs only. */
  async tenantDashboard(userId: string) {
    const [bookings, supportTickets, favouritesCount, savedSearchesCount] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          unit: { include: { property: true } },
          payments: true,
          agreements: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
          installments: true,
          // So the "leave a review" prompt only shows for a COMPLETED booking
          // that doesn't already have one (see MyBookingsPage).
          reviews: { select: { id: true } },
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      this.prisma.favourite.count({ where: { userId } }),
      this.prisma.savedSearch.count({ where: { userId } }),
    ]);

    return {
      bookings,
      supportTickets,
      counts: {
        activeBookings: bookings.filter((b: { status: string }) => ["PENDING_PAYMENT", "CONFIRMED"].includes(b.status))
          .length,
        favourites: favouritesCount,
        savedSearches: savedSearchesCount,
      },
    };
  }

  /**
   * Part K manager dashboard: portfolio composition, verification pipeline
   * status, recent bookings, and revenue — scoped to one organisation.
   * Reuses the same membership check as PropertiesService so a manager can
   * never see another organisation's numbers.
   */
  async managerDashboard(user: AuthenticatedUser, organisationId: string) {
    if (!user.roles.includes("Admin")) {
      const membership = await this.prisma.organisationMember.findUnique({
        where: { organisationId_userId: { organisationId, userId: user.userId } },
      });
      if (!membership) {
        throw new ForbiddenException("You do not have access to this organisation's dashboard.");
      }
    }

    const [propertiesByStatus, properties, recentBookings] = await Promise.all([
      this.prisma.property.groupBy({
        by: ["publicationStatus"],
        where: { organisationId },
        _count: { _all: true },
      }),
      this.prisma.property.findMany({
        where: { organisationId },
        select: { id: true, units: { select: { id: true } } },
      }),
      this.prisma.booking.findMany({
        where: { unit: { property: { organisationId } } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { unit: { include: { property: true } }, payments: true },
      }),
    ]);

    const totalUnits = properties.reduce((sum: number, p: { units: unknown[] }) => sum + p.units.length, 0);

    const revenueResult = await this.prisma.payment.aggregate({
      where: { status: "SUCCEEDED", booking: { unit: { property: { organisationId } } } },
      _sum: { amount: true },
    });

    return {
      propertiesByStatus: Object.fromEntries(
        propertiesByStatus.map((row: { publicationStatus: string; _count: { _all: number } }) => [row.publicationStatus, row._count._all])
      ),
      totalProperties: properties.length,
      totalUnits,
      recentBookings,
      totalRevenue: revenueResult._sum.amount ?? 0,
    };
  }

  /** Part K admin dashboard: platform-wide operational view. */
  async adminDashboard() {
    const [
      propertiesByStatus,
      flaggedConflicts,
      verificationQueueCount,
      bookingsByStatus,
      totalUsers,
      totalRevenue,
      refundsPendingDualControl,
      supportTicketsByPriority,
    ] = await Promise.all([
      this.prisma.property.groupBy({ by: ["publicationStatus"], _count: { _all: true } }),
      this.prisma.property.count({ where: { conflictStatus: "FLAGGED" } }),
      this.prisma.property.count({ where: { publicationStatus: "REVIEW" } }),
      this.prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.user.count(),
      this.prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amount: true } }),
      this.prisma.refund.count({ where: { requiresDualControl: true, approvedBy: null } }),
      this.prisma.supportTicket.groupBy({
        by: ["priority"],
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        _count: { _all: true },
      }),
    ]);

    return {
      propertiesByStatus: Object.fromEntries(
        propertiesByStatus.map((row: { publicationStatus: string; _count: { _all: number } }) => [row.publicationStatus, row._count._all])
      ),
      flaggedConflicts,
      verificationQueueCount,
      bookingsByStatus: Object.fromEntries(
        bookingsByStatus.map((row: { status: string; _count: { _all: number } }) => [row.status, row._count._all])
      ),
      totalUsers,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      refundsPendingDualControl,
      openSupportTicketsByPriority: Object.fromEntries(
        supportTicketsByPriority.map((row: { priority: string; _count: { _all: number } }) => [row.priority, row._count._all])
      ),
    };
  }
}

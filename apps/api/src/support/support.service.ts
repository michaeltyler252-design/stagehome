import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async createTicket(user: AuthenticatedUser, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId: user.userId,
        subject: dto.subject,
        priority: dto.priority ?? "P4",
        status: "OPEN",
        messages: { create: { authorId: user.userId, body: dto.body } },
      },
      include: { messages: true },
    });
  }

  async addMessage(user: AuthenticatedUser, ticketId: string, body: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }
    if (ticket.userId !== user.userId && !user.roles.includes("Admin")) {
      throw new ForbiddenException("This ticket belongs to a different account.");
    }

    return this.prisma.supportMessage.create({
      data: { ticketId, authorId: user.userId, body },
    });
  }

  async listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async listAll() {
    return this.prisma.supportTicket.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
  }

  /**
   * Admin-only status transition. Notifies the ticket's owner via their
   * opted-in channels (Part D: "support_status" is one of the notification
   * types) — the user finds out their ticket moved without having to poll.
   */
  async updateStatus(ticketId: string, status: string) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    await this.notificationsService.notify({
      userId: ticket.userId,
      type: "support_status",
      subject: `Update on your support ticket: ${ticket.subject}`,
      body: `Your support ticket "${ticket.subject}" is now ${status.replace(/_/g, " ").toLowerCase()}.`,
      payload: { ticketId, status },
    });

    return ticket;
  }
}

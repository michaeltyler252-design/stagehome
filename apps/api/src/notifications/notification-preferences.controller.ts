import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../common/prisma/prisma.service";
import { UpdateNotificationPreferenceDto } from "./dto/update-preference.dto";

@ApiTags("notification-preferences")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("notification-preferences/mine")
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId: user.userId },
    });
    // Schema-default values if the user has never saved preferences yet.
    return existing ?? { userId: user.userId, emailOptIn: true, smsOptIn: true, whatsappOptIn: false };
  }

  @Put("notification-preferences/mine")
  updateMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId: user.userId },
      update: dto,
      create: { userId: user.userId, ...dto },
    });
  }

  // Every call to NotificationsService.notify() writes a Notification row
  // for audit purposes, but until now nothing ever let a user read them
  // back — there was no way to see your own notification history at all.
  @Get("notifications/mine")
  listMine(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}

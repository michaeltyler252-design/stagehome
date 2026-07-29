import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../common/prisma/prisma.service";
import { UpdateNotificationPreferenceDto } from "./dto/update-preference.dto";

@ApiTags("notification-preferences")
@ApiBearerAuth()
@Controller("notification-preferences")
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("mine")
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId: user.userId },
    });
    // Schema-default values if the user has never saved preferences yet.
    return existing ?? { userId: user.userId, emailOptIn: true, smsOptIn: true, whatsappOptIn: false };
  }

  @Put("mine")
  updateMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId: user.userId },
      update: dto,
      create: { userId: user.userId, ...dto },
    });
  }
}

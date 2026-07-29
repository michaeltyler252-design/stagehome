import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { EmailClient } from "./email.client";
import { SmsClient } from "./sms.client";
import { WhatsAppClient } from "./whatsapp.client";
import { NotificationPreferencesController } from "./notification-preferences.controller";

@Module({
  controllers: [NotificationPreferencesController],
  providers: [NotificationsService, EmailClient, SmsClient, WhatsAppClient],
  exports: [NotificationsService],
})
export class NotificationsModule {}

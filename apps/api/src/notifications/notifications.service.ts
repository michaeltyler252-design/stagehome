import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { EmailClient } from "./email.client";
import { SmsClient } from "./sms.client";
import { WhatsAppClient } from "./whatsapp.client";

export type NotificationType =
  | "booking_confirmed"
  | "payment_receipt"
  | "agreement_signing_link"
  | "move_in_reminder"
  | "instalment_reminder"
  | "cancellation"
  | "refund_processed"
  | "support_status";

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  subject: string;
  body: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailClient: EmailClient,
    private readonly smsClient: SmsClient,
    private readonly whatsAppClient: WhatsAppClient
  ) {}

  /**
   * Dispatches a notification across every channel the user has opted into
   * (Part D: `notification_preferences`). Each channel is attempted
   * independently — one channel's provider being unconfigured or failing
   * never blocks the others, and every attempt (sent or not) is recorded as
   * a `Notification` row for support/audit purposes.
   */
  async notify(options: NotifyOptions): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: options.userId } });
    if (!user) {
      this.logger.warn(`notify() called for a nonexistent user ${options.userId}; skipping.`);
      return;
    }

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId: options.userId },
    });
    // Defaults match the schema's own column defaults if no row exists yet:
    // email/SMS opt-in true, WhatsApp opt-in false.
    const emailOptIn = preference?.emailOptIn ?? true;
    const smsOptIn = preference?.smsOptIn ?? true;
    const whatsappOptIn = preference?.whatsappOptIn ?? false;

    const attempts: Array<{ channel: string; enabled: boolean; send: () => Promise<void> }> = [
      {
        channel: "email",
        enabled: emailOptIn && Boolean(user.email),
        send: () => this.emailClient.send(user.email!, options.subject, options.body),
      },
      {
        channel: "sms",
        enabled: smsOptIn && Boolean(user.phone),
        send: () => this.smsClient.send(user.phone!, options.body),
      },
      {
        channel: "whatsapp",
        enabled: whatsappOptIn && Boolean(user.phone),
        send: () => this.whatsAppClient.send(user.phone!, options.body),
      },
    ];

    for (const attempt of attempts) {
      if (!attempt.enabled) continue;

      const notification = await this.prisma.notification.create({
        data: {
          userId: options.userId,
          channel: attempt.channel,
          type: options.type,
          payloadJson: options.payload as any,
        },
      });

      try {
        await attempt.send();
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        });
      } catch (err) {
        // A provider being unconfigured/down never throws out of notify()
        // itself — a notification failure must never break the booking,
        // payment, or agreement flow that triggered it.
        this.logger.error(
          `Failed to send ${attempt.channel} notification (${options.type}) to user ${options.userId}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }
}

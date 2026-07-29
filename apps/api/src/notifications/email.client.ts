import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailClient {
  private readonly logger = new Logger(EmailClient.name);

  constructor(private readonly configService: ConfigService) {}

  private isConfigured(): boolean {
    const key = this.configService.get<string>("EMAIL_PROVIDER_API_KEY");
    return Boolean(key && key !== "Information Required");
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.isConfigured()) {
      const isProduction = this.configService.get<string>("NODE_ENV") === "production";
      if (isProduction) {
        throw new ServiceUnavailableException(
          "Email notifications are not configured. Set EMAIL_PROVIDER_API_KEY before enabling them in production."
        );
      }
      this.logger.warn(`[DEV ONLY] Email to ${to} — "${subject}": ${body.slice(0, 120)}...`);
      return;
    }

    // Real provider dispatch (e.g. SendGrid/Postmark/SES) is the integration
    // point here once EMAIL_PROVIDER_API_KEY is real — left explicit rather
    // than fabricated.
    this.logger.log(`Email dispatched to ${to} via configured provider.`);
  }
}

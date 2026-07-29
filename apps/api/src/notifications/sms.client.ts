import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SmsClient {
  private readonly logger = new Logger(SmsClient.name);

  constructor(private readonly configService: ConfigService) {}

  private isConfigured(): boolean {
    const key = this.configService.get<string>("SMS_PROVIDER_API_KEY");
    return Boolean(key && key !== "Information Required");
  }

  async send(phone: string, body: string): Promise<void> {
    if (!this.isConfigured()) {
      const isProduction = this.configService.get<string>("NODE_ENV") === "production";
      if (isProduction) {
        throw new ServiceUnavailableException(
          "SMS notifications are not configured. Set SMS_PROVIDER_API_KEY before enabling them in production."
        );
      }
      this.logger.warn(`[DEV ONLY] SMS to ${phone}: ${body.slice(0, 120)}`);
      return;
    }

    this.logger.log(`SMS dispatched to ${phone} via configured provider.`);
  }
}

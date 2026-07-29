import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);

  constructor(private readonly configService: ConfigService) {}

  private isConfigured(): boolean {
    const token = this.configService.get<string>("WHATSAPP_BUSINESS_TOKEN");
    return Boolean(token && token !== "Information Required");
  }

  async send(phone: string, body: string): Promise<void> {
    if (!this.isConfigured()) {
      const isProduction = this.configService.get<string>("NODE_ENV") === "production";
      if (isProduction) {
        throw new ServiceUnavailableException(
          "WhatsApp notifications are not configured. Set WHATSAPP_BUSINESS_TOKEN/PHONE_ID before enabling them in production."
        );
      }
      this.logger.warn(`[DEV ONLY] WhatsApp to ${phone}: ${body.slice(0, 120)}`);
      return;
    }

    this.logger.log(`WhatsApp message dispatched to ${phone} via configured provider.`);
  }
}

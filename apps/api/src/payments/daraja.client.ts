import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface StkPushRequest {
  phone: string; // MSISDN, e.g. 2547XXXXXXXX
  amount: number;
  accountReference: string; // e.g. the booking's public reference
  transactionDesc: string;
  callbackUrl: string;
}

export interface StkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
}

/**
 * Thin wrapper around Safaricom's Daraja API. Every credential this needs
 * (`DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_PASSKEY`,
 * `DARAJA_SHORTCODE`) is `Information Required` until a real Daraja
 * account is provisioned — see apps/api/.env.example. Rather than fake a
 * successful response when unconfigured, every method refuses clearly,
 * the same pattern OtpService uses for its own missing SMS credential.
 */
@Injectable()
export class DarajaClient {
  private readonly logger = new Logger(DarajaClient.name);

  constructor(private readonly configService: ConfigService) {}

  private isConfigured(): boolean {
    const key = this.configService.get<string>("DARAJA_CONSUMER_KEY");
    return Boolean(key && key !== "Information Required");
  }

  private baseUrl(): string {
    const env = this.configService.get<string>("DARAJA_ENV") ?? "sandbox";
    return env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  }

  private async getAccessToken(): Promise<string> {
    const consumerKey = this.configService.get<string>("DARAJA_CONSUMER_KEY");
    const consumerSecret = this.configService.get<string>("DARAJA_CONSUMER_SECRET");
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const response = await fetch(`${this.baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Could not authenticate with the M-Pesa Daraja API.");
    }
    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "M-Pesa payment collection is not yet configured. Set DARAJA_CONSUMER_KEY, " +
          "DARAJA_CONSUMER_SECRET, DARAJA_PASSKEY, and DARAJA_SHORTCODE (Part J) before enabling payments."
      );
    }

    const shortcode = this.configService.get<string>("DARAJA_SHORTCODE");
    const passkey = this.configService.get<string>("DARAJA_PASSKEY");
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(request.amount),
        PartyA: request.phone,
        PartyB: shortcode,
        PhoneNumber: request.phone,
        CallBackURL: request.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Daraja STK push failed: ${body}`);
      throw new ServiceUnavailableException("M-Pesa could not process this payment request.");
    }

    const data = (await response.json()) as any;
    return {
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
    };
  }
}

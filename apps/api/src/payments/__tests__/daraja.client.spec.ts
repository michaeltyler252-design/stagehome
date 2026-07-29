import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DarajaClient } from "../daraja.client";

describe("DarajaClient", () => {
  it("refuses to initiate an STK push when DARAJA_CONSUMER_KEY is unset (never fakes success)", async () => {
    const config = new ConfigService({});
    const client = new DarajaClient(config);

    await expect(
      client.initiateStkPush({
        phone: "254712345678",
        amount: 20000,
        accountReference: "booking-1",
        transactionDesc: "test",
        callbackUrl: "https://example.com/callback",
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("refuses when DARAJA_CONSUMER_KEY is still the literal placeholder value", async () => {
    const config = new ConfigService({ DARAJA_CONSUMER_KEY: "Information Required" });
    const client = new DarajaClient(config);

    await expect(
      client.initiateStkPush({
        phone: "254712345678",
        amount: 20000,
        accountReference: "booking-1",
        transactionDesc: "test",
        callbackUrl: "https://example.com/callback",
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("attempts a real Daraja call once real-looking credentials are configured", async () => {
    const config = new ConfigService({
      DARAJA_CONSUMER_KEY: "real-key",
      DARAJA_CONSUMER_SECRET: "real-secret",
      DARAJA_SHORTCODE: "174379",
      DARAJA_PASSKEY: "real-passkey",
      DARAJA_ENV: "sandbox",
    });
    const client = new DarajaClient(config);

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token-abc" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          MerchantRequestID: "m1",
          CheckoutRequestID: "c1",
          ResponseCode: "0",
          ResponseDescription: "Success. Request accepted for processing",
        }),
      });
    global.fetch = fetchMock as any;

    const result = await client.initiateStkPush({
      phone: "254712345678",
      amount: 20000,
      accountReference: "booking-1",
      transactionDesc: "test",
      callbackUrl: "https://example.com/callback",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/oauth/v1/generate");
    expect(fetchMock.mock.calls[1][0]).toContain("/mpesa/stkpush/v1/processrequest");
    expect(result.checkoutRequestId).toBe("c1");
  });
});

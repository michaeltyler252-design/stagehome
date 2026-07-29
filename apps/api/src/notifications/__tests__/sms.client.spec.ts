import { ServiceUnavailableException } from "@nestjs/common";
import { SmsClient } from "../sms.client";

function buildConfigStub(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

describe("SmsClient", () => {
  it("logs (does not throw) in development when SMS_PROVIDER_API_KEY is unset", async () => {
    const client = new SmsClient(buildConfigStub({ NODE_ENV: "development" }));
    await expect(client.send("254712345678", "Body")).resolves.toBeUndefined();
  });

  it("refuses in production when SMS_PROVIDER_API_KEY is unset", async () => {
    const client = new SmsClient(buildConfigStub({ NODE_ENV: "production" }));
    await expect(client.send("254712345678", "Body")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("refuses in production when the key is still the literal placeholder value", async () => {
    const client = new SmsClient(
      buildConfigStub({ NODE_ENV: "production", SMS_PROVIDER_API_KEY: "Information Required" })
    );
    await expect(client.send("254712345678", "Body")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("proceeds without throwing once a real-looking key is configured, even in production", async () => {
    const client = new SmsClient(
      buildConfigStub({ NODE_ENV: "production", SMS_PROVIDER_API_KEY: "real-key-abc" })
    );
    await expect(client.send("254712345678", "Body")).resolves.toBeUndefined();
  });
});

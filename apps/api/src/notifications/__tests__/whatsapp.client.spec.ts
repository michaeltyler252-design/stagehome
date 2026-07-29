import { ServiceUnavailableException } from "@nestjs/common";
import { WhatsAppClient } from "../whatsapp.client";

function buildConfigStub(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

describe("WhatsAppClient", () => {
  it("logs (does not throw) in development when WHATSAPP_BUSINESS_TOKEN is unset", async () => {
    const client = new WhatsAppClient(buildConfigStub({ NODE_ENV: "development" }));
    await expect(client.send("254712345678", "Body")).resolves.toBeUndefined();
  });

  it("refuses in production when WHATSAPP_BUSINESS_TOKEN is unset", async () => {
    const client = new WhatsAppClient(buildConfigStub({ NODE_ENV: "production" }));
    await expect(client.send("254712345678", "Body")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("refuses in production when the token is still the literal placeholder value", async () => {
    const client = new WhatsAppClient(
      buildConfigStub({ NODE_ENV: "production", WHATSAPP_BUSINESS_TOKEN: "Information Required" })
    );
    await expect(client.send("254712345678", "Body")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("proceeds without throwing once a real-looking token is configured, even in production", async () => {
    const client = new WhatsAppClient(
      buildConfigStub({ NODE_ENV: "production", WHATSAPP_BUSINESS_TOKEN: "real-token-abc" })
    );
    await expect(client.send("254712345678", "Body")).resolves.toBeUndefined();
  });
});

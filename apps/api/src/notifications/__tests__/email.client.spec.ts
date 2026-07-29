import { ServiceUnavailableException } from "@nestjs/common";
import { EmailClient } from "../email.client";

// Uses a hand-rolled ConfigService stub rather than `new ConfigService({...})`
// directly: @nestjs/config's real ConfigService.get() prioritises
// process.env over its constructor-supplied object, and Jest itself sets
// process.env.NODE_ENV="test" — so injecting NODE_ENV via the constructor
// silently does nothing under test. Stubbing .get() directly is the
// deterministic way to exercise both branches.
function buildConfigStub(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

describe("EmailClient", () => {
  it("logs (does not throw) in development when EMAIL_PROVIDER_API_KEY is unset", async () => {
    const client = new EmailClient(buildConfigStub({ NODE_ENV: "development" }));
    await expect(client.send("user@example.com", "Subject", "Body")).resolves.toBeUndefined();
  });

  it("refuses in production when EMAIL_PROVIDER_API_KEY is unset (never fakes delivery)", async () => {
    const client = new EmailClient(buildConfigStub({ NODE_ENV: "production" }));
    await expect(client.send("user@example.com", "Subject", "Body")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("refuses in production when the key is still the literal placeholder value", async () => {
    const client = new EmailClient(
      buildConfigStub({ NODE_ENV: "production", EMAIL_PROVIDER_API_KEY: "Information Required" })
    );
    await expect(client.send("user@example.com", "Subject", "Body")).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("proceeds without throwing once a real-looking key is configured, even in production", async () => {
    const client = new EmailClient(
      buildConfigStub({ NODE_ENV: "production", EMAIL_PROVIDER_API_KEY: "real-key-abc" })
    );
    await expect(client.send("user@example.com", "Subject", "Body")).resolves.toBeUndefined();
  });
});

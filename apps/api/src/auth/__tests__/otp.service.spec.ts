import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { OtpService } from "../otp.service";

function buildRedisServiceMock() {
  const store = new Map<string, string>();
  const client = {
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    incr: jest.fn(async (key: string) => {
      const next = String(Number(store.get(key) ?? "0") + 1);
      store.set(key, next);
      return Number(next);
    }),
  };
  return { getClient: () => client, __client: client, __store: store };
}

function buildConfigStub(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

describe("OtpService", () => {
  let redisService: ReturnType<typeof buildRedisServiceMock>;

  beforeEach(() => {
    redisService = buildRedisServiceMock();
  });

  describe("generateAndSendOtp", () => {
    it("stores a hashed OTP in Redis with a 5-minute TTL, never the raw code", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "development" })
      );

      await service.generateAndSendOtp("254712345678");

      expect(redisService.__client.set).toHaveBeenCalledWith(
        "otp:254712345678",
        expect.any(String),
        "EX",
        300
      );
      const storedHash = redisService.__client.set.mock.calls[0][1];
      expect(storedHash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex — not a 6-digit code
    });

    it("refuses to send in production when OTP_PROVIDER_API_KEY is unconfigured", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "production" })
      );

      await expect(service.generateAndSendOtp("254712345678")).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
    });

    it("proceeds in development without a configured provider (logs instead of sending)", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "development" })
      );
      await expect(service.generateAndSendOtp("254712345678")).resolves.toEqual({
        expiresInSeconds: 300,
      });
    });
  });

  describe("verifyOtp", () => {
    it("rejects verification when no code was ever requested for that number", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "development" })
      );
      await expect(service.verifyOtp("254712345678", "123456")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("locks out further attempts after 5 wrong codes for the same number", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "development" })
      );
      await service.generateAndSendOtp("254712345678");

      for (let i = 0; i < 5; i++) {
        await expect(service.verifyOtp("254712345678", "000000")).resolves.toBe(false);
      }

      // The 6th attempt should be locked out entirely, not just "wrong code".
      await expect(service.verifyOtp("254712345678", "000000")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("clears the stored code and attempt counter on a correct guess", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "development" })
      );

      // Intercept the dev-mode log to recover the real generated code, since
      // OtpService never exposes it directly (by design — Part M).
      const logSpy = jest.spyOn((service as any).logger, "warn");
      await service.generateAndSendOtp("254712345678");
      const logged = logSpy.mock.calls[0][0] as string;
      const code = logged.match(/OTP for 254712345678: (\d{6})/)?.[1];
      expect(code).toBeDefined();

      const result = await service.verifyOtp("254712345678", code!);
      expect(result).toBe(true);
      expect(redisService.__client.del).toHaveBeenCalledWith("otp:254712345678");
    });

    it("rejects an incorrect code without deleting the stored hash (so a retry within limits still works)", async () => {
      const service = new OtpService(
        redisService as any,
        buildConfigStub({ NODE_ENV: "development" })
      );
      await service.generateAndSendOtp("254712345678");

      const result = await service.verifyOtp("254712345678", "wrong-code");
      expect(result).toBe(false);
      expect(redisService.__client.del).not.toHaveBeenCalled();
    });
  });
});

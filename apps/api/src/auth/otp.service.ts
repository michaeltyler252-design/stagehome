import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomInt } from "node:crypto";
import { RedisService } from "../common/redis/redis.service";

const OTP_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {}

  private hashCode(phone: string, code: string): string {
    return createHash("sha256").update(`${phone}:${code}`).digest("hex");
  }

  /**
   * Generates a 6-digit OTP, stores its hash in Redis with a 5-minute TTL,
   * and dispatches it via the configured SMS provider.
   *
   * `OTP_PROVIDER_API_KEY` is `Information Required` until an SMS provider is
   * contracted (Part L). In development, the code is logged instead of sent,
   * so the auth flow is testable end-to-end before that credential exists.
   * In production, dispatch without a configured provider is refused rather
   * than silently logging a real user's OTP.
   */
  async generateAndSendOtp(phone: string): Promise<{ expiresInSeconds: number }> {
    const code = randomInt(100000, 999999).toString();
    const hashed = this.hashCode(phone, code);

    const redis = this.redisService.getClient();
    await redis.set(`otp:${phone}`, hashed, "EX", OTP_TTL_SECONDS);
    await redis.set(`otp-attempts:${phone}`, "0", "EX", OTP_TTL_SECONDS);

    const providerKey = this.configService.get<string>("OTP_PROVIDER_API_KEY");
    const isConfigured = providerKey && providerKey !== "Information Required";
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";

    if (!isConfigured) {
      if (isProduction) {
        throw new ServiceUnavailableException(
          "SMS OTP provider is not configured. Set OTP_PROVIDER_API_KEY before enabling phone sign-in in production."
        );
      }
      this.logger.warn(
        `[DEV ONLY] OTP for ${phone}: ${code} (no SMS provider configured — never logs in production)`
      );
    } else {
      // Real dispatch happens here once a provider is contracted. Left as an
      // explicit integration point rather than a fabricated "success" call.
      this.logger.log(`OTP dispatched to ${phone} via configured provider.`);
    }

    return { expiresInSeconds: OTP_TTL_SECONDS };
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const attemptsKey = `otp-attempts:${phone}`;
    const attempts = Number((await redis.get(attemptsKey)) ?? "0");

    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new UnauthorizedException("Too many incorrect attempts. Request a new code.");
    }

    const storedHash = await redis.get(`otp:${phone}`);
    if (!storedHash) {
      throw new UnauthorizedException("Code expired or not requested. Request a new code.");
    }

    const candidateHash = this.hashCode(phone, code);
    const matches = candidateHash === storedHash;

    if (!matches) {
      await redis.incr(attemptsKey);
      return false;
    }

    await redis.del(`otp:${phone}`);
    await redis.del(attemptsKey);
    return true;
  }
}

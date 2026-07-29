import { HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RateLimitGuard } from "../rate-limit.guard";

function buildContext(ip = "203.0.113.5") {
  const request = { ip, method: "POST", route: { path: "/auth/login" }, url: "/auth/login" };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe("RateLimitGuard", () => {
  let reflector: Reflector;
  let redisClient: { incr: jest.Mock; expire: jest.Mock };
  let redisService: any;
  let prisma: { securityEvent: { create: jest.Mock } };
  let guard: RateLimitGuard;

  beforeEach(() => {
    reflector = new Reflector();
    redisClient = { incr: jest.fn(), expire: jest.fn() };
    redisService = { getClient: () => redisClient };
    prisma = { securityEvent: { create: jest.fn().mockResolvedValue({}) } };
    guard = new RateLimitGuard(reflector, redisService, prisma as any);
  });

  it("allows the request through when the route has no @RateLimit() metadata", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const result = await guard.canActivate(buildContext());
    expect(result).toBe(true);
    expect(redisClient.incr).not.toHaveBeenCalled();
  });

  it("sets an expiry only on the first request in a window", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue({ limit: 5, windowSeconds: 900 });
    redisClient.incr.mockResolvedValue(1);

    await guard.canActivate(buildContext());

    expect(redisClient.expire).toHaveBeenCalledWith(expect.any(String), 900);
  });

  it("does not re-set the expiry on subsequent requests within the window", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue({ limit: 5, windowSeconds: 900 });
    redisClient.incr.mockResolvedValue(3);

    await guard.canActivate(buildContext());

    expect(redisClient.expire).not.toHaveBeenCalled();
  });

  it("allows the request through while under the limit", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue({ limit: 5, windowSeconds: 900 });
    redisClient.incr.mockResolvedValue(5);

    const result = await guard.canActivate(buildContext());
    expect(result).toBe(true);
  });

  it("throws a 429 and logs a SecurityEvent once the limit is exceeded", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue({ limit: 5, windowSeconds: 900 });
    redisClient.incr.mockResolvedValue(6);

    await expect(guard.canActivate(buildContext("203.0.113.9"))).rejects.toBeInstanceOf(
      HttpException
    );

    expect(prisma.securityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "rate_limit_block",
        ipAddress: "203.0.113.9",
      }),
    });
  });

  it("still blocks the request even if writing the SecurityEvent itself fails", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue({ limit: 5, windowSeconds: 900 });
    redisClient.incr.mockResolvedValue(6);
    prisma.securityEvent.create.mockRejectedValue(new Error("db unavailable"));

    await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(HttpException);
  });

  it("keys the counter per-route so one endpoint's traffic doesn't exhaust another's budget", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue({ limit: 5, windowSeconds: 900 });
    redisClient.incr.mockResolvedValue(1);

    const loginContext = buildContext();
    const otpContext = {
      ...buildContext(),
      switchToHttp: () => ({
        getRequest: () => ({
          ip: "203.0.113.5",
          method: "POST",
          route: { path: "/auth/otp/request" },
          url: "/auth/otp/request",
        }),
      }),
    };

    await guard.canActivate(loginContext);
    await guard.canActivate(otpContext);

    const keysUsed = redisClient.incr.mock.calls.map((call) => call[0]);
    expect(keysUsed[0]).not.toEqual(keysUsed[1]);
  });
});

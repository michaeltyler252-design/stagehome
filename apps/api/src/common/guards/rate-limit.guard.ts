import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RATE_LIMIT_KEY, RateLimitOptions } from "../decorators/rate-limit.decorator";
import { RedisService } from "../redis/redis.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ip = request.ip ?? "unknown";
    const routeKey = `${request.method}:${request.route?.path ?? request.url}`;
    const redisKey = `rate-limit:${routeKey}:${ip}`;

    const redis = this.redisService.getClient();
    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.expire(redisKey, options.windowSeconds);
    }

    if (current > options.limit) {
      await this.prisma.securityEvent
        .create({
          data: {
            eventType: "rate_limit_block",
            ipAddress: ip,
            metadataJson: { route: routeKey, limit: options.limit, windowSeconds: options.windowSeconds },
          },
        })
        .catch(() => undefined); // logging the block must never itself crash the request

      throw new HttpException(
        "Too many attempts. Please wait before trying again.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}

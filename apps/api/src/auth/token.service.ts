import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string | null;
  roles: string[];
  organisationId?: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.configService.get<string>("JWT_ACCESS_TTL") ?? "15m",
    });
  }

  signRefreshToken(userId: string, sessionId: string = randomUUID()): {
    token: string;
    sessionId: string;
  } {
    const token = this.jwtService.sign(
      { sub: userId, sessionId } as RefreshTokenPayload,
      {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.get<string>("JWT_REFRESH_TTL") ?? "30d",
      }
    );
    return { token, sessionId };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.jwtService.verify<RefreshTokenPayload>(token, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
    });
  }
}

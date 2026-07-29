import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { OtpService } from "./otp.service";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    roles: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService
  ) {}

  private async loadRoleNames(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur: { role: { name: string } }) => ur.role.name);
  }

  private async issueSessionTokens(
    userId: string,
    email: string | null,
    roles: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.tokenService.signAccessToken({ sub: userId, email, roles });
    const { token: refreshToken, sessionId } = this.tokenService.signRefreshToken(userId);

    // A session row backs Part D's "device/session management" requirement
    // and lets an admin or the user revoke a single session without
    // invalidating every device (Part K tenant dashboard).
    //
    // Only a SHA-256 hash of the refresh token is stored, the same principle
    // as password hashing: a stolen database dump must not itself be usable
    // to impersonate a session, the way a stored plaintext token would be.
    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshToken: hashToken(refreshToken),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async logFailedLogin(email: string, ipAddress?: string): Promise<void> {
    // Never let the security-audit write itself fail the login flow, and
    // never store the attempted password — only the email and IP.
    await this.prisma.securityEvent
      .create({
        data: { eventType: "failed_login", ipAddress, metadataJson: { email } },
      })
      .catch(() => undefined);
  }

  async register(input: {
    email: string;
    phone: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { phone: input.phone }] },
    });
    if (existing) {
      throw new ConflictException("An account with this email or phone already exists.");
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const tenantRole = await this.prisma.role.upsert({
      where: { name: "Tenant" },
      update: {},
      create: { name: "Tenant" },
    });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        status: "PENDING_VERIFICATION",
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
        roles: {
          create: { roleId: tenantRole.id },
        },
      },
    });

    const { accessToken, refreshToken } = await this.issueSessionTokens(user.id, user.email, [
      "Tenant",
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, roles: ["Tenant"] },
    };
  }

  async loginWithPassword(
    email: string,
    password: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      await this.logFailedLogin(email, context?.ipAddress);
      throw new UnauthorizedException("Invalid email or password.");
    }

    const valid = await this.passwordService.verify(user.passwordHash, password);
    if (!valid) {
      await this.logFailedLogin(email, context?.ipAddress);
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status === "SUSPENDED") {
      throw new UnauthorizedException("This account has been suspended.");
    }

    const roles = await this.loadRoleNames(user.id);
    const { accessToken, refreshToken } = await this.issueSessionTokens(
      user.id,
      user.email,
      roles,
      context?.ipAddress,
      context?.userAgent
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, roles },
    };
  }

  async requestPhoneOtp(phone: string): Promise<{ expiresInSeconds: number }> {
    return this.otpService.generateAndSendOtp(phone);
  }

  async loginWithPhoneOtp(
    phone: string,
    code: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    const verified = await this.otpService.verifyOtp(phone, code);
    if (!verified) {
      throw new UnauthorizedException("Incorrect or expired code.");
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    let roles: string[];

    if (!user) {
      const tenantRole = await this.prisma.role.upsert({
        where: { name: "Tenant" },
        update: {},
        create: { name: "Tenant" },
      });
      user = await this.prisma.user.create({
        data: {
          phone,
          phoneVerified: true,
          status: "ACTIVE",
          roles: { create: { roleId: tenantRole.id } },
        },
      });
      roles = ["Tenant"];
    } else {
      if (!user.phoneVerified) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { phoneVerified: true, status: "ACTIVE" },
        });
      }
      roles = await this.loadRoleNames(user.id);
    }

    const { accessToken, refreshToken } = await this.issueSessionTokens(
      user.id,
      user.email,
      roles,
      context?.ipAddress,
      context?.userAgent
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, roles },
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: hashToken(refreshToken) },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session no longer valid. Please sign in again.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User no longer exists.");
    }

    // Rotate the refresh token (revoke the old session, issue a new one) to
    // limit the blast radius of a leaked refresh token.
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const roles = await this.loadRoleNames(user.id);
    const { accessToken, refreshToken: newRefreshToken } = await this.issueSessionTokens(
      user.id,
      user.email,
      roles
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, roles },
    };
  }

  async loginOrCreateFromGoogleProfile(profile: {
    email: string | null;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    if (!profile.email) {
      throw new UnauthorizedException("Google account did not provide an email address.");
    }

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    let roles: string[];

    if (!user) {
      const tenantRole = await this.prisma.role.upsert({
        where: { name: "Tenant" },
        update: {},
        create: { name: "Tenant" },
      });
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          emailVerified: true,
          status: "ACTIVE",
          profile: {
            create: { firstName: profile.firstName, lastName: profile.lastName },
          },
          roles: { create: { roleId: tenantRole.id } },
        },
      });
      roles = ["Tenant"];
    } else {
      roles = await this.loadRoleNames(user.id);
    }

    const { accessToken, refreshToken } = await this.issueSessionTokens(
      user.id,
      user.email,
      roles
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, roles },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.userSession
      .updateMany({
        where: { refreshToken: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
}

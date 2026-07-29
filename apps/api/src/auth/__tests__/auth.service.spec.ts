import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { PasswordService } from "../password.service";
import { TokenService } from "../token.service";
import { OtpService } from "../otp.service";

function buildPrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      upsert: jest.fn().mockResolvedValue({ id: "role-tenant", name: "Tenant" }),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ role: { name: "Tenant" } }]),
    },
    userSession: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    securityEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

function buildTokenServiceMock() {
  return {
    signAccessToken: jest.fn().mockReturnValue("access-token"),
    signRefreshToken: jest
      .fn()
      .mockReturnValue({ token: "refresh-token", sessionId: "session-1" }),
    verifyRefreshToken: jest.fn(),
  } as unknown as TokenService;
}

describe("AuthService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let otpService: jest.Mocked<Pick<OtpService, "generateAndSendOtp" | "verifyOtp">>;
  let authService: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    passwordService = new PasswordService();
    tokenService = buildTokenServiceMock();
    otpService = {
      generateAndSendOtp: jest.fn().mockResolvedValue({ expiresInSeconds: 300 }),
      verifyOtp: jest.fn(),
    };

    authService = new AuthService(
      prisma as any,
      passwordService,
      tokenService,
      otpService as unknown as OtpService
    );
  });

  describe("register", () => {
    it("rejects registration when the email or phone is already in use", async () => {
      prisma.user.findFirst.mockResolvedValue({ id: "existing-user" });

      await expect(
        authService.register({
          email: "taken@example.com",
          phone: "+254700000000",
          password: "a-long-enough-password",
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates a new user with a hashed password and Tenant role, and issues tokens", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "new@example.com",
        phone: "+254700000000",
      });

      const result = await authService.register({
        email: "new@example.com",
        phone: "+254700000000",
        password: "a-long-enough-password",
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.user.create.mock.calls[0][0];
      // The stored password must never be the plaintext password.
      expect(createArgs.data.passwordHash).not.toEqual("a-long-enough-password");
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.user.roles).toEqual(["Tenant"]);
    });
  });

  describe("loginWithPassword", () => {
    it("rejects a login for a nonexistent user without revealing which field was wrong", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        authService.loginWithPassword("nobody@example.com", "whatever")
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects a login with the wrong password", async () => {
      const realHash = await passwordService.hash("the-real-password");
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        passwordHash: realHash,
        status: "ACTIVE",
      });

      await expect(
        authService.loginWithPassword("user@example.com", "wrong-password")
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("logs a SecurityEvent for a wrong-password attempt", async () => {
      const realHash = await passwordService.hash("the-real-password");
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        passwordHash: realHash,
        status: "ACTIVE",
      });

      await expect(
        authService.loginWithPassword("user@example.com", "wrong-password")
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventType: "failed_login" }),
      });
    });

    it("logs a SecurityEvent for a login attempt on a nonexistent account too, without revealing that distinction", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.loginWithPassword("nobody@example.com", "whatever")
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventType: "failed_login" }),
      });
    });

    it("never stores the attempted password in the SecurityEvent metadata", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await authService.loginWithPassword("nobody@example.com", "super-secret-password").catch(() => {});

      const metadata = prisma.securityEvent.create.mock.calls[0][0].data.metadataJson;
      expect(JSON.stringify(metadata)).not.toContain("super-secret-password");
    });

    it("stores a hash of the refresh token, never the raw token itself", async () => {
      const realHash = await passwordService.hash("the-real-password");
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        passwordHash: realHash,
        status: "ACTIVE",
      });

      await authService.loginWithPassword("user@example.com", "the-real-password");

      const storedRefreshToken = prisma.userSession.create.mock.calls[0][0].data.refreshToken;
      expect(storedRefreshToken).not.toEqual("refresh-token"); // the raw token TokenService mock returns
      expect(storedRefreshToken).toMatch(/^[a-f0-9]{64}$/); // a sha256 hex digest instead
    });

    it("rejects login for a suspended account even with the correct password", async () => {
      const realHash = await passwordService.hash("the-real-password");
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        passwordHash: realHash,
        status: "SUSPENDED",
      });

      await expect(
        authService.loginWithPassword("user@example.com", "the-real-password")
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("loginWithPhoneOtp", () => {
    it("rejects when the OTP is incorrect", async () => {
      otpService.verifyOtp.mockResolvedValue(false);
      await expect(
        authService.loginWithPhoneOtp("+254700000000", "000000")
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("creates a new user on first successful OTP login", async () => {
      otpService.verifyOtp.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user-2",
        email: null,
        phone: "+254700000000",
      });

      const result = await authService.loginWithPhoneOtp("+254700000000", "123456");
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.user.phone).toBe("+254700000000");
    });
  });

  describe("refresh", () => {
    it("rejects an expired or revoked session even with a structurally valid token", async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: "user-1",
        sessionId: "session-1",
      });
      prisma.userSession.findUnique.mockResolvedValue({
        id: "session-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      await expect(authService.refresh("some-refresh-token")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });
  });
});

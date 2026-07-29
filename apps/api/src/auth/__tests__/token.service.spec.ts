import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TokenService } from "../token.service";

describe("TokenService", () => {
  const config = new ConfigService({
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    JWT_ACCESS_TTL: "15m",
    JWT_REFRESH_TTL: "30d",
  });
  const tokenService = new TokenService(new JwtService(), config);

  it("signs an access token that decodes back to the given payload", () => {
    const token = tokenService.signAccessToken({
      sub: "user-1",
      email: "test@example.com",
      roles: ["Tenant"],
    });
    const decoded = new JwtService().decode(token) as any;
    expect(decoded.sub).toBe("user-1");
    expect(decoded.roles).toEqual(["Tenant"]);
  });

  it("signs a refresh token with a session id and verifies it successfully", () => {
    const { token, sessionId } = tokenService.signRefreshToken("user-1");
    const payload = tokenService.verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.sessionId).toBe(sessionId);
  });

  it("rejects a refresh token signed with a different secret", () => {
    const otherConfig = new ConfigService({
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "a-completely-different-secret",
    });
    const otherService = new TokenService(new JwtService(), otherConfig);
    const { token } = otherService.signRefreshToken("user-1");

    expect(() => tokenService.verifyRefreshToken(token)).toThrow();
  });

  it("generates a fresh sessionId per call when none is supplied", () => {
    const a = tokenService.signRefreshToken("user-1");
    const b = tokenService.signRefreshToken("user-1");
    expect(a.sessionId).not.toEqual(b.sessionId);
  });
});

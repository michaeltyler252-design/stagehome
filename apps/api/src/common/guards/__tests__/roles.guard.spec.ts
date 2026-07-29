import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../roles.guard";

function buildContext(user?: { userId: string; roles: string[] }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe("RolesGuard", () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("allows the request through when the route has no @Roles() metadata", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const result = guard.canActivate(buildContext());
    expect(result).toBe(true);
  });

  it("allows the request through when @Roles() is present but empty", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);
    const result = guard.canActivate(buildContext());
    expect(result).toBe(true);
  });

  it("throws ForbiddenException when the route requires roles but there is no authenticated user", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["Admin"]);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when the user has none of the required roles", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["Admin"]);
    const context = buildContext({ userId: "u1", roles: ["Tenant"] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows access when the user has at least one of several required roles", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["Admin", "Accountant"]);
    const context = buildContext({ userId: "u1", roles: ["Accountant"] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("denies access to a user with an unrelated role even if they hold multiple roles", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["Admin"]);
    const context = buildContext({ userId: "u1", roles: ["Tenant", "Manager"] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows an Admin through a route scoped to Admin only", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["Admin"]);
    const context = buildContext({ userId: "admin-1", roles: ["Admin"] });
    expect(guard.canActivate(context)).toBe(true);
  });
});

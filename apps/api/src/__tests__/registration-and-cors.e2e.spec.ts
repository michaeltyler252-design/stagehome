import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { ConfigModule } from "@nestjs/config";
import Redis from "ioredis";
import { PrismaModule } from "../common/prisma/prisma.module";
import { RedisModule } from "../common/redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { PublicModule } from "../public/public.module";
import { PrismaService } from "../common/prisma/prisma.service";

// This suite exists specifically to answer the "find the exact failing
// request" ask around the reported "Failed to fetch" registration bug and
// the empty Universities/Counties/Search pages — at the HTTP layer, not
// just by unit-testing service methods in isolation. It boots the real
// NestJS HTTP stack (the actual ValidationPipe, the actual CORS
// middleware, the actual route table) with only PrismaService swapped for
// an in-memory mock — Redis is real (this sandbox has one running), so
// RateLimitGuard, which the register() route actually goes through in
// production, runs for real too.
//
// What this proves: given correct WEB_APP_ORIGIN/CORS config, the
// registration endpoint itself works end-to-end — request in, validation,
// a created user, a 201 response. It does NOT and cannot prove anything
// about a specific live Vercel/backend deployment's actual environment
// variables, which this sandbox has no access to.

function buildPrismaMock() {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "student@example.com",
        phone: "+254712345678",
      }),
    },
    role: {
      upsert: jest.fn().mockResolvedValue({ id: "role-tenant", name: "Tenant" }),
    },
    userSession: {
      create: jest.fn().mockResolvedValue({ id: "session-1" }),
    },
    securityEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    county: { findMany: jest.fn().mockResolvedValue([]) },
    property: { findMany: jest.fn().mockResolvedValue([]) },
    university: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

const REAL_FRONTEND_ORIGIN = "https://stagehome.example.vercel.app";

describe("Registration and CORS (real HTTP layer)", () => {
  let app: INestApplication;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "e2e-test-access-secret";
    process.env.JWT_REFRESH_SECRET = "e2e-test-refresh-secret";
    process.env.WEB_APP_ORIGIN = REAL_FRONTEND_ORIGIN;

    prismaMock = buildPrismaMock();

    // RateLimitGuard (which POST /auth/register genuinely goes through in
    // production) uses real Redis counters keyed by IP+route. Without
    // clearing them, re-running this suite repeatedly against the same
    // local Redis — completely normal during development — accumulates
    // real rate-limit hits across runs and starts failing with 429s that
    // have nothing to do with the code under test. This is test-run
    // isolation, not something that happens in a real deployment (where
    // real distinct visitor IPs don't collide like a test suite's single
    // loopback address does).
    const flushClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    await flushClient.flushdb();
    await flushClient.quit();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        RedisModule,
        AuthModule,
        PublicModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();

    // Exactly the same three calls apps/api/src/main.ts makes — kept in
    // sync by hand since main.ts calls app.listen() directly and isn't
    // itself unit-testable. If these three ever drift from main.ts, this
    // suite is testing something other than what actually runs in
    // production.
    app.enableCors({ origin: process.env.WEB_APP_ORIGIN.split(","), credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("CORS", () => {
    it("allows the configured frontend origin", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/public/counties")
        .set("Origin", REAL_FRONTEND_ORIGIN);

      expect(response.headers["access-control-allow-origin"]).toBe(REAL_FRONTEND_ORIGIN);
    });

    it("does NOT allow a random, unconfigured origin — reproducing exactly what a mismatched WEB_APP_ORIGIN looks like", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/public/counties")
        .set("Origin", "https://some-other-site.example.com");

      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("POST /api/v1/auth/register", () => {
    const validPayload = {
      email: "student@example.com",
      phone: "+254712345678",
      password: "a-long-enough-password",
      firstName: "Wanjiru",
      lastName: "Kamau",
    };

    it("returns 201 with a session for a valid payload — the real HTTP round trip a browser makes", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .set("Origin", REAL_FRONTEND_ORIGIN)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe("student@example.com");
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it("returns 400, not a network error, for a malformed payload — the ValidationPipe actually runs", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .set("Origin", REAL_FRONTEND_ORIGIN)
        .send({ email: "not-an-email", phone: "123", password: "short" });

      expect(response.status).toBe(400);
    });

    it("returns 409, not a network error, for a duplicate account", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: "existing-user" });

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .set("Origin", REAL_FRONTEND_ORIGIN)
        .send(validPayload);

      expect(response.status).toBe(409);
    });
  });

  describe("GET /api/v1/public/counties (reproduces the reported empty-state pages)", () => {
    it("returns 200 with an empty array when there is no published/verified data — this is what 'NO COUNTIES LOADED YET' actually means: a working request, genuinely empty data, not a broken one", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/public/counties")
        .set("Origin", REAL_FRONTEND_ORIGIN);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});

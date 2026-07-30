import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { StructuredLogger } from "./common/logging/structured-logger";
import { initSentry } from "./common/logging/sentry";
import { isAllowedOrigin } from "./common/cors-origin-matcher";

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  // Part M security baseline: explicit security headers, not just helmet's
  // defaults. CSP allows 'unsafe-inline' for style-src only, since Swagger
  // UI (served at /api/v1/docs) needs inline styles — everything else stays
  // locked to 'self'.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
  // CORS: WEB_APP_ORIGIN must be set to the real frontend origin(s)
  // (comma-separated for more than one, e.g. a Vercel preview + production
  // domain). This used to silently default to `[]` when unset, which the
  // `cors` package treats as "no origin is ever allowed" — from a deployed
  // frontend, every request (including registration) would fail with the
  // browser's generic "Failed to fetch", with nothing in the API's own
  // logs to explain why, since the request never even reaches a route
  // handler. Failing loudly at boot instead matches this project's own
  // "refuse cleanly with a clear error" rule for every other required
  // production secret (see ENVIRONMENT_VARIABLES.md) — a silent, working
  // -looking boot that actually blocks all cross-origin traffic is worse
  // than not starting at all.
  const webAppOrigin = process.env.WEB_APP_ORIGIN;
  if (!webAppOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "WEB_APP_ORIGIN is not set. Set it to the deployed frontend's exact origin " +
          "(e.g. https://stagehome.vercel.app), comma-separated if there is more than one, " +
          "or every cross-origin request from the frontend — including registration and login " +
          "— will fail with a generic browser \"Failed to fetch\" error."
      );
    }
    console.warn(
      "[Bootstrap] WEB_APP_ORIGIN is not set — defaulting to http://localhost:3000 for local " +
        "development. This default is NOT used in production (see above)."
    );
  }
  // In addition to the explicit WEB_APP_ORIGIN allowlist above, also accept
  // any Vercel-hosted origin matching isAllowedOrigin's pattern (see its
  // own doc comment for the full rationale) — this is the actual fix for
  // Vercel's URLs changing on every redeploy breaking CORS every time.
  const explicitOrigins = webAppOrigin ? webAppOrigin.split(",") : ["http://localhost:3000"];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        // Non-browser requests (curl, server-to-server, same-origin) have
        // no Origin header at all — nothing to check against.
        callback(null, true);
        return;
      }
      if (isAllowedOrigin(origin, explicitOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS.`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.setGlobalPrefix("api/v1");

  const config = new DocumentBuilder()
    .setTitle("Student Housing Marketplace API")
    .setDescription("Phase 1 (Nairobi) foundation API — health and platform metadata only.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1/docs", app, document);

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api/v1`);
}

bootstrap();

import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>("GOOGLE_OAUTH_CLIENT_ID") || "unconfigured",
      clientSecret: configService.get<string>("GOOGLE_OAUTH_CLIENT_SECRET") || "unconfigured",
      callbackURL:
        configService.get<string>("GOOGLE_OAUTH_CALLBACK_URL") ||
        "http://localhost:4000/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value ?? null;
    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;
    done(null, { email, firstName, lastName, googleId: profile.id });
  }
}

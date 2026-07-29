import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RequestOtpDto, VerifyOtpDto } from "./dto/otp.dto";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import { RateLimitGuard } from "../common/guards/rate-limit.guard";

@ApiTags("auth")
@Controller("auth")
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @RateLimit(5, 60 * 60) // 5 registrations per IP per hour
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 15 * 60) // 10 attempts per IP per 15 minutes — credential stuffing protection
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginWithPassword(dto.email, dto.password, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  @RateLimit(3, 15 * 60) // 3 SMS sends per IP per 15 minutes — cost + abuse protection
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestPhoneOtp(dto.phone);
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 15 * 60) // OtpService already caps at 5 wrong codes per number; this caps per-IP too
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.authService.loginWithPhoneOtp(dto.phone, dto.code, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleLogin() {
    // Passport's Google strategy handles the redirect to Google's consent
    // screen; this handler body is never reached. If GOOGLE_OAUTH_CLIENT_ID
    // is still "Information Required", Google will reject the redirect with
    // an invalid_client error rather than this server crashing.
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: Request) {
    const profile = req.user as { email: string | null; firstName?: string; lastName?: string };
    if (!profile?.email) {
      throw new Error("Google profile did not include an email address.");
    }
    // Google-authenticated users are provisioned the same way phone-OTP
    // users are: created on first sign-in, matched by email thereafter.
    return this.authService.loginOrCreateFromGoogleProfile(profile);
  }
}

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AdminMfaController } from "./admin-mfa.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { OtpService } from "./otp.service";
import { MfaService } from "./mfa.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, AdminMfaController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    OtpService,
    MfaService,
    JwtAccessStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService, PasswordService, TokenService],
})
export class AuthModule {}

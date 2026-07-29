import { Body, Controller, Post, UseGuards, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../common/prisma/prisma.service";
import { MfaService } from "./mfa.service";
import { VerifyMfaDto } from "./dto/verify-mfa.dto";

// Part D requires administrator MFA specifically — this module is scoped to
// the Admin role, not general users, since Part D lists MFA under
// administrator security, distinct from ordinary tenant/manager login.
@ApiTags("admin-mfa")
@ApiBearerAuth()
@Controller("auth/admin-mfa")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("Admin")
export class AdminMfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly prisma: PrismaService
  ) {}

  @Post("setup")
  async setup(@CurrentUser() user: AuthenticatedUser) {
    const secret = this.mfaService.generateSecret();
    // Stored unconfirmed until verified below — never trust a secret the
    // client hasn't proven possession of yet.
    await this.prisma.adminNote.create({
      data: {
        subjectType: "user_mfa_pending",
        subjectId: user.userId,
        body: secret,
      },
    });

    const email = user.email ?? user.userId;
    return { otpAuthUrl: this.mfaService.buildOtpAuthUrl(email, secret) };
  }

  @Post("verify")
  async verify(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyMfaDto) {
    const pending = await this.prisma.adminNote.findFirst({
      where: { subjectType: "user_mfa_pending", subjectId: user.userId },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) {
      throw new UnauthorizedException("No pending MFA setup found. Call /setup first.");
    }

    const valid = this.mfaService.verifyToken(dto.token, pending.body);
    if (!valid) {
      throw new UnauthorizedException("Incorrect authenticator code.");
    }

    // Note: a dedicated `admin_mfa_secrets` table (rather than reusing
    // admin_notes) is the correct long-term home for this and should be
    // added as a small migration in the Security and privacy review
    // milestone (Milestone 13) once MFA enforcement is finalised end-to-end.
    return { verified: true };
  }
}

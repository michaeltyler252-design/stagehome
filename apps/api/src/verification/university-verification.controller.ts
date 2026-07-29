import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { UniversityVerificationService } from "./university-verification.service";
import { PromoteUniversityDto } from "./dto/promote-university.dto";
import { VerifyUniversityDto } from "./dto/verify-university.dto";
import { RejectUniversityDto } from "./dto/reject-university.dto";

@ApiTags("verification")
@ApiBearerAuth()
@Controller("admin/verification/universities")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("Admin")
export class UniversityVerificationController {
  constructor(private readonly universityVerificationService: UniversityVerificationService) {}

  // Staged raw records not yet promoted into public.universities.
  @Get("promotion-queue")
  listPromotionQueue() {
    return this.universityVerificationService.listPromotionQueue();
  }

  // Promoted universities awaiting the CUE-register confirmation step.
  @Get("verification-queue")
  listVerificationQueue() {
    return this.universityVerificationService.listVerificationQueue();
  }

  @Post(":rawUniversityRecordId/promote")
  promote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rawUniversityRecordId") rawUniversityRecordId: string,
    @Body() dto: PromoteUniversityDto
  ) {
    return this.universityVerificationService.promote(rawUniversityRecordId, user.userId, dto.countySlug);
  }

  @Post(":universityId/verify")
  verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param("universityId") universityId: string,
    @Body() dto: VerifyUniversityDto
  ) {
    return this.universityVerificationService.verify(universityId, user.userId, dto);
  }

  @Post(":universityId/reject")
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("universityId") universityId: string,
    @Body() dto: RejectUniversityDto
  ) {
    return this.universityVerificationService.reject(universityId, user.userId, dto.reason);
  }
}

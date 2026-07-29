import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { VerificationService } from "./verification.service";
import { RejectPropertyDto } from "./dto/reject-property.dto";

@ApiTags("verification")
@ApiBearerAuth()
@Controller("admin/verification")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("Admin")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get("queue")
  listQueue() {
    return this.verificationService.listReviewQueue();
  }

  @Post("properties/:propertyId/approve")
  approve(@CurrentUser() user: AuthenticatedUser, @Param("propertyId") propertyId: string) {
    return this.verificationService.approve(propertyId, user.userId);
  }

  @Post("properties/:propertyId/publish")
  publish(@CurrentUser() user: AuthenticatedUser, @Param("propertyId") propertyId: string) {
    return this.verificationService.publish(propertyId, user.userId);
  }

  @Post("properties/:propertyId/reject")
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("propertyId") propertyId: string,
    @Body() dto: RejectPropertyDto
  ) {
    return this.verificationService.reject(propertyId, user.userId, dto.reason);
  }
}

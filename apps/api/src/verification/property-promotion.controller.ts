import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PropertyPromotionService } from "./property-promotion.service";
import { PromotePropertyDto } from "./dto/promote-property.dto";

@ApiTags("verification")
@ApiBearerAuth()
@Controller("admin/verification/properties")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("Admin")
export class PropertyPromotionController {
  constructor(private readonly propertyPromotionService: PropertyPromotionService) {}

  // Staged raw records not yet promoted into public.properties.
  @Get("promotion-queue")
  listPromotionQueue() {
    return this.propertyPromotionService.listPromotionQueue();
  }

  @Post(":rawPropertyRecordId/promote")
  promote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("rawPropertyRecordId") rawPropertyRecordId: string,
    @Body() dto: PromotePropertyDto
  ) {
    return this.propertyPromotionService.promote(rawPropertyRecordId, user.userId, dto.countySlug);
  }
}

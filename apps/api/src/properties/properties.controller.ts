import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PropertiesService } from "./properties.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { CreateUnitDto } from "./dto/create-unit.dto";

@ApiTags("properties")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("Owner", "Manager", "Admin")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post("organisations/:organisationId/properties")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organisationId") organisationId: string,
    @Body() dto: CreatePropertyDto
  ) {
    return this.propertiesService.create(user, organisationId, dto);
  }

  @Get("organisations/:organisationId/properties")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organisationId") organisationId: string
  ) {
    return this.propertiesService.listForOrganisation(user, organisationId);
  }

  @Get("properties/:propertyId")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("propertyId") propertyId: string) {
    return this.propertiesService.getOne(user, propertyId);
  }

  @Patch("properties/:propertyId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("propertyId") propertyId: string,
    @Body() dto: UpdatePropertyDto
  ) {
    return this.propertiesService.update(user, propertyId, dto);
  }

  @Post("properties/:propertyId/submit-for-verification")
  submitForVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("propertyId") propertyId: string
  ) {
    return this.propertiesService.submitForVerification(user, propertyId);
  }

  @Post("properties/:propertyId/units")
  addUnit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("propertyId") propertyId: string,
    @Body() dto: CreateUnitDto
  ) {
    return this.propertiesService.addUnit(user, propertyId, dto);
  }
}

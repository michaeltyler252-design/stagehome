import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { OrganisationsService } from "./organisations.service";
import { CreateOrganisationDto } from "./dto/create-organisation.dto";

@ApiTags("organisations")
@ApiBearerAuth()
@Controller("organisations")
@UseGuards(JwtAuthGuard)
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganisationDto) {
    return this.organisationsService.create(user, dto);
  }

  @Get("mine")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationsService.listForUser(user);
  }
}

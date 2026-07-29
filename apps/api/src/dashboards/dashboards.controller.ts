import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { DashboardsService } from "./dashboards.service";

@ApiTags("dashboards")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get("tenant")
  tenant(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardsService.tenantDashboard(user.userId);
  }

  @Get("manager/:organisationId")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Manager", "Accountant", "Admin")
  manager(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organisationId") organisationId: string
  ) {
    return this.dashboardsService.managerDashboard(user, organisationId);
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles("Admin")
  admin() {
    return this.dashboardsService.adminDashboard();
  }
}

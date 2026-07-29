import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    // Milestone 1 scope: liveness only. Database/Redis indicators are added
    // in Milestone 2 once the schema is migrated and seeded.
    return this.health.check([]);
  }
}

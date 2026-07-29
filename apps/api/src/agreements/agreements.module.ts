import { Module } from "@nestjs/common";
import { AgreementsController } from "./agreements.controller";
import { AgreementsService } from "./agreements.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
})
export class AgreementsModule {}

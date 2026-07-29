import { Module } from "@nestjs/common";
import { VerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { UniversityVerificationController } from "./university-verification.controller";
import { UniversityVerificationService } from "./university-verification.service";
import { PropertyPromotionController } from "./property-promotion.controller";
import { PropertyPromotionService } from "./property-promotion.service";

@Module({
  controllers: [VerificationController, UniversityVerificationController, PropertyPromotionController],
  providers: [VerificationService, UniversityVerificationService, PropertyPromotionService],
})
export class VerificationModule {}

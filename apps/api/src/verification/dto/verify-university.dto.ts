import { IsIn, IsOptional, IsString } from "class-validator";

const VERIFICATION_METHODS = ["documentary", "field_visit", "phone_call", "maps_recalculation"];

export class VerifyUniversityDto {
  @IsOptional()
  @IsIn(VERIFICATION_METHODS)
  method?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

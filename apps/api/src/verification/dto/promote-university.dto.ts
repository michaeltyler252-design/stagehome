import { IsOptional, IsString } from "class-validator";

export class PromoteUniversityDto {
  // Almost always resolved automatically from the raw record's import batch
  // (see UniversityVerificationService.resolveCounty). Only needed as a
  // manual override if that auto-resolution can't confidently match a
  // county — the endpoint returns a clear error telling the caller when
  // that's the case.
  @IsOptional()
  @IsString()
  countySlug?: string;
}

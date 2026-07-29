import { IsOptional, IsString } from "class-validator";

export class PromotePropertyDto {
  // Same escape hatch as PromoteUniversityDto: almost always resolved
  // automatically from the raw record's import batch. Only needed if that
  // auto-resolution can't confidently match a county.
  @IsOptional()
  @IsString()
  countySlug?: string;
}

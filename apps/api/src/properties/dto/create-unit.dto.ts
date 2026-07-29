import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateUnitDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  publicLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;
}

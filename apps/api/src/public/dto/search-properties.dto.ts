import { Type } from "class-transformer";
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from "class-validator";

export const SORT_OPTIONS = [
  "recommended",
  "nearest",
  "lowest_rent",
  "highest_rent",
  "newest",
  "highest_verified_rating",
  "most_reviewed",
  "available_soonest",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export class SearchPropertiesDto {
  @IsOptional()
  @IsString()
  countySlug?: string;

  @IsOptional()
  @IsString()
  universitySlug?: string;

  @IsOptional()
  @IsString()
  categoryKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minRent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRent?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: SortOption;

  // --- Part H: "distance to campus", "route duration" ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxWalkingMinutes?: number;

  // --- Part H: geospatial radius search (reference point + radius) ---
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0.1)
  @Max(50)
  radiusKm?: number;

  // --- Part H: "map bounds" ---
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  swLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  swLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  neLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  neLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

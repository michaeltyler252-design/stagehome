import { IsString, IsOptional, IsNumber, MinLength } from "class-validator";

export class CreatePropertyDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  countyId!: string;

  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsString()
  estateId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  privateLat?: number;

  @IsOptional()
  @IsNumber()
  privateLng?: number;
}

import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateOrganisationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  kraPin?: string;
}
